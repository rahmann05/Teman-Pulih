const db = require('../config/db');

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

module.exports = { createSchedule, getSchedules };