const express = require('express');
const router = express.Router();

router.use('/auth', require('./authRoutes'));
router.use('/medications', require('./medicationRoutes'));
router.use('/chatbot', require('./chatbotRoutes'));
router.use('/ocr', require('./ocrRoutes'));
router.use('/profile', require('./profileRoutes'));
router.use('/relations', require('./relationRoutes'));
router.use('/emr', require('./emrRoutes'));
router.use('/family', require('./familyRoutes'));
router.use('/chat', require('./chatRoutes'));

module.exports = router;
