const express = require('express');
const controller = require('../controllers/projectController');
const { authenticate, authorize } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');
const { createProjectSchema, updateProjectSchema } = require('../validators/schemas');

const router = express.Router();

router.use(authenticate);

router.get('/', controller.list);
router.post('/', authorize('admin', 'manager'), validateBody(createProjectSchema), controller.create);

router.get('/:id', controller.getOne);
router.patch(
    '/:id',
    authorize('admin', 'manager'),
    validateBody(updateProjectSchema),
    controller.update
);
router.delete('/:id', authorize('admin', 'manager'), controller.remove);

module.exports = router;
