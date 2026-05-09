const { supabase } = require('../config/db');

const canAccessPatient = async (caregiverId, patientId) => {
    const { data } = await supabase
        .from('family_relations')
        .select('id')
        .eq('caregiver_id', caregiverId)
        .eq('patient_id', patientId)
        .eq('status', 'accepted')
        .limit(1)
        .maybeSingle();
    return Boolean(data);
};

const resolveTargetPatientId = async (req, candidatePatientId) => {
    if (!candidatePatientId) return req.user.id;

    if (req.user.role === 'caregiver') {
        const allowed = await canAccessPatient(req.user.id, candidatePatientId);
        if (!allowed) {
            return { error: 'Anda tidak memiliki akses ke pasien ini.' };
        }
        return { patientId: candidatePatientId };
    }

    if (String(candidatePatientId) !== String(req.user.id)) {
        return { error: 'Anda tidak memiliki akses ke pasien ini.' };
    }

    return { patientId: req.user.id };
};

// Ambil daftar obat beserta jadwalnya
const getMedications = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Caregiver dapat melihat obat pasien dengan query ?patient_id=...
        const { patientId, error: relationError } = await resolveTargetPatientId(req, req.query.patient_id);
        if (relationError) return res.status(403).json({ error: relationError });
        const targetUserId = patientId || userId;

        const { data, error } = await supabase
            .from('medications')
            .select(`
                id, user_id, name, dosage, instructions, created_at,
                medication_schedules (
                    id, frequency, time_slots, start_date, end_date
                )
            `)
            .eq('user_id', targetUserId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.status(200).json({ data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Tambah Obat dan Jadwalnya
const createMedication = async (req, res) => {
    try {
        const userId = req.user.id;
        const { patient_id, name, dosage, instructions, schedules } = req.body;
        // schedules: array of { frequency, time_slots, start_date, end_date }

        const { patientId, error: relationError } = await resolveTargetPatientId(req, patient_id);
        if (relationError) return res.status(403).json({ error: relationError });
        const targetUserId = patientId || userId;

        if (!name) {
            return res.status(400).json({ error: 'Nama obat wajib diisi' });
        }

        // 1. Insert Data Obat
        const { data: medData, error: medError } = await supabase
            .from('medications')
            .insert([{ user_id: targetUserId, name, dosage, instructions }])
            .select()
            .single();

        if (medError) throw medError;

        // 2. Insert Jadwal Obat
        let createdSchedules = [];
        if (schedules && schedules.length > 0) {
            const schedulesToInsert = schedules.map(s => ({
                medication_id: medData.id,
                frequency: s.frequency,
                time_slots: s.time_slots,
                start_date: s.start_date,
                end_date: s.end_date
            }));

            const { data: schedData, error: schedError } = await supabase
                .from('medication_schedules')
                .insert(schedulesToInsert)
                .select();
                
            if (schedError) throw schedError;
            createdSchedules = schedData;
        }

        res.status(201).json({ 
            message: 'Obat berhasil ditambahkan', 
            data: { ...medData, medication_schedules: createdSchedules } 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Update Data Obat (Informasi Dasarnya saja)
const updateMedication = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, dosage, instructions } = req.body;

        const { data: medication, error: medicationError } = await supabase
            .from('medications')
            .select('id, user_id')
            .eq('id', id)
            .single();

        if (medicationError || !medication) {
            return res.status(404).json({ error: 'Obat tidak ditemukan' });
        }

        const { patientId, error: relationError } = await resolveTargetPatientId(req, medication.user_id);
        if (relationError) return res.status(403).json({ error: relationError });

        const { data, error } = await supabase
            .from('medications')
            .update({ name, dosage, instructions })
            .eq('id', medication.id)
            .select()
            .single();

        if (error) throw error;
        res.status(200).json({ message: 'Obat berhasil diperbarui', data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Hapus Obat (Otomatis juga menghapus schedules & logs karena tipe relasi CASCADE)
const deleteMedication = async (req, res) => {
    try {
        const { id } = req.params;
        const { data: medication, error: medicationError } = await supabase
            .from('medications')
            .select('id, user_id')
            .eq('id', id)
            .single();

        if (medicationError || !medication) {
            return res.status(404).json({ error: 'Obat tidak ditemukan' });
        }

        const { patientId, error: relationError } = await resolveTargetPatientId(req, medication.user_id);
        if (relationError) return res.status(403).json({ error: relationError });

        const { error } = await supabase
            .from('medications')
            .delete()
            .eq('id', medication.id);

        if (error) throw error;
        res.status(200).json({ message: 'Obat beserta jadwalnya berhasil dihapus' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Log minum obat
const markTaken = async (req, res) => {
    try {
        const { id } = req.params; // medication_id
        const { schedule_id, status } = req.body; // status = 'taken', 'missed', 'skipped'

        if (!status) {
            return res.status(400).json({ error: 'Status wajib diisi (taken/missed/skipped)' });
        }

        const { data: medication, error: medicationError } = await supabase
            .from('medications')
            .select('id, user_id')
            .eq('id', id)
            .single();

        if (medicationError || !medication) {
            return res.status(404).json({ error: 'Obat tidak ditemukan' });
        }

        const { patientId, error: relationError } = await resolveTargetPatientId(req, medication.user_id);
        if (relationError) return res.status(403).json({ error: relationError });

        const { data, error } = await supabase
            .from('medication_logs')
            .insert([{ 
                medication_id: medication.id, 
                schedule_id: schedule_id || null, 
                status, 
                taken_at: new Date().toISOString() 
            }])
            .select()
            .single();

        if (error) throw error;
        res.status(201).json({ message: `Status log diubah menjadi ${status}`, data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Ambil riwayat / log obat pasien
const getMedicationLogs = async (req, res) => {
    try {
        const userId = req.user.id;
        const { patientId, error: relationError } = await resolveTargetPatientId(req, req.query.patient_id);
        if (relationError) return res.status(403).json({ error: relationError });
        const targetUserId = patientId || userId;

        // Ambil log di join dengan info obatnya
        const { data, error } = await supabase
            .from('medication_logs')
            .select(`
                *,
                medications!inner (name, dosage, user_id)
            `)
            .eq('medications.user_id', targetUserId)
            .order('taken_at', { ascending: false });

        if (error) throw error;
        res.status(200).json({ data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { 
    getMedications, 
    createMedication, 
    updateMedication, 
    deleteMedication, 
    markTaken,
    getMedicationLogs
};