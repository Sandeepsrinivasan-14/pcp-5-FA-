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

    describe('privilege escalation through registration', () => {
        const payload = {
            name: 'Mallory',
            email: 'mallory@test.com',
            password: 'StrongPassword1',
        };

        it('ignores a role an anonymous caller asks for', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({ ...payload, role: 'admin' });

            expect(res.status).toBe(201);
            // The request asked for admin; the account must not be one.
            expect(res.body.data.role).not.toBe('admin');
            expect(res.body.data.role).toBe(config.registration.defaultRole);

            const stored = await User.findOne({ email: payload.email });
            expect(stored.role).toBe(config.registration.defaultRole);
        });

        it('ignores a role a non-admin signed-in caller asks for', async () => {
            const { token } = await createUser({ role: 'manager' });

            const res = await request(app)
                .post('/api/auth/register')
                .set(auth(token))
                .send({ ...payload, role: 'admin' });

            expect(res.status).toBe(201);
            expect(res.body.data.role).toBe(config.registration.defaultRole);
        });

        it('lets an administrator create an account with a chosen role', async () => {
            const { token } = await createUser({ role: 'admin' });

            const res = await request(app)
                .post('/api/auth/register')
                .set(auth(token))
                .send({ ...payload, role: 'manager' });

            expect(res.status).toBe(201);
            expect(res.body.data.role).toBe('manager');
        });

        it('refuses anonymous registration when public sign-up is disabled', async () => {
            const original = config.registration.allowPublic;
            config.registration.allowPublic = false;

            try {
                const res = await request(app).post('/api/auth/register').send(payload);

                expect(res.status).toBe(403);
                expect(res.body.message).toMatch(/Self-registration is disabled/);
                expect(await User.countDocuments({ email: payload.email })).toBe(0);
            } finally {
                config.registration.allowPublic = original;
            }
        });

        it('still lets an administrator create accounts when public sign-up is off', async () => {
            const { token } = await createUser({ role: 'admin' });
            const original = config.registration.allowPublic;
            config.registration.allowPublic = false;

            try {
                const res = await request(app)
                    .post('/api/auth/register')
                    .set(auth(token))
                    .send({ ...payload, role: 'tester' });

                expect(res.status).toBe(201);
                expect(res.body.data.role).toBe('tester');
            } finally {
                config.registration.allowPublic = original;
            }
        });
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
