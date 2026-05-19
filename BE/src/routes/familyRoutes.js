const express = require('express');
const router = express.Router();
const familyController = require('../controllers/familyController');
const { requireAuth } = require('../middleware/authMiddleware');

router.use(requireAuth);

router.post('/invite', familyController.inviteFamily);
router.get('/members', familyController.getFamilyMembers);

router.post('/complaints', familyController.createComplaint);
router.get('/complaints', familyController.getComplaints);

router.post('/checkins', familyController.createCheckin);
router.get('/checkins', familyController.getCheckins);
router.get('/checkins/today', familyController.getTodayCheckinStatus);

module.exports = router;

