const config = require('../config');
const logger = require('../utils/logger');
const ApiError = require('../utils/ApiError');

const notFound = (req, res) => {
    res.status(404).json({
        success: false,
        message: `Route not found: ${req.method} ${req.originalUrl}`,
    });
};

// eslint-disable-next-line no-unused-vars -- Express identifies error handlers by arity.
const errorHandler = (err, req, res, next) => {
    let status = err.statusCode || 500;
    let message = err.message || 'Internal server error';
    let details = err.details;

    if (err.name === 'ValidationError' && err.errors) {
        status = 400;
        details = Object.values(err.errors).map((e) => e.message);
        message = 'Validation failed';
    } else if (err.name === 'CastError') {
        status = 400;
        message = `Invalid value for ${err.path}`;
    } else if (err.code === 11000) {
        status = 409;
        message = `Duplicate value for ${Object.keys(err.keyValue || {}).join(', ')}`;
    } else if (err.type === 'entity.parse.failed') {
        status = 400;
        message = 'Malformed JSON in request body';
    }

    if (status >= 500) {
        logger.error(err.message, {
            method: req.method,
            url: req.originalUrl,
            stack: err.stack,
        });
        // Never surface internal failure details to a client.
        if (!(err instanceof ApiError)) {
            message = 'Internal server error';
            details = undefined;
        }
    }

    res.status(status).json({
        success: false,
        message,
        ...(details ? { details } : {}),
        ...(config.isProduction || status < 500 ? {} : { stack: err.stack }),
    });
};

module.exports = { notFound, errorHandler };
