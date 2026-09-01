const express = require('express');
const controller = require('../controllers/issueController');
const commentController = require('../controllers/commentController');
const { authenticate, authorize } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');
const {
    createIssueSchema,
    updateIssueSchema,
    assignIssueSchema,
    updateStatusSchema,
    issueCommentSchema,
} = require('../validators/schemas');

const router = express.Router();

router.use(authenticate);

router.get('/', controller.list);
router.post('/', authorize('admin', 'manager'), validateBody(createIssueSchema), controller.create);

router.get('/:id', controller.getOne);
router.patch('/:id', validateBody(updateIssueSchema), controller.update);
router.delete('/:id', authorize('admin', 'manager'), controller.remove);

router.patch(
    '/:id/assign',
    authorize('admin', 'manager'),
    validateBody(assignIssueSchema),
    controller.assign
);
router.patch('/:id/status', validateBody(updateStatusSchema), controller.updateStatus);

router.post('/:id/comments', validateBody(issueCommentSchema), commentController.createForIssue);

module.exports = router;
