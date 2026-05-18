const medicationService = require('../services/medicationService');
const { getSupabaseClient } = require('../helpers/supabase');

const getMedications = async (req, res, next) => {
    try {
        const data = await medicationService.getAll(req.user, req.query.patient_id);
        res.status(200).json({ data });
    } catch (err) {
        next(err);
    }
};

const createMedication = async (req, res, next) => {
    try {
        const supabase = getSupabaseClient(req);
        const data = await medicationService.create(req.user, supabase, req.body);
        res.status(201).json({ message: 'Obat berhasil ditambahkan', data });
    } catch (err) {
        next(err);
    }
};

const updateMedication = async (req, res, next) => {
    try {
        const supabase = getSupabaseClient(req);
        const data = await medicationService.update(req.user, supabase, req.params.id, req.body);
        res.status(200).json({ message: 'Obat berhasil diperbarui', data });
    } catch (err) {
        next(err);
    }
};

const deleteMedication = async (req, res, next) => {
    try {
        const supabase = getSupabaseClient(req);
        await medicationService.remove(req.user, supabase, req.params.id);
        res.status(200).json({ message: 'Obat beserta jadwalnya berhasil dihapus' });
    } catch (err) {
        next(err);
    }
};

const markTaken = async (req, res, next) => {
    try {
        const supabase = getSupabaseClient(req);
        const data = await medicationService.markTaken(req.user, supabase, req.params.id, req.body);
        res.status(201).json({ message: `Status log diubah menjadi ${req.body.status}`, data });
    } catch (err) {
        next(err);
    }
};

const getMedicationLogs = async (req, res, next) => {
    try {
        const data = await medicationService.getLogs(req.user, req.query.patient_id);
        res.status(200).json({ data });
    } catch (err) {
        next(err);
    }
};

const searchChroma = async (req, res, next) => {
    try {
        const { query, patient_id } = req.query;
        if (!query || query.trim() === '') {
            return res.status(200).json({ data: { obat: [], kondisi: [] } });
        }
        const supabase = getSupabaseClient(req);
        const data = await medicationService.searchChroma(query, req.user, supabase, patient_id);
        res.status(200).json({ data });
    } catch (err) {
        next(err);
    }
};

module.exports = { getMedications, createMedication, updateMedication, deleteMedication, markTaken, getMedicationLogs, searchChroma };