const express = require('express');
const router = express.Router();
const illnessController = require('../controllers/illnessController');
const { requireAuth } = require('../middleware/authMiddleware');

router.use(requireAuth);

router.get('/', illnessController.getIllnessHistory);
router.post('/', illnessController.addIllness);
router.patch('/:id/recover', illnessController.markRecovered);

module.exports = router;
