/**
 * Wraps an async route handler so a rejected promise reaches Express's error
 * handler instead of hanging the request. Replaces the try/catch that was
 * repeated in every controller.
 */
module.exports = (handler) => (req, res, next) =>
    Promise.resolve(handler(req, res, next)).catch(next);
