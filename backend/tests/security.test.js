const { app, request, createUser, createProject, auth } = require('./helpers');
const User = require('../src/models/User');
const { seedDemoUsers, ensureAdmin } = require('../src/services/seed');
const config = require('../src/config');

describe('Security properties', () => {
    it('never returns a password hash from any user-facing endpoint', async () => {
        const admin = await createUser({ role: 'admin' });
        await createProject(admin.user._id);

        const responses = await Promise.all([
            request(app).get('/api/users').set(auth(admin.token)),
            request(app).get(`/api/users/${admin.user.userId}`).set(auth(admin.token)),
            request(app).get('/api/auth/me').set(auth(admin.token)),
            request(app).get('/api/projects').set(auth(admin.token)),
        ]);

        responses.forEach((res) => {
            expect(res.status).toBe(200);
            expect(JSON.stringify(res.body)).not.toMatch(/\$2[aby]\$/);
            expect(JSON.stringify(res.body)).not.toMatch(/"password"/);
        });
    });

    it('requires authentication and an elevated role for dataset sync', async () => {
        const anonymous = await request(app).post('/api/sync').send({});
        expect(anonymous.status).toBe(401);

        const { token } = await createUser({ role: 'developer' });
        const developer = await request(app).post('/api/sync').set(auth(token)).send({});
        expect(developer.status).toBe(403);
    });

    it('reports dataset sync as unconfigured rather than using built-in credentials', async () => {
        const { token } = await createUser({ role: 'admin' });

        const res = await request(app).post('/api/sync').set(auth(token)).send({});

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/not configured/);
    });

    it('does not seed demo accounts by default under test/production settings', async () => {
        const created = await seedDemoUsers();
        expect(created).toEqual([]);
        expect(await User.countDocuments()).toBe(0);
    });

    it('generates a random password when seeding demo users without one set', async () => {
        const created = await seedDemoUsers({ force: true });

        expect(created).toHaveLength(4);
        created.forEach(({ password }) => {
            expect(password.length).toBeGreaterThanOrEqual(12);
            // The old hardcoded passwords must not come back.
            expect(['admin123', 'manager123', 'dev123', 'tester123']).not.toContain(password);
        });
    });

    it('creates an administrator from ADMIN_EMAIL/ADMIN_PASSWORD', async () => {
        config.admin.email = 'root@example.com';
        config.admin.password = 'a-long-enough-admin-password';

        try {
            await ensureAdmin();

            const admin = await User.findOne({ email: 'root@example.com' });
            expect(admin.role).toBe('admin');

            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: 'root@example.com', password: 'a-long-enough-admin-password' });
            expect(res.status).toBe(200);
        } finally {
            config.admin.email = undefined;
            config.admin.password = undefined;
        }
    });

    it('rejects an oversized request body', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'a@test.com', password: 'x'.repeat(2 * 1024 * 1024) });

        expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it('does not let a query-operator object bypass login', async () => {
        await createUser({ email: 'victim@test.com' });

        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: { $ne: null }, password: { $ne: null } });

        expect(res.status).toBe(400);
    });
});
