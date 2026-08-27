const { app, request, createUser, auth } = require('./helpers');

describe('Application surface', () => {
    it('reports healthy when the database is connected', async () => {
        const res = await request(app).get('/api/health');

        expect(res.status).toBe(200);
        expect(res.body.database).toBe('connected');
        expect(typeof res.body.uptime).toBe('number');
    });

    it('exposes /health at the root for platform probes', async () => {
        const res = await request(app).get('/health');
        expect(res.status).toBe(200);
    });

    it('serves the legacy root-mounted routes alongside /api', async () => {
        const { token } = await createUser({ role: 'admin' });

        const viaRoot = await request(app).get('/issues').set(auth(token));
        const viaApi = await request(app).get('/api/issues').set(auth(token));

        expect(viaRoot.status).toBe(200);
        expect(viaApi.status).toBe(200);
    });

    it('returns a JSON 404 for an unknown route', async () => {
        const res = await request(app).get('/api/does-not-exist');

        expect(res.status).toBe(404);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/Route not found/);
    });

    it('rejects malformed JSON with a 400 rather than a crash', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .set('Content-Type', 'application/json')
            .send('{"email": broken}');

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
    });

    it('does not advertise the server technology', async () => {
        const res = await request(app).get('/api/health');
        expect(res.headers['x-powered-by']).toBeUndefined();
    });

    it('sets security headers', async () => {
        const res = await request(app).get('/api/health');
        expect(res.headers['x-content-type-options']).toBe('nosniff');
    });

    it('never leaks a stack trace in an error body', async () => {
        const res = await request(app).get('/api/does-not-exist');
        expect(JSON.stringify(res.body)).not.toMatch(/at .*\(.*:\d+:\d+\)/);
    });
});

describe('Configuration validation', () => {
    const loadConfig = (env) => {
        jest.resetModules();
        const saved = { ...process.env };
        Object.assign(process.env, env);
        try {
            const config = require('../src/config');
            config.validate();
            return null;
        } catch (error) {
            return error.message;
        } finally {
            process.env = saved;
            jest.resetModules();
        }
    };

    it('rejects a missing JWT secret', () => {
        expect(loadConfig({ JWT_SECRET: '', MONGODB_URI: 'mongodb://x/y' })).toMatch(
            /JWT_SECRET is required/
        );
    });

    it('rejects a short JWT secret', () => {
        expect(loadConfig({ JWT_SECRET: 'tooshort', MONGODB_URI: 'mongodb://x/y' })).toMatch(
            /at least 32 characters/
        );
    });

    it('rejects a missing Mongo URI', () => {
        expect(loadConfig({ JWT_SECRET: 'x'.repeat(40), MONGODB_URI: '' })).toMatch(
            /MONGODB_URI is required/
        );
    });

    it('rejects wildcard CORS in production', () => {
        expect(
            loadConfig({
                NODE_ENV: 'production',
                JWT_SECRET: 'x'.repeat(40),
                MONGODB_URI: 'mongodb://x/y',
                CORS_ORIGINS: '*',
            })
        ).toMatch(/must not be "\*" in production/);
    });

    it('accepts a well-formed configuration', () => {
        expect(
            loadConfig({
                JWT_SECRET: 'x'.repeat(40),
                MONGODB_URI: 'mongodb://x/y',
                CORS_ORIGINS: 'https://app.example.com',
            })
        ).toBeNull();
    });
});
