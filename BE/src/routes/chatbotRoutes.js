const express = require('express');
const router = express.Router();
const chatbotController = require('../controllers/chatbotController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.post('/ask', authenticateToken, chatbotController.askChatbot);
router.get('/history', authenticateToken, chatbotController.getChatHistory);

module.exports = router;