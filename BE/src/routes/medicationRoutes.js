const express = require('express');
const router = express.Router();
const medicationController = require('../controllers/medicationController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.post('/', authenticateToken, medicationController.createSchedule);
router.get('/', authenticateToken, medicationController.getSchedules);

module.exports = router;