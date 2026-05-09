const { supabase } = require('../config/db');

// Ambil daftar obat beserta jadwalnya
const getMedications = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Caregiver dapat melihat obat pasien dengan query ?patient_id=...
        const targetUserId = (req.user.role === 'caregiver' && req.query.patient_id) 
            ? req.query.patient_id 
            : userId;

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

        const targetUserId = (req.user.role === 'caregiver' && patient_id) ? patient_id : userId;

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

        const { data, error } = await supabase
            .from('medications')
            .update({ name, dosage, instructions })
            .eq('id', id)
            // Memastikan data edit hanya milik yang bersangkutan
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
        const { error } = await supabase
            .from('medications')
            .delete()
            .eq('id', id);

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

        const { data, error } = await supabase
            .from('medication_logs')
            .insert([{ 
                medication_id: id, 
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
        const targetUserId = (req.user.role === 'caregiver' && req.query.patient_id) 
            ? req.query.patient_id 
            : userId;

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