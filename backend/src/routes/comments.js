const express = require('express');
const controller = require('../controllers/commentController');
const { authenticate } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');
const { createCommentSchema } = require('../validators/schemas');

const router = express.Router();

router.use(authenticate);

router.get('/', controller.list);
router.post('/', validateBody(createCommentSchema), controller.create);
router.get('/:id', controller.getOne);
router.delete('/:id', controller.remove);

module.exports = router;
