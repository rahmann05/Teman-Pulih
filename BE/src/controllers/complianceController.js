const complianceService = require('../services/complianceService');

/**
 * Mendapatkan status eligibility kuesioner (cooldown & prefill)
 */
const getEligibility = async (req, res, next) => {
    try {
        const data = await complianceService.checkEligibility(req.user, req.query.patient_id);
        res.status(200).json({ data });
    } catch (err) {
        next(err);
    }
};

/**
 * Submit formulir kuesioner & memproses prediksi dengan model AI
 */
const submitAssessment = async (req, res, next) => {
    try {
        const { patient_id, formData } = req.body;
        const data = await complianceService.predictAndSave(req.user, req.supabase, {
            patient_id,
            formData
        });
        res.status(201).json({
            message: 'Analisis kepatuhan berhasil disubmit dan diproses.',
            data
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Mendapatkan seluruh riwayat assessment kepatuhan pasien
 */
const getHistory = async (req, res, next) => {
    try {
        const data = await complianceService.getHistory(req.user, req.query.patient_id);
        res.status(200).json({ data });
    } catch (err) {
        next(err);
    }
};

/**
 * Mendapatkan hasil assessment kepatuhan terbaru pasien beserta rekomendasinya
 */
const getLatest = async (req, res, next) => {
    try {
        const data = await complianceService.getLatestAssessment(req.user, req.query.patient_id);
        res.status(200).json({ data });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getEligibility,
    submitAssessment,
    getHistory,
    getLatest
};
