const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { requireAuth } = require('../middleware/authMiddleware');

// Endpoint publik
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh', authController.refreshToken);

// Contoh endpoint yang diproteksi JWT
router.get('/me', requireAuth, authController.getMe); 

module.exports = router;