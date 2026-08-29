const express = require('express');
const controller = require('../controllers/authController');
const { authenticate, optionalAuthenticate } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimit');
const { registerSchema, loginSchema } = require('../validators/schemas');

const router = express.Router();

// optionalAuthenticate lets an administrator create an account with a chosen
// role, while still allowing anonymous self-registration when enabled.
router.post(
    '/register',
    authLimiter,
    optionalAuthenticate,
    validateBody(registerSchema),
    controller.register
);
router.post('/login', authLimiter, validateBody(loginSchema), controller.login);
router.get('/me', authenticate, controller.me);

module.exports = router;
