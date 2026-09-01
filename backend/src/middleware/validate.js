const ApiError = require('../utils/ApiError');

/**
 * Validates `req.body` against a Zod schema and replaces it with the parsed
 * result, so controllers receive trimmed, typed, known-shaped input rather than
 * whatever the client sent.
 */
const validateBody = (schema) => (req, res, next) => {
    const result = schema.safeParse(req.body ?? {});
    if (!result.success) {
        const details = result.error.issues.map((issue) => {
            const path = issue.path.join('.');
            return path ? `${path}: ${issue.message}` : issue.message;
        });
        return next(ApiError.badRequest(details[0], details.length > 1 ? details : undefined));
    }
    req.body = result.data;
    return next();
};

module.exports = { validateBody };
