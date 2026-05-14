const express = require('express');
const router = express.Router();
const { parseDocument } = require('../controllers/emrController');
const { requireAuth } = require('../middleware/authMiddleware');

// Route untuk upload dan parse dokumen EMR (PDF/Word)
router.post('/parse', requireAuth, parseDocument);

module.exports = router;
