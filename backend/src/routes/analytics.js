const express = require('express');
const controller = require('../controllers/analyticsController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.get('/issues', controller.issues);
router.get('/projects', controller.projects);
router.get('/developers', controller.developers);
router.get('/dashboard', controller.dashboard);

module.exports = router;
