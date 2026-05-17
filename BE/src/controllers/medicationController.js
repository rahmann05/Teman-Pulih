const db = require('../config/db');
const redis = require('../config/redis.js');

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

const getSupabaseClient = (req) => {
    if (!req.supabase) {
        throw new Error('Supabase client is not initialized for this request.');
    }
    return req.supabase;
};

// Ambil daftar obat beserta jadwalnya
const getMedications = async (req, res) => {
    try {
        const { patientId, error: relationError } = await resolveTargetPatientId(req, req.query.patient_id);
        if (relationError) return res.status(403).json({ error: relationError });
        const targetUserId = patientId;

        // REDIS CACHE: Cek cache jadwal obat untuk pengguna ini
        const cacheKey = `medications:${targetUserId}`;
        if (redis.status === 'ready') {
            const cachedData = await redis.get(cacheKey);
            if (cachedData) {
                console.log(`[REDIS] Daftar Obat & Jadwal ditarik dari Cache - User ID: ${targetUserId}`);
                return res.status(200).json({ data: JSON.parse(cachedData) });
            }
        }

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

        // SIMPAN KE REDIS: Set kedaluwarsa 4 jam
        if (redis.status === 'ready') {
            await redis.set(cacheKey, JSON.stringify(rows), 'EX', 14400);
        }

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
        const supabase = getSupabaseClient(req);

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

        // HAPUS CACHE OBAT & EMR KARENA ADA PERUBAHAN
        if (redis.status === 'ready') {
            await redis.del(`medications:${targetUserId}`);
            await redis.del(`emr_profile:patient_${targetUserId}`);
            // (Caregiver cache juga idealnya dihapus, but for simplicity we rely on patient key directly or expiration)
            // Bisa menggunakan wildcard jika redis dikonfigurasi, tapi del direct lebih aman
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
        const supabase = getSupabaseClient(req);

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

        // HAPUS CACHE OBAT & EMR KARENA ADA PERUBAHAN
        if (redis.status === 'ready') {
            await redis.del(`medications:${medication.user_id}`);
            await redis.del(`emr_profile:patient_${medication.user_id}`);
        }

        res.status(200).json({ message: 'Obat berhasil diperbarui', data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Hapus Obat
const deleteMedication = async (req, res) => {
    try {
        const { id } = req.params;
        const supabase = getSupabaseClient(req);
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

        // HAPUS CACHE OBAT & EMR KARENA ADA PERUBAHAN
        if (redis.status === 'ready') {
            await redis.del(`medications:${medication.user_id}`);
            await redis.del(`emr_profile:patient_${medication.user_id}`);
        }

        res.status(200).json({ message: 'Obat beserta jadwalnya berhasil dihapus' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Log minum obat
const markTaken = async (req, res) => {
    try {
        const { id } = req.params; // medication_id
        const { schedule_id, status, time_slot } = req.body;
        const supabase = getSupabaseClient(req);

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

        // Prevent duplicate logs for the same medication, schedule, and time_slot on the same day
        if (time_slot) {
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const todayEnd = new Date();
            todayEnd.setHours(23, 59, 59, 999);

            const { data: existingLogs, error: checkError } = await supabase
                .from('medication_logs')
                .select('id')
                .eq('medication_id', medication.id)
                .eq('time_slot', time_slot)
                .gte('taken_at', todayStart.toISOString())
                .lte('taken_at', todayEnd.toISOString());

            if (checkError) throw checkError;
            if (existingLogs && existingLogs.length > 0) {
                return res.status(409).json({ error: 'Jadwal ini sudah dicatat hari ini.' });
            }
        }

        const { data, error } = await supabase
            .from('medication_logs')
            .insert([{ 
                medication_id: medication.id, 
                schedule_id: schedule_id || null, 
                time_slot: time_slot || null,
                status, 
                taken_at: new Date().toISOString() 
            }])
            .select()
            .single();

        if (error) throw error;

        // HAPUS CACHE OBAT (JADWAL HARIAN UPDATE)
        if (redis.status === 'ready') {
            await redis.del(`medications:${medication.user_id}`);
            await redis.del(`emr_profile:patient_${medication.user_id}`);
        }

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