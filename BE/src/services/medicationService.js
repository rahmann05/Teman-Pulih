const db = require('../config/db');
const { resolveTargetPatientId } = require('../helpers/patientAccess');
const { cacheGet, cacheSet, cacheDel } = require('../helpers/cache');
const { searchDrug } = require('./ragService');
const path = require('path');
const sharp = require('sharp');


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
    let medicinal_insight = data.medicinal_insight || null;
    const { patientId, error } = await resolveTargetPatientId(user, patient_id);
    if (error) throw Object.assign(new Error(error), { statusCode: 403 });
    if (!name) throw Object.assign(new Error('Nama obat wajib diisi'), { statusCode: 400 });

    const hasInsightFields = medicinal_insight && typeof medicinal_insight === 'object'
        ? Object.values(medicinal_insight).some((v) => v !== null && v !== '')
        : false;

    if (!medicinal_insight || !hasInsightFields) {
        try {
            medicinal_insight = await searchDrug(name);
        } catch (e) {
            console.warn('[CHROMA] Fallback medicinal insight gagal:', e.message);
        }
    }

    const { data: medData, error: medError } = await supabase
        .from('medications')
        .insert([{ user_id: patientId, name, dosage, instructions, medicinal_insight }])
        .select()
        .single();
    if (medError) throw medError;

    let createdSchedules = [];
    if (schedules && schedules.length > 0) {
        const schedulesToInsert = schedules.map(s => ({
            medication_id: medData.id,
            frequency:  s.frequency  || null,
            time_slots: s.time_slots,
            // PostgreSQL rejects empty string "" for date columns — convert to null
            start_date: s.start_date || null,
            end_date:   s.end_date   || null,
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
    const { name, dosage, instructions, image_url } = data;
    const { rows: meds } = await db.query('SELECT id, user_id FROM medications WHERE id = $1', [medicationId]);
    const medication = meds[0];
    if (!medication) throw Object.assign(new Error('Obat tidak ditemukan'), { statusCode: 404 });

    const { error: accessError } = await resolveTargetPatientId(user, medication.user_id);
    if (accessError) throw Object.assign(new Error(accessError), { statusCode: 403 });

    const updatePayload = { name, dosage, instructions };
    if (image_url !== undefined) updatePayload.image_url = image_url;

    const { data: updated, error } = await supabase
        .from('medications')
        .update(updatePayload)
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

    const { error } = await supabase
        .from('medications')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', medication.id);
    if (error) throw error;

    await cacheDel(`medications:${medication.user_id}`, `emr_profile:patient_${medication.user_id}`);
};

// Log minum obat
const markTaken = async (user, supabase, medicationId, data) => {
    const { schedule_id, status, time_slot } = data;
    if (!status) throw Object.assign(new Error('Status wajib diisi (taken/missed/skipped)'), { statusCode: 400 });

    const { rows: meds } = await db.query('SELECT id, user_id, name, dosage FROM medications WHERE id = $1', [medicationId]);
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

    // Send real-time notification to caregivers if medication is successfully taken
    if (status === 'taken') {
        try {
            const patientName = user.name || 'Pasien';
            const { data: relations } = await supabase
                .from('family_relations')
                .select('caregiver_id')
                .eq('patient_id', medication.user_id)
                .eq('status', 'accepted');

            if (relations && relations.length > 0) {
                const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
                const notificationService = require('./notificationService');
                
                for (const rel of relations) {
                    const messageText = `${patientName} telah meminum obat ${medication.name} (${medication.dosage || ''}) untuk jadwal pukul ${time_slot || 'sekarang'}.`;
                    
                    await supabase
                        .from('notifications')
                        .insert([{
                            user_id: rel.caregiver_id,
                            title: `${patientName} Sudah Minum Obat`,
                            message: messageText,
                            type: 'caregiver_taken',
                            schedule_id: schedule_id || null,
                            time_slot: time_slot || null,
                            target_date: todayStr
                        }]);

                    // Send actual WhatsApp / Email in the background to prevent blocking/timeout
                    setImmediate(async () => {
                        try {
                            const dbConfig = require('../config/db');
                            const contactRes = await dbConfig.query(`
                                SELECT u.name, u.email, p.phone 
                                FROM users u 
                                LEFT JOIN profiles p ON u.id = p.user_id 
                                WHERE u.id = $1
                            `, [rel.caregiver_id]);
                            
                            const caregiverContact = contactRes?.rows?.[0];
                            if (caregiverContact) {
                                if (caregiverContact.phone) {
                                    await notificationService.sendWhatsApp(caregiverContact.phone, messageText);
                                } else if (caregiverContact.email) {
                                    await notificationService.sendEmail(
                                        caregiverContact.email,
                                        `${patientName} Sudah Minum Obat`,
                                        `<h3>Kabar Kepatuhan Keluarga</h3><p>${messageText}</p>`,
                                        messageText
                                    );
                                }
                            }
                        } catch (contactErr) {
                            console.error('[Notification Caregiver Contact Error]:', contactErr.message);
                        }
                    });
                }
            }
        } catch (notifErr) {
            console.error('[Notification Hook Error]: Failed to notify caregivers:', notifErr.message);
        }
    }

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

/**
 * Upload medication image to Supabase Storage.
 * All uploaded images are converted to WebP (quality 85) by sharp before upload.
 * Naming convention: medications/{userId}/{medicationId}_{timestamp}.webp
 * Bucket: medication-images (public read)
 */
const uploadMedicationImage = async (user, supabase, medicationId, file) => {
    if (!file) throw Object.assign(new Error('File gambar wajib disertakan'), { statusCode: 400 });

    // Verify ownership
    const { rows: meds } = await db.query('SELECT id, user_id FROM medications WHERE id = $1', [medicationId]);
    const medication = meds[0];
    if (!medication) throw Object.assign(new Error('Obat tidak ditemukan'), { statusCode: 404 });
    const { error: accessError } = await resolveTargetPatientId(user, medication.user_id);
    if (accessError) throw Object.assign(new Error(accessError), { statusCode: 403 });

    // ── Convert to WebP using sharp (quality 85) ─────────────────────────────
    let webpBuffer;
    try {
        webpBuffer = await sharp(file.buffer)
            .webp({ quality: 85, lossless: false })
            .toBuffer();
    } catch (sharpErr) {
        throw Object.assign(new Error(`Konversi gambar gagal: ${sharpErr.message}`), { statusCode: 400 });
    }

    // Always store as .webp regardless of original extension
    const timestamp = Date.now();
    const storagePath = `medications/${user.id}/${medicationId}_${timestamp}.webp`;

    // Upload WebP buffer to Supabase Storage bucket
    const { error: uploadError } = await supabase.storage
        .from('medication-images')
        .upload(storagePath, webpBuffer, {
            contentType: 'image/webp',
            upsert: true,
        });

    if (uploadError) throw Object.assign(new Error(`Upload gagal: ${uploadError.message}`), { statusCode: 500 });

    // Get public URL
    const { data: urlData } = supabase.storage
        .from('medication-images')
        .getPublicUrl(storagePath);

    const publicUrl = urlData?.publicUrl;
    if (!publicUrl) throw Object.assign(new Error('Gagal mendapatkan URL gambar'), { statusCode: 500 });

    // Persist URL to medications table
    const { data: updated, error: dbError } = await supabase
        .from('medications')
        .update({ image_url: publicUrl })
        .eq('id', medicationId)
        .select()
        .single();
    if (dbError) throw dbError;

    await cacheDel(`medications:${user.id}`);
    return { image_url: publicUrl, medication: updated };
};

module.exports = { getAll, create, update, remove, markTaken, getLogs, uploadMedicationImage };

