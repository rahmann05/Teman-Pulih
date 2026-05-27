const express = require('express');
const router = express.Router();
const complianceController = require('../controllers/complianceController');
const { requireAuth } = require('../middleware/authMiddleware');

// Semua route compliance membutuhkan autentikasi
router.get('/eligibility', requireAuth, complianceController.getEligibility);
router.post('/assess', requireAuth, complianceController.submitAssessment);
router.get('/history', requireAuth, complianceController.getHistory);
router.get('/latest', requireAuth, complianceController.getLatest);

module.exports = router;
