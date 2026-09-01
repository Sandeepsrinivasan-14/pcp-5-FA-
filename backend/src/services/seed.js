const crypto = require('crypto');
const config = require('../config');
const User = require('../models/User');
const logger = require('../utils/logger');

const DEMO_USERS = [
    { name: 'Admin User', email: 'admin@test.com', role: 'admin', userId: 'usr-admin' },
    { name: 'Manager User', email: 'manager@test.com', role: 'manager', userId: 'usr-manager' },
    { name: 'Developer User', email: 'developer@test.com', role: 'developer', userId: 'usr-developer' },
    { name: 'Tester User', email: 'tester@test.com', role: 'tester', userId: 'usr-tester' },
];

const randomPassword = () => crypto.randomBytes(12).toString('base64url');

/**
 * Creates the administrator described by ADMIN_EMAIL / ADMIN_PASSWORD.
 * This is the supported way to bootstrap a production deployment.
 */
const ensureAdmin = async () => {
    if (!config.admin.email || !config.admin.password) return;

    const email = config.admin.email.trim().toLowerCase();
    const existing = await User.findOne({ email });

    if (existing) {
        existing.password = config.admin.password;
        existing.role = 'admin';
        existing.status = 'active';
        await existing.save();
        logger.info(`Administrator password reset for ${email}`);
        return;
    }

    await User.create({
        userId: 'usr-admin-root',
        name: 'Administrator',
        email,
        password: config.admin.password,
        role: 'admin',
    });
    logger.info(`Administrator account created for ${email}`);
};

/**
 * Creates the four demo accounts.
 *
 * The previous implementation ran unconditionally on every boot with passwords
 * hardcoded in the source ("admin123" and friends), so every deployment of this
 * project shipped with four known logins. Now it is opt-in, off by default in
 * production, and generates random passwords unless one is supplied.
 */
const seedDemoUsers = async ({ force = false } = {}) => {
    if (!force && !config.seed.demoUsers) return [];

    if (config.isProduction && !config.seed.demoPassword) {
        logger.warn(
            'SEED_DEMO_USERS is enabled in production without SEED_DEMO_PASSWORD — generating random passwords.'
        );
    }

    const created = [];

    for (const demo of DEMO_USERS) {
        const existing = await User.findOne({ email: demo.email });
        if (existing) continue;

        const password = config.seed.demoPassword || randomPassword();
        await User.create({ ...demo, password });
        created.push({ email: demo.email, role: demo.role, password });
    }

    if (created.length > 0 && !config.seed.demoPassword) {
        logger.warn('Demo accounts created with generated passwords (shown once):');
        created.forEach(({ email, password }) => logger.warn(`  ${email}  ${password}`));
    } else if (created.length > 0) {
        logger.info(`Seeded ${created.length} demo account(s) using SEED_DEMO_PASSWORD.`);
    }

    return created;
};

const runStartupSeed = async () => {
    await ensureAdmin();
    await seedDemoUsers();
};

module.exports = { DEMO_USERS, ensureAdmin, seedDemoUsers, runStartupSeed };
