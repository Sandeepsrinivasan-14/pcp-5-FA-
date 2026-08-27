const express = require('express');
const controller = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimit');
const { registerSchema, loginSchema } = require('../validators/schemas');

const router = express.Router();

router.post('/register', authLimiter, validateBody(registerSchema), controller.register);
router.post('/login', authLimiter, validateBody(loginSchema), controller.login);
router.get('/me', authenticate, controller.me);

module.exports = router;
