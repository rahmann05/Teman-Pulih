const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const { requireAuth } = require('../middleware/authMiddleware');

router.use(requireAuth); // Protect all routes

router.get('/', profileController.getProfile);
router.patch('/', profileController.updateProfile);

// Karena rutenya /api/profile di app.js, jika ingin ke family kita bisa routing langsung:
// Tapi menurut API_DOCUMENTATION, Family ada di `/api/family`
// Agar tidak ribet, biarkan saja routing /api/family di set di app.js merujuk ke router ini juga
// Atau kita kelompokkan di sini dengan path /family/invite

module.exports = router;
