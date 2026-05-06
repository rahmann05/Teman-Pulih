const express = require('express');
const router = express.Router();
const multer = require('multer');

// Gunakan memoryStorage agar gambar tidak menjadi junk/sampah di harddisk VM Vercel
const upload = multer({ storage: multer.memoryStorage() });

const ocrController = require('../controllers/ocrController');
const { requireAuth } = require('../middleware/authMiddleware');

router.use(requireAuth); // Protect all routes

router.post('/scan', upload.single('image'), ocrController.scanPrescription);
router.get('/history', ocrController.getOcrHistory);
router.get('/result/:id', ocrController.getOcrResultById);

module.exports = router;