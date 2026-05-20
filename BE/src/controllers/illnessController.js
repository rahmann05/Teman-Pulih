const illnessService = require('../services/illnessService');
const { getSupabaseClient } = require('../helpers/supabase');

const getIllnessHistory = async (req, res, next) => {
    try {
        const supabase = getSupabaseClient(req);
        const patientId = req.query.patientId ? parseInt(req.query.patientId, 10) : null;
        const data = await illnessService.getIllnessHistory(req.user, supabase, patientId);
        res.status(200).json({ data });
    } catch (err) {
        next(err);
    }
};

const addIllness = async (req, res, next) => {
    try {
        const supabase = getSupabaseClient(req);
        const data = await illnessService.addIllness(req.user, supabase, req.body);
        res.status(201).json({ message: 'Penyakit berhasil ditambahkan.', data });
    } catch (err) {
        next(err);
    }
};

const markRecovered = async (req, res, next) => {
    try {
        const supabase = getSupabaseClient(req);
        const illnessId = parseInt(req.params.id, 10);
        if (!illnessId) {
            return res.status(400).json({ error: 'ID tidak valid.' });
        }
        const data = await illnessService.markRecovered(req.user, supabase, illnessId);
        res.status(200).json({ message: 'Penyakit ditandai sudah sembuh.', data });
    } catch (err) {
        next(err);
    }
};

module.exports = { getIllnessHistory, addIllness, markRecovered };
