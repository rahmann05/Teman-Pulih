const express = require('express');
const router = express.Router();
const medicationController = require('../controllers/medicationController');
const { requireAuth } = require('../middleware/authMiddleware');

router.use(requireAuth); // Protect all routes

router.get('/', medicationController.getMedications);
router.post('/', medicationController.createMedication);
router.patch('/:id', medicationController.updateMedication);
router.delete('/:id', medicationController.deleteMedication);
router.post('/:id/taken', medicationController.markTaken);
router.get('/logs', medicationController.getMedicationLogs);

module.exports = router;