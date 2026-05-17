const ocrService = require('../services/ocrService');
const { getSupabaseClient } = require('../helpers/supabase');

const scanPrescription = async (req, res, next) => {
    try {
        if (!req.file) throw Object.assign(new Error('Tidak ada file gambar yang diunggah'), { statusCode: 400 });
        const supabase = getSupabaseClient(req);
        const data = await ocrService.scanPrescription(req.user.id, supabase, req.file.buffer, req.file.originalname);
        res.status(200).json(data);
    } catch (error) {
        console.error('Gateway OCR Scan Error:', error.message);
        next(error);
    }
};

const getOcrHistory = async (req, res, next) => {
    try {
        const supabase = getSupabaseClient(req);
        const data = await ocrService.getHistory(supabase, req.user.id);
        res.status(200).json(data);
    } catch (err) { next(err); }
};

const getOcrResultById = async (req, res, next) => {
    try {
        const supabase = getSupabaseClient(req);
        const scan = await ocrService.getResultById(supabase, req.user.id, req.params.id);
        res.status(200).json({ scan });
    } catch (err) { next(err); }
};

module.exports = { scanPrescription, getOcrHistory, getOcrResultById };