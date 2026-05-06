const express = require('express');
const router = express.Router();
const chatbotController = require('../controllers/chatbotController');
const { requireAuth } = require('../middleware/authMiddleware');

router.use(requireAuth); // Protect all routes
router.post('/message', chatbotController.sendMessage);
router.get('/history', chatbotController.getHistory);

module.exports = router;