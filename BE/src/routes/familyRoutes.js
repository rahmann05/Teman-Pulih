const express = require('express');
const router = express.Router();
const familyController = require('../controllers/familyController');
const { requireAuth } = require('../middleware/authMiddleware');

router.use(requireAuth);

router.post('/invite', familyController.inviteFamily);
router.get('/members', familyController.getFamilyMembers);

module.exports = router;
