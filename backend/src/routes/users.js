const express = require('express');
const controller = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');
const { updateUserSchema } = require('../validators/schemas');

const router = express.Router();

router.use(authenticate);

router.get('/', controller.list);
router.get('/:id', controller.getOne);
router.patch('/:id', authorize('admin'), validateBody(updateUserSchema), controller.update);

module.exports = router;
