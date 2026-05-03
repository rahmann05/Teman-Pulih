const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Endpoint publik
router.post('/register', authController.register);
router.post('/login', authController.login);

// Contoh endpoint yang diproteksi JWT
router.get('/me', authenticateToken, (req, res) => {
    res.json({
        message: 'Akses berhasil, ini adalah data profil Anda',
        user: req.user
    });
});

module.exports = router;