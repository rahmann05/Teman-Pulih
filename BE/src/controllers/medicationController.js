const db = require('../config/db');
const { supabase } = require('../config/db');

const canAccessPatient = async (caregiverId, patientId) => {
    const query = 'SELECT id FROM family_relations WHERE caregiver_id = $1 AND patient_id = $2 AND status = $3 LIMIT 1';
    const { rows } = await db.query(query, [caregiverId, patientId, 'accepted']);
    return rows.length > 0;
};

const resolveTargetPatientId = async (req, candidatePatientId) => {
    if (!candidatePatientId) return { patientId: req.user.id };

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
        const { patientId, error: relationError } = await resolveTargetPatientId(req, req.query.patient_id);
        if (relationError) return res.status(403).json({ error: relationError });
        const targetUserId = patientId;

        // Query medications with their schedules using nested JSON grouping in Postgres
        const query = `
            SELECT 
                m.*,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'id', ms.id,
                            'frequency', ms.frequency,
                            'time_slots', ms.time_slots,
                            'start_date', ms.start_date,
                            'end_date', ms.end_date
                        )
                    ) FILTER (WHERE ms.id IS NOT NULL),
                    '[]'
                ) as medication_schedules
            FROM medications m
            LEFT JOIN medication_schedules ms ON m.id = ms.medication_id
            WHERE m.user_id = $1
            GROUP BY m.id
            ORDER BY m.created_at DESC
        `;
        
        const { rows } = await db.query(query, [targetUserId]);
        res.status(200).json({ data: rows });
    } catch (error) {
        console.error('getMedications Error:', error.message);
        res.status(500).json({ error: error.message });
    }
};

// Tambah Obat dan Jadwalnya
const createMedication = async (req, res) => {
    try {
        const userId = req.user.id;
        const { patient_id, name, dosage, instructions, schedules } = req.body;

        const { patientId, error: relationError } = await resolveTargetPatientId(req, patient_id);
        if (relationError) return res.status(403).json({ error: relationError });
        const targetUserId = patientId;

        if (!name) {
            return res.status(400).json({ error: 'Nama obat wajib diisi' });
        }

        // Menggunakan library supabase untuk insert karena trigger sudah diatur
        const { data: medData, error: medError } = await supabase
            .from('medications')
            .insert([{ user_id: targetUserId, name, dosage, instructions }])
            .select()
            .single();

        if (medError) throw medError;

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

// Update Data Obat
const updateMedication = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, dosage, instructions } = req.body;

        const queryFind = 'SELECT id, user_id FROM medications WHERE id = $1';
        const { rows: meds } = await db.query(queryFind, [id]);
        const medication = meds[0];

        if (!medication) {
            return res.status(404).json({ error: 'Obat tidak ditemukan' });
        }

        const { error: relationError } = await resolveTargetPatientId(req, medication.user_id);
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

// Hapus Obat
const deleteMedication = async (req, res) => {
    try {
        const { id } = req.params;
        const queryFind = 'SELECT id, user_id FROM medications WHERE id = $1';
        const { rows: meds } = await db.query(queryFind, [id]);
        const medication = meds[0];

        if (!medication) {
            return res.status(404).json({ error: 'Obat tidak ditemukan' });
        }

        const { error: relationError } = await resolveTargetPatientId(req, medication.user_id);
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
        const { schedule_id, status } = req.body;

        if (!status) {
            return res.status(400).json({ error: 'Status wajib diisi (taken/missed/skipped)' });
        }

        const queryFind = 'SELECT id, user_id FROM medications WHERE id = $1';
        const { rows: meds } = await db.query(queryFind, [id]);
        const medication = meds[0];

        if (!medication) {
            return res.status(404).json({ error: 'Obat tidak ditemukan' });
        }

        const { error: relationError } = await resolveTargetPatientId(req, medication.user_id);
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
        const { patientId, error: relationError } = await resolveTargetPatientId(req, req.query.patient_id);
        if (relationError) return res.status(403).json({ error: relationError });
        const targetUserId = patientId;

        const query = `
            SELECT 
                ml.*,
                json_build_object(
                    'name', m.name,
                    'dosage', m.dosage,
                    'user_id', m.user_id
                ) as medications
            FROM medication_logs ml
            JOIN medications m ON ml.medication_id = m.id
            WHERE m.user_id = $1
            ORDER BY ml.taken_at DESC
        `;
        
        const { rows } = await db.query(query, [targetUserId]);
        res.status(200).json({ data: rows });
    } catch (error) {
        console.error('getMedicationLogs Error:', error.message);
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