const rateLimit = require('express-rate-limit');
const config = require('../config');

const message = (text) => ({ success: false, message: text });

const base = {
    standardHeaders: true,
    legacyHeaders: false,
    // Rate limiting a test suite makes it flaky and tests nothing useful.
    skip: () => config.isTest,
};

const apiLimiter = rateLimit({
    ...base,
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    message: message('Too many requests. Please try again later.'),
});

/**
 * Login and registration get a much tighter budget: without it, a password can
 * be brute-forced at whatever rate the network allows.
 */
const authLimiter = rateLimit({
    ...base,
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.authMax,
    skipSuccessfulRequests: true,
    message: message('Too many authentication attempts. Please try again later.'),
});

module.exports = { apiLimiter, authLimiter };
