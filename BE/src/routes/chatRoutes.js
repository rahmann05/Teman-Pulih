const express = require('express');
const { requireAuth } = require('../middleware/authMiddleware');
const chatController = require('../controllers/chatController');
const router = express.Router();

router.use(requireAuth);

router.get('/:otherUserId', chatController.getMessages);
router.post('/', chatController.sendMessage);

module.exports = router;
