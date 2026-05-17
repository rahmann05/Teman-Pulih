const db = require('../config/db');
const { resolveTargetPatientId } = require('../helpers/patientAccess');
const { cacheGet, cacheSet, cacheDel } = require('../helpers/cache');

// Ambil daftar obat beserta jadwalnya
const getAll = async (user, candidatePatientId) => {
    const { patientId, error } = await resolveTargetPatientId(user, candidatePatientId);
    if (error) throw Object.assign(new Error(error), { statusCode: 403 });

    const cacheKey = `medications:${patientId}`;
    const cached = await cacheGet(cacheKey);
    if (cached) {
        console.log(`[REDIS] Daftar Obat & Jadwal ditarik dari Cache - User ID: ${patientId}`);
        return cached;
    }

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
    const { rows } = await db.query(query, [patientId]);
    await cacheSet(cacheKey, rows);
    return rows;
};

// Tambah Obat dan Jadwalnya
const create = async (user, supabase, data) => {
    const { patient_id, name, dosage, instructions, schedules } = data;
    const { patientId, error } = await resolveTargetPatientId(user, patient_id);
    if (error) throw Object.assign(new Error(error), { statusCode: 403 });
    if (!name) throw Object.assign(new Error('Nama obat wajib diisi'), { statusCode: 400 });

    const { data: medData, error: medError } = await supabase
        .from('medications')
        .insert([{ user_id: patientId, name, dosage, instructions }])
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
            end_date: s.end_date,
        }));
        const { data: schedData, error: schedError } = await supabase
            .from('medication_schedules')
            .insert(schedulesToInsert)
            .select();
        if (schedError) throw schedError;
        createdSchedules = schedData;
    }

    await cacheDel(`medications:${patientId}`, `emr_profile:patient_${patientId}`);
    return { ...medData, medication_schedules: createdSchedules };
};

// Update Data Obat
const update = async (user, supabase, medicationId, data) => {
    const { name, dosage, instructions } = data;
    const { rows: meds } = await db.query('SELECT id, user_id FROM medications WHERE id = $1', [medicationId]);
    const medication = meds[0];
    if (!medication) throw Object.assign(new Error('Obat tidak ditemukan'), { statusCode: 404 });

    const { error: accessError } = await resolveTargetPatientId(user, medication.user_id);
    if (accessError) throw Object.assign(new Error(accessError), { statusCode: 403 });

    const { data: updated, error } = await supabase
        .from('medications')
        .update({ name, dosage, instructions })
        .eq('id', medication.id)
        .select()
        .single();
    if (error) throw error;

    await cacheDel(`medications:${medication.user_id}`, `emr_profile:patient_${medication.user_id}`);
    return updated;
};

// Hapus Obat
const remove = async (user, supabase, medicationId) => {
    const { rows: meds } = await db.query('SELECT id, user_id FROM medications WHERE id = $1', [medicationId]);
    const medication = meds[0];
    if (!medication) throw Object.assign(new Error('Obat tidak ditemukan'), { statusCode: 404 });

    const { error: accessError } = await resolveTargetPatientId(user, medication.user_id);
    if (accessError) throw Object.assign(new Error(accessError), { statusCode: 403 });

    const { error } = await supabase.from('medications').delete().eq('id', medication.id);
    if (error) throw error;

    await cacheDel(`medications:${medication.user_id}`, `emr_profile:patient_${medication.user_id}`);
};

// Log minum obat
const markTaken = async (user, supabase, medicationId, data) => {
    const { schedule_id, status, time_slot } = data;
    if (!status) throw Object.assign(new Error('Status wajib diisi (taken/missed/skipped)'), { statusCode: 400 });

    const { rows: meds } = await db.query('SELECT id, user_id FROM medications WHERE id = $1', [medicationId]);
    const medication = meds[0];
    if (!medication) throw Object.assign(new Error('Obat tidak ditemukan'), { statusCode: 404 });

    const { error: accessError } = await resolveTargetPatientId(user, medication.user_id);
    if (accessError) throw Object.assign(new Error(accessError), { statusCode: 403 });

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
            throw Object.assign(new Error('Jadwal ini sudah dicatat hari ini.'), { statusCode: 409 });
        }
    }

    const { data: logData, error } = await supabase
        .from('medication_logs')
        .insert([{
            medication_id: medication.id,
            schedule_id: schedule_id || null,
            time_slot: time_slot || null,
            status,
            taken_at: new Date().toISOString(),
        }])
        .select()
        .single();
    if (error) throw error;

    await cacheDel(`medications:${medication.user_id}`, `emr_profile:patient_${medication.user_id}`);
    return logData;
};

// Ambil riwayat / log obat pasien
const getLogs = async (user, candidatePatientId) => {
    const { patientId, error } = await resolveTargetPatientId(user, candidatePatientId);
    if (error) throw Object.assign(new Error(error), { statusCode: 403 });

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
    const { rows } = await db.query(query, [patientId]);
    return rows;
};

module.exports = { getAll, create, update, remove, markTaken, getLogs };
