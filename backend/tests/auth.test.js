const { app, request, createUser, auth, PASSWORD } = require('./helpers');
const User = require('../src/models/User');

describe('Authentication', () => {
    describe('POST /api/auth/register', () => {
        const validPayload = {
            name: 'New Person',
            email: 'new.person@test.com',
            password: 'StrongPassword1',
            role: 'developer',
        };

        it('registers a user and never returns the password', async () => {
            const res = await request(app).post('/api/auth/register').send(validPayload);

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.email).toBe('new.person@test.com');
            expect(res.body.data.userId).toMatch(/^usr-/);
            expect(res.body.data).not.toHaveProperty('password');
        });

        it('stores the password hashed, not in plain text', async () => {
            await request(app).post('/api/auth/register').send(validPayload);

            const stored = await User.findOne({ email: validPayload.email });
            expect(stored.password).not.toBe(validPayload.password);
            expect(stored.password).toMatch(/^\$2[aby]\$/);
        });

        it('rejects a missing field', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({ email: 'a@test.com', password: 'StrongPassword1' });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });

        it('rejects an invalid role', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({ ...validPayload, role: 'superuser' });

            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/Invalid role/);
        });

        it('rejects a short password', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({ ...validPayload, password: 'short' });

            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/at least 8 characters/);
        });

        it('rejects a duplicate email regardless of casing', async () => {
            await request(app).post('/api/auth/register').send(validPayload);
            const res = await request(app)
                .post('/api/auth/register')
                .send({ ...validPayload, email: 'New.Person@TEST.com' });

            expect(res.status).toBe(409);
            expect(res.body.message).toMatch(/already registered/);
        });
    });

    describe('POST /api/auth/login', () => {
        it('returns a token for valid credentials', async () => {
            const { user } = await createUser({ role: 'admin' });

            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: user.email, password: PASSWORD });

            expect(res.status).toBe(200);
            expect(typeof res.body.data.token).toBe('string');
            expect(res.body.data.role).toBe('admin');
        });

        it('accepts a differently-cased email', async () => {
            const { user } = await createUser({ email: 'casing@test.com' });

            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: 'CASING@Test.com', password: PASSWORD });

            expect(res.status).toBe(200);
            expect(res.body.data._id).toBe(user._id.toString());
        });

        it('rejects a wrong password', async () => {
            const { user } = await createUser();

            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: user.email, password: 'WrongPassword1' });

            expect(res.status).toBe(401);
            expect(res.body.message).toBe('Invalid credentials');
        });

        it('gives the same message for an unknown account as for a wrong password', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: 'nobody@test.com', password: 'WrongPassword1' });

            expect(res.status).toBe(401);
            expect(res.body.message).toBe('Invalid credentials');
        });

        it('rejects a missing password', async () => {
            const res = await request(app).post('/api/auth/login').send({ email: 'a@test.com' });
            expect(res.status).toBe(400);
        });
    });

    describe('GET /api/auth/me', () => {
        it('returns the authenticated user', async () => {
            const { user, token } = await createUser({ role: 'manager' });

            const res = await request(app).get('/api/auth/me').set(auth(token));

            expect(res.status).toBe(200);
            expect(res.body.data.email).toBe(user.email);
            expect(res.body.data).not.toHaveProperty('password');
        });

        it('rejects a request with no token', async () => {
            const res = await request(app).get('/api/auth/me');
            expect(res.status).toBe(401);
            expect(res.body.message).toBe('No token provided');
        });

        it('rejects a malformed token', async () => {
            const res = await request(app).get('/api/auth/me').set(auth('not-a-real-token'));
            expect(res.status).toBe(401);
            expect(res.body.message).toBe('Invalid token');
        });

        it('rejects a token signed with a different secret', async () => {
            const jwt = require('jsonwebtoken');
            const forged = jwt.sign({ id: '507f1f77bcf86cd799439011' }, 'a-different-secret-entirely');

            const res = await request(app).get('/api/auth/me').set(auth(forged));
            expect(res.status).toBe(401);
        });

        it('rejects an inactive account', async () => {
            const { token } = await createUser();
            await User.updateMany({}, { status: 'inactive' });

            const res = await request(app).get('/api/auth/me').set(auth(token));
            expect(res.status).toBe(403);
        });
    });
});
