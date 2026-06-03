const express = require('express');
const router = express.Router();
const { syncDataset } = require('../controllers/syncController');

router.post('/', syncDataset);

module.exports = router;
