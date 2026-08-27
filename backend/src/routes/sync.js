const express = require('express');
const { syncDataset } = require('../controllers/syncController');
const { authenticate, authorize } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');
const { syncSchema } = require('../validators/schemas');

const router = express.Router();

// This endpoint bulk-writes users, projects, issues and comments. It shipped
// unauthenticated, which let anyone on the internet overwrite the database.
router.post(
    '/',
    authenticate,
    authorize('admin', 'manager'),
    validateBody(syncSchema),
    syncDataset
);

module.exports = router;
