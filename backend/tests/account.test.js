const { app, request, createUser, auth, PASSWORD } = require('./helpers');
const User = require('../src/models/User');

describe('Changing your own password', () => {
    const NEW_PASSWORD = 'AnEntirelyNewPassword1';

    it('updates the password and issues a fresh token', async () => {
        const { user, token } = await createUser();

        const res = await request(app)
            .patch('/api/auth/password')
            .set(auth(token))
            .send({ currentPassword: PASSWORD, newPassword: NEW_PASSWORD });

        expect(res.status).toBe(200);
        expect(typeof res.body.data.token).toBe('string');

        const withNew = await request(app)
            .post('/api/auth/login')
            .send({ email: user.email, password: NEW_PASSWORD });
        expect(withNew.status).toBe(200);
    });

    it('stops the old password working afterwards', async () => {
        const { user, token } = await createUser();

        await request(app)
            .patch('/api/auth/password')
            .set(auth(token))
            .send({ currentPassword: PASSWORD, newPassword: NEW_PASSWORD });

        const withOld = await request(app)
            .post('/api/auth/login')
            .send({ email: user.email, password: PASSWORD });
        expect(withOld.status).toBe(401);
    });

    it('stores the new password hashed', async () => {
        const { user, token } = await createUser();

        await request(app)
            .patch('/api/auth/password')
            .set(auth(token))
            .send({ currentPassword: PASSWORD, newPassword: NEW_PASSWORD });

        const stored = await User.findById(user._id);
        expect(stored.password).not.toBe(NEW_PASSWORD);
        expect(stored.password).toMatch(/^\$2[aby]\$/);
    });

    it('rejects a wrong current password', async () => {
        const { token } = await createUser();

        const res = await request(app)
            .patch('/api/auth/password')
            .set(auth(token))
            .send({ currentPassword: 'NotMyPassword1', newPassword: NEW_PASSWORD });

        expect(res.status).toBe(401);
        expect(res.body.message).toMatch(/Current password is incorrect/);
    });

    it('rejects a new password that is too short', async () => {
        const { token } = await createUser();

        const res = await request(app)
            .patch('/api/auth/password')
            .set(auth(token))
            .send({ currentPassword: PASSWORD, newPassword: 'short' });

        expect(res.status).toBe(400);
    });

    it('rejects reusing the current password', async () => {
        const { token } = await createUser();

        const res = await request(app)
            .patch('/api/auth/password')
            .set(auth(token))
            .send({ currentPassword: PASSWORD, newPassword: PASSWORD });

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/must differ/);
    });

    it('requires authentication', async () => {
        const res = await request(app)
            .patch('/api/auth/password')
            .send({ currentPassword: PASSWORD, newPassword: NEW_PASSWORD });

        expect(res.status).toBe(401);
    });
});

describe('Administrator management of accounts', () => {
    it('lets an admin change a role', async () => {
        const admin = await createUser({ role: 'admin' });
        const member = await createUser({ role: 'developer' });

        const res = await request(app)
            .patch(`/api/users/${member.user.userId}`)
            .set(auth(admin.token))
            .send({ role: 'manager' });

        expect(res.status).toBe(200);
        expect(res.body.data.role).toBe('manager');
    });

    it('lets an admin deactivate an account, which then cannot authenticate', async () => {
        const admin = await createUser({ role: 'admin' });
        const member = await createUser({ role: 'developer' });

        const res = await request(app)
            .patch(`/api/users/${member.user.userId}`)
            .set(auth(admin.token))
            .send({ status: 'inactive' });
        expect(res.status).toBe(200);

        const blocked = await request(app).get('/api/auth/me').set(auth(member.token));
        expect(blocked.status).toBe(403);
    });

    it('refuses to demote the only active administrator', async () => {
        const admin = await createUser({ role: 'admin' });

        const res = await request(app)
            .patch(`/api/users/${admin.user.userId}`)
            .set(auth(admin.token))
            .send({ role: 'developer' });

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/only active administrator/);
    });

    it('refuses to deactivate the only active administrator', async () => {
        const admin = await createUser({ role: 'admin' });

        const res = await request(app)
            .patch(`/api/users/${admin.user.userId}`)
            .set(auth(admin.token))
            .send({ status: 'inactive' });

        expect(res.status).toBe(400);
    });

    it('allows demoting an admin once another one exists', async () => {
        const admin = await createUser({ role: 'admin' });
        const second = await createUser({ role: 'admin' });

        const res = await request(app)
            .patch(`/api/users/${second.user.userId}`)
            .set(auth(admin.token))
            .send({ role: 'developer' });

        expect(res.status).toBe(200);
        expect(res.body.data.role).toBe('developer');
    });

    it('forbids a manager from changing roles', async () => {
        const manager = await createUser({ role: 'manager' });
        const member = await createUser({ role: 'developer' });

        const res = await request(app)
            .patch(`/api/users/${member.user.userId}`)
            .set(auth(manager.token))
            .send({ role: 'admin' });

        expect(res.status).toBe(403);
    });

    it('forbids a developer from promoting themselves', async () => {
        const developer = await createUser({ role: 'developer' });

        const res = await request(app)
            .patch(`/api/users/${developer.user.userId}`)
            .set(auth(developer.token))
            .send({ role: 'admin' });

        expect(res.status).toBe(403);
    });

    it('rejects an unknown role', async () => {
        const admin = await createUser({ role: 'admin' });
        const member = await createUser({ role: 'developer' });

        const res = await request(app)
            .patch(`/api/users/${member.user.userId}`)
            .set(auth(admin.token))
            .send({ role: 'superuser' });

        expect(res.status).toBe(400);
    });

    it('rejects an empty update', async () => {
        const admin = await createUser({ role: 'admin' });
        const member = await createUser({ role: 'developer' });

        const res = await request(app)
            .patch(`/api/users/${member.user.userId}`)
            .set(auth(admin.token))
            .send({});

        expect(res.status).toBe(400);
    });

    it('404s for an unknown user', async () => {
        const admin = await createUser({ role: 'admin' });

        const res = await request(app)
            .patch('/api/users/usr-nobody')
            .set(auth(admin.token))
            .send({ role: 'developer' });

        expect(res.status).toBe(404);
    });

    it('never returns the password hash', async () => {
        const admin = await createUser({ role: 'admin' });
        const member = await createUser({ role: 'developer' });

        const res = await request(app)
            .patch(`/api/users/${member.user.userId}`)
            .set(auth(admin.token))
            .send({ department: 'Platform' });

        expect(res.status).toBe(200);
        expect(JSON.stringify(res.body)).not.toMatch(/\$2[aby]\$/);
        expect(res.body.data).not.toHaveProperty('password');
    });
});
