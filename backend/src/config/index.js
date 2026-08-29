const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
require('dotenv').config();

const bool = (value, fallback) => {
    if (value === undefined || value === '') return fallback;
    return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
};

const int = (value, fallback) => {
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const list = (value, fallback = []) => {
    if (!value) return fallback;
    return String(value)
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean);
};

const env = process.env.NODE_ENV || 'development';
const isProduction = env === 'production';
const isTest = env === 'test';

const serveFrontend = bool(process.env.SERVE_FRONTEND, false);

const config = {
    env,
    isProduction,
    isTest,
    isDevelopment: !isProduction && !isTest,

    port: int(process.env.PORT, 5000),
    mongoUri: process.env.MONGODB_URI,

    jwt: {
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    },

    http: {
        corsOrigins: list(process.env.CORS_ORIGINS, ['http://localhost:3000']),
        trustProxy: bool(process.env.TRUST_PROXY, false),
        serveFrontend,
        // The SPA owns /issues, /projects, /users, /comments as browser routes,
        // so the bare-root API mounts have to step aside when we serve it.
        legacyRootRoutes: bool(process.env.ENABLE_LEGACY_ROOT_ROUTES, !serveFrontend),
        frontendBuildPath: path.resolve(__dirname, '../../../frontend/build'),
    },

    rateLimit: {
        windowMs: int(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
        max: int(process.env.RATE_LIMIT_MAX, 300),
        authMax: int(process.env.AUTH_RATE_LIMIT_MAX, 10),
    },

    pagination: {
        defaultLimit: 100,
        maxLimit: 100,
    },

    admin: {
        email: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD,
    },

    registration: {
        // Anyone may create their own account. Off in production by default:
        // an open endpoint on a team tool lets strangers into the workspace.
        allowPublic: bool(process.env.ALLOW_PUBLIC_REGISTRATION, !isProduction),
        // The role a self-registered account receives. A caller can never
        // choose their own role — only an administrator may set one.
        defaultRole: process.env.DEFAULT_REGISTRATION_ROLE || 'developer',
    },

    seed: {
        demoUsers: bool(process.env.SEED_DEMO_USERS, !isProduction),
        demoPassword: process.env.SEED_DEMO_PASSWORD,
    },

    dataset: {
        apiUrl: process.env.DATASET_API_URL,
        studentId: process.env.DATASET_STUDENT_ID,
        password: process.env.DATASET_PASSWORD,
        set: process.env.DATASET_SET || 'setB',
        get enabled() {
            return Boolean(this.apiUrl && this.studentId && this.password);
        },
    },
};

/**
 * Fail fast on misconfiguration. A server that boots without a JWT secret only
 * discovers the problem when a user tries to log in, and reports it as a 500.
 */
const validate = () => {
    const errors = [];

    if (!config.mongoUri) {
        errors.push('MONGODB_URI is required.');
    }

    if (!config.jwt.secret) {
        errors.push('JWT_SECRET is required.');
    } else if (config.jwt.secret.length < 32) {
        errors.push('JWT_SECRET must be at least 32 characters long.');
    } else if (/^(replace-me|changeme|secret|test)/i.test(config.jwt.secret) && isProduction) {
        errors.push('JWT_SECRET still looks like a placeholder value.');
    }

    if (isProduction) {
        if (config.http.corsOrigins.includes('*')) {
            errors.push('CORS_ORIGINS must not be "*" in production.');
        }
        if (config.seed.demoUsers && !config.seed.demoPassword) {
            // Allowed, but the seeder will generate random passwords instead of
            // the well-known demo ones. Surfaced as a warning at boot, not here.
        }
        if (config.admin.email && !config.admin.password) {
            errors.push('ADMIN_PASSWORD is required when ADMIN_EMAIL is set.');
        }
        if (config.admin.password && config.admin.password.length < 12) {
            errors.push('ADMIN_PASSWORD must be at least 12 characters long.');
        }
    }

    if (errors.length > 0) {
        const message = [
            'Invalid configuration — refusing to start:',
            ...errors.map((error) => `  • ${error}`),
            '',
            'See .env.example for the full list of supported variables.',
        ].join('\n');
        throw new Error(message);
    }
};

module.exports = config;
module.exports.validate = validate;
