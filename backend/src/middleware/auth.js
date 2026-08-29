const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('./asyncHandler');

const ROLES = ['admin', 'manager', 'developer', 'tester'];

const authenticate = asyncHandler(async (req, res, next) => {
    const header = req.header('Authorization') || '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;

    if (!token) {
        throw ApiError.unauthorized('No token provided');
    }

    let decoded;
    try {
        decoded = jwt.verify(token, config.jwt.secret);
    } catch (error) {
        throw ApiError.unauthorized('Invalid token');
    }

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
        throw ApiError.unauthorized('User not found');
    }
    if (user.status === 'inactive') {
        throw ApiError.forbidden('Account is inactive');
    }

    req.user = user;
    next();
});

/**
 * Populates req.user when a valid token is present, but lets the request
 * through when it is absent or bad. Used where a route is open to the public
 * yet grants extra privileges to a signed-in caller.
 */
const optionalAuthenticate = asyncHandler(async (req, res, next) => {
    const header = req.header('Authorization') || '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;

    if (token) {
        try {
            const decoded = jwt.verify(token, config.jwt.secret);
            const user = await User.findById(decoded.id).select('-password');
            if (user && user.status !== 'inactive') {
                req.user = user;
            }
        } catch (error) {
            // An unusable token is treated as no token here, never as an error.
        }
    }

    next();
});

const authorize = (...roles) => (req, res, next) => {
    if (!req.user) {
        return next(ApiError.unauthorized('No token provided'));
    }
    if (!roles.includes(req.user.role)) {
        return next(
            ApiError.forbidden(`Access denied. ${req.user.role} cannot perform this action`)
        );
    }
    return next();
};

const signToken = (user) =>
    jwt.sign({ id: user._id, email: user.email, role: user.role }, config.jwt.secret, {
        expiresIn: config.jwt.expiresIn,
    });

module.exports = { authenticate, optionalAuthenticate, authorize, signToken, ROLES };
