const express = require('express');
const controller = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.get('/', controller.list);
router.get('/:id', controller.getOne);

module.exports = router;
