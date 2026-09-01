const express = require('express');

const healthRoutes = require('./health');
const authRoutes = require('./auth');
const projectRoutes = require('./projects');
const userRoutes = require('./users');
const issueRoutes = require('./issues');
const commentRoutes = require('./comments');
const analyticsRoutes = require('./analytics');
const syncRoutes = require('./sync');

const router = express.Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/projects', projectRoutes);
router.use('/users', userRoutes);
router.use('/issues', issueRoutes);
router.use('/comments', commentRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/sync', syncRoutes);

module.exports = router;
