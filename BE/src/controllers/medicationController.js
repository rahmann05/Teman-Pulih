const medicationService = require('../services/medicationService');
const { searchDrug, searchDrugsList, searchDisease } = require('../services/ragService');
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

        const drugsList = await searchDrugsList(query.trim());
        const disease = await searchDisease(query.trim());

        const responseData = {
            obat: [],
            kondisi: []
        };

        if (drugsList && drugsList.length > 0) {
            // Check allergy for each drug in the list
            let patientProfile = null;
            if (patient_id) {
                try {
                    const db = require('../config/db');
                    const { rows } = await db.query(
                        'SELECT chronic_conditions, allergies, past_illnesses, last_illness, routine_medications FROM profiles WHERE user_id = $1',
                        [patient_id]
                    );
                    patientProfile = rows[0] || null;
                } catch (e) {
                    console.warn('[medicationController] Failed to query profile for allergy check:', e.message);
                }
            }

            for (let idx = 0; idx < drugsList.length; idx++) {
                const drug = drugsList[idx];
                let allergyWarningText = '';
                if (patientProfile) {
                    try {
                        const { checkDrugAllergy } = require('../services/ragService');
                        const allergyCheck = checkDrugAllergy(drug, patientProfile);
                        if (allergyCheck.hasAllergy) {
                            allergyWarningText = allergyCheck.details;
                        }
                    } catch (e) {
                        console.warn('[medicationController] Failed to check allergy:', e.message);
                    }
                }

                responseData.obat.push({
                    id: `drug-${idx + 1}`,
                    nama_obat:      drug.nama_obat,
                    kategori:       drug.kategori,
                    dosis:          drug.dosis,
                    aturan_pakai:   drug.aturan_pakai,
                    indikasi:       drug.indikasi,
                    komposisi:      drug.komposisi,
                    efek_samping:   drug.efek_samping,
                    kontraindikasi: drug.kontraindikasi,
                    peringatan:     drug.peringatan,
                    allergy_warning: allergyWarningText
                });
            }
        }

        if (disease) {
            responseData.kondisi.push({
                id: 'cond-1',
                content: disease.raw_content
            });
        }

        res.status(200).json({ data: responseData });
    } catch (err) {
        next(err);
    }
};

module.exports = { getMedications, createMedication, updateMedication, deleteMedication, markTaken, getMedicationLogs, searchChroma };