const express = require('express');
const router = express.Router();
const multer = require('multer');
const medicationController = require('../controllers/medicationController');
const { requireAuth } = require('../middleware/authMiddleware');

// memoryStorage: file buffer stored in RAM, no disk junk
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
    fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        cb(null, allowed.includes(file.mimetype));
    },
});

router.use(requireAuth); // Protect all routes

router.get('/search-chroma', medicationController.searchChroma);
router.get('/', medicationController.getMedications);
router.post('/', medicationController.createMedication);
router.patch('/:id', medicationController.updateMedication);
router.delete('/:id', medicationController.deleteMedication);
router.post('/:id/taken', medicationController.markTaken);
router.get('/logs', medicationController.getMedicationLogs);

// Image upload — POST /medications/:id/image  (multipart/form-data, field: "image")
router.post('/:id/image', upload.single('image'), medicationController.uploadMedicationImage);

module.exports = router;