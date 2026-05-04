const db = require('../config/db');
const { supabase } = require('../config/db');

// Tambah jadwal obat (Pasien atau Caregiver)
const createSchedule = async (req, res) => {
    const { patient_id, medicine_name, dosage, frequency, time_to_take, start_date, end_date, notes } = req.body;
    
    // Asumsi: jika user adalah caregiver, patient_id harus dikirim. Jika pasien, ambil dari token.
    const targetPatientId = req.user.role === 'patient' ? req.user.id : patient_id;

    try {
        const result = await db.query(
            `INSERT INTO medication_schedules 
            (patient_id, medicine_name, dosage, frequency, time_to_take, start_date, end_date, notes) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [targetPatientId, medicine_name, dosage, frequency, time_to_take, start_date, end_date, notes]
        );
        res.status(201).json({ message: 'Jadwal berhasil ditambahkan', data: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error menambahkan jadwal' });
    }
};

// Ambil jadwal (Bisa pasien lihat sendiri, atau caregiver lihat daftar pasiennya)
const getSchedules = async (req, res) => {
    const targetPatientId = req.query.patient_id || req.user.id; // Untuk caregiver bisa query by patient_id

    try {
        const result = await db.query('SELECT * FROM medication_schedules WHERE patient_id = $1 ORDER BY start_date DESC', [targetPatientId]);
        res.json({ data: result.rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error mengambil jadwal' });
    }
};

// Medication controllers
const getMedications = async (req, res) => {
    try {
        const userId = req.user.id;
        const { data, error } = await supabase
            .from('medications')
            .select('*')
            .eq('user_id', userId);

        if (error) throw error;
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const createMedication = async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, dosage, frequency, start_date, end_date, instructions } = req.body;
        
        const { data, error } = await supabase
            .from('medications')
            .insert([{ user_id: userId, name, dosage, frequency, start_date, end_date, instructions }])
            .select()
            .single();

        if (error) throw error;
        res.status(201).json({ medication: data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const updateMedication = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        
        const { data, error } = await supabase
            .from('medications')
            .update(updates)
            .eq('id', id)
            .eq('user_id', req.user.id)
            .select()
            .single();

        if (error) throw error;
        res.status(200).json({ medication: data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const deleteMedication = async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from('medications')
            .delete()
            .eq('id', id)
            .eq('user_id', req.user.id);

        if (error) throw error;
        res.status(200).json({ message: 'Medication deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const markTaken = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // 'taken', 'skipped'
        
        const { data, error } = await supabase
            .from('medication_logs')
            .insert([{ medication_id: id, status, taken_at: new Date().toISOString() }])
            .select()
            .single();

        if (error) throw error;
        res.status(201).json({ log: data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { createSchedule, getSchedules, getMedications, createMedication, updateMedication, deleteMedication, markTaken };