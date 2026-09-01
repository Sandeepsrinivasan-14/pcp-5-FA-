/**
 * An error carrying the HTTP status it should be reported as. Anything thrown
 * that is not an ApiError is treated as an unexpected 500 by the error handler,
 * so internal failures never leak their details to clients.
 */
class ApiError extends Error {
    constructor(statusCode, message, details) {
        super(message);
        this.name = 'ApiError';
        this.statusCode = statusCode;
        this.expected = true;
        if (details) this.details = details;
        Error.captureStackTrace(this, ApiError);
    }

    static badRequest(message, details) {
        return new ApiError(400, message, details);
    }

    static unauthorized(message = 'Unauthorized') {
        return new ApiError(401, message);
    }

    static forbidden(message = 'Forbidden') {
        return new ApiError(403, message);
    }

    static notFound(message = 'Not found') {
        return new ApiError(404, message);
    }

    static conflict(message) {
        return new ApiError(409, message);
    }
}

module.exports = ApiError;
