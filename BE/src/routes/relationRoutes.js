const express = require('express');
const { requireAuth } = require('../middleware/authMiddleware');
const { requestAccess, approveAccess, getPendingRequests } = require('../controllers/relationController');

const router = express.Router();

router.post('/request', requireAuth, requestAccess);
router.post('/approve', requireAuth, approveAccess);
router.get('/pending', requireAuth, getPendingRequests);

module.exports = router;