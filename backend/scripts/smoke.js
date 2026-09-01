#!/usr/bin/env node
/**
 * Post-deployment smoke test. Verifies a running instance answers correctly.
 *
 *   BASE_URL=https://trackit.up.railway.app \
 *   SMOKE_EMAIL=admin@example.com SMOKE_PASSWORD=... \
 *   npm run smoke
 *
 * Credentials are optional — without them only the public surface is checked.
 * Exits non-zero on the first failure so CI/CD can gate on it.
 */
const BASE_URL = (process.env.BASE_URL || 'http://localhost:5000').replace(/\/$/, '');
const EMAIL = process.env.SMOKE_EMAIL;
const PASSWORD = process.env.SMOKE_PASSWORD;

let passed = 0;
let failed = 0;

const check = async (name, fn) => {
    try {
        await fn();
        process.stdout.write(`  PASS  ${name}\n`);
        passed += 1;
    } catch (error) {
        process.stdout.write(`  FAIL  ${name}\n        ${error.message}\n`);
        failed += 1;
    }
};

const assert = (condition, message) => {
    if (!condition) throw new Error(message);
};

const call = async (path, options = {}) => {
    const response = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    });
    const body = await response.json().catch(() => ({}));
    return { status: response.status, body };
};

const main = async () => {
    process.stdout.write(`\nSmoke testing ${BASE_URL}\n\n`);

    await check('GET /health reports a connected database', async () => {
        const { status, body } = await call('/health');
        assert(status === 200, `expected 200, got ${status}`);
        assert(body.database === 'connected', `database is ${body.database}`);
    });

    await check('protected routes reject anonymous callers', async () => {
        const { status } = await call('/api/issues');
        assert(status === 401, `expected 401, got ${status}`);
    });

    await check('unknown routes return a JSON 404', async () => {
        const { status, body } = await call('/api/definitely-not-a-route');
        assert(status === 404, `expected 404, got ${status}`);
        assert(body.success === false, 'expected success:false');
    });

    await check('invalid credentials are rejected', async () => {
        const { status } = await call('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email: 'nobody@example.com', password: 'wrong-password' }),
        });
        assert(status === 401 || status === 429, `expected 401/429, got ${status}`);
    });

    if (!EMAIL || !PASSWORD) {
        process.stdout.write('\n  (set SMOKE_EMAIL and SMOKE_PASSWORD to test authenticated routes)\n');
    } else {
        let token;

        await check('login succeeds with valid credentials', async () => {
            const { status, body } = await call('/api/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
            });
            assert(status === 200, `expected 200, got ${status}`);
            assert(body.data?.token, 'no token returned');
            token = body.data.token;
        });

        const authed = (path) => call(path, { headers: { Authorization: `Bearer ${token}` } });

        for (const path of ['/api/auth/me', '/api/projects', '/api/issues', '/api/analytics/dashboard']) {
            // eslint-disable-next-line no-await-in-loop
            await check(`GET ${path} succeeds when authenticated`, async () => {
                const { status, body } = await authed(path);
                assert(status === 200, `expected 200, got ${status}`);
                assert(body.success === true, 'expected success:true');
            });
        }

        await check('no password hash appears in any response', async () => {
            const { body } = await authed('/api/users');
            assert(!JSON.stringify(body).includes('$2'), 'a bcrypt hash was returned');
        });
    }

    process.stdout.write(`\n${passed} passed, ${failed} failed\n\n`);
    process.exit(failed > 0 ? 1 : 0);
};

main().catch((error) => {
    process.stderr.write(`Smoke test crashed: ${error.message}\n`);
    process.exit(1);
});
