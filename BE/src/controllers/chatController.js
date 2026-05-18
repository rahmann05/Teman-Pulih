const chatService = require('../services/chatService');

const getMessages = async (req, res, next) => {
    try {
        const { otherUserId } = req.params;
        const messages = await chatService.getMessages(req.user.id, parseInt(otherUserId, 10));
        res.status(200).json({ messages });
    } catch (err) {
        next(err);
    }
};

const sendMessage = async (req, res, next) => {
    try {
        const { receiverId, content } = req.body;
        const message = await chatService.sendMessage(req.user.id, parseInt(receiverId, 10), content);
        res.status(201).json({ message: 'Pesan berhasil dikirim', data: message });
    } catch (err) {
        next(err);
    }
};

module.exports = { getMessages, sendMessage };
