const { emailRegex } = require('../helpers/validation');
const { normalizePhone, phoneRegex } = require('../helpers/phone');
const { cacheGet, cacheSet, cacheDel } = require('../helpers/cache');
const db = require('../config/db');
const notificationService = require('./notificationService');
const { resolveTargetPatientId } = require('../helpers/patientAccess');


const invite = async (user, supabase, identifier) => {
    if (!identifier) throw Object.assign(new Error('Email atau nomor telepon wajib diisi.'), { statusCode: 400 });

    const trimmedIdentifier = identifier.trim();
    const isEmail = emailRegex.test(trimmedIdentifier.toLowerCase());
    let invitedUser = null;

    if (isEmail) {
        const { rows } = await db.query('SELECT id, email FROM users WHERE email = $1', [trimmedIdentifier.toLowerCase()]);
        invitedUser = rows[0] || null;
    } else {
        const normalizedPhone = normalizePhone(trimmedIdentifier);
        if (!phoneRegex.test(normalizedPhone)) {
            throw Object.assign(new Error('Format nomor telepon tidak valid.'), { statusCode: 400 });
        }
        const query = `
            SELECT p.user_id, u.id, u.email 
            FROM profiles p 
            JOIN users u ON p.user_id = u.id 
            WHERE p.phone = $1
        `;
        const { rows } = await db.query(query, [normalizedPhone]);
        invitedUser = rows[0] ? { id: rows[0].id, email: rows[0].email } : null;
    }

    if (!invitedUser) throw Object.assign(new Error('Pengguna tidak ditemukan.'), { statusCode: 404 });
    if (invitedUser.id === user.id) {
        throw Object.assign(new Error('Anda tidak dapat mengundang diri sendiri.'), { statusCode: 400 });
    }
    
    if (!['patient', 'caregiver'].includes(user.role)) {
        throw Object.assign(new Error('Role aktif tidak valid.'), { statusCode: 400 });
    }

    const isSelfPatient = user.role === 'patient';
    const patientId = isSelfPatient ? user.id : invitedUser.id;
    const caregiverId = isSelfPatient ? invitedUser.id : user.id;

    // Automatically delete expired pending relations from the database
    await db.query(`
        DELETE FROM family_relations 
        WHERE status = 'pending' AND created_at < NOW() - INTERVAL '10 minutes'
    `);

    // Check for existing relationship
    const { data: existingRelation } = await supabase
        .from('family_relations')
        .select('*')
        .eq('patient_id', patientId)
        .eq('caregiver_id', caregiverId)
        .maybeSingle();

    if (existingRelation) {
        if (existingRelation.status === 'accepted') {
            throw Object.assign(new Error('Hubungan keluarga dengan pengguna ini sudah terhubung.'), { statusCode: 400 });
        }
        if (existingRelation.status === 'pending') {
            const createdAt = new Date(existingRelation.created_at);
            const now = new Date();
            const diffMinutes = (now - createdAt) / (1000 * 60);
            if (diffMinutes < 10) {
                throw Object.assign(new Error('Undangan keluarga sedang dalam proses persetujuan.'), { statusCode: 400 });
            }
        }
    }

    // Generate 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    const { error: inviteError } = await supabase
        .from('family_relations')
        .upsert({ 
            patient_id: patientId, 
            caregiver_id: caregiverId, 
            status: 'pending',
            initiated_by: user.id,
            verification_code: verificationCode,
            created_at: new Date().toISOString()
        }, { onConflict: 'patient_id, caregiver_id' });
    if (inviteError) throw inviteError;

    // Send verification code to the recipient
    try {
        await notificationService.sendVerificationCode({
            identifier: trimmedIdentifier,
            code: verificationCode,
            senderName: user.name,
            isEmail
        });
    } catch (sendErr) {
        console.error('[Notification Send Error]: Failed to send verification code:', sendErr.message);
        // Continue even if notification fails so flow doesn't break, but log it
    }

    await cacheDel(`family_relations:${user.id}`, `family_relations:${invitedUser.id}`);
    return { message: 'Undangan Keluarga berhasil dikirim.', status: 'pending' };

};

const getMembers = async (user, supabase) => {
    // Automatically delete expired pending relations from the database
    await db.query(`
        DELETE FROM family_relations 
        WHERE status = 'pending' AND created_at < NOW() - INTERVAL '10 minutes'
    `);

    const cacheKey = `family_relations:${user.id}`;
    const cached = await cacheGet(cacheKey);
    if (cached) {
        console.log(`[REDIS] Daftar Relasi ditarik dari Cache - User ID: ${user.id}`);
        return cached;
    }

    const query = `
        SELECT 
            fr.id, fr.status, fr.created_at,
            json_build_object('id', p.id, 'name', p.name, 'email', p.email) as patient,
            json_build_object('id', c.id, 'name', c.name, 'email', c.email) as caregiver
        FROM family_relations fr
        JOIN users p ON fr.patient_id = p.id
        JOIN users c ON fr.caregiver_id = c.id
        WHERE (fr.patient_id = $1 OR fr.caregiver_id = $1)
          AND (
            fr.status = 'accepted' 
            OR (fr.status = 'pending' AND fr.created_at >= NOW() - INTERVAL '10 minutes')
          )
    `;
    const { rows } = await db.query(query, [user.id]);

    // Calculate dynamic TTL to ensure Redis cache auto-expires exactly when the pending requests expire
    let ttlSeconds = 14400; // default 4 hours
    const pendingRelations = rows.filter(r => r.status === 'pending');
    if (pendingRelations.length > 0) {
        const now = new Date();
        const remainingTimes = pendingRelations.map(r => {
            const createdAt = new Date(r.created_at);
            const expiryTime = new Date(createdAt.getTime() + 10 * 60 * 1000); // 10 minutes limit
            const diffMs = expiryTime - now;
            return Math.max(1, Math.floor(diffMs / 1000));
        });
        ttlSeconds = Math.min(...remainingTimes);
    }

    await cacheSet(cacheKey, rows, ttlSeconds);
    return rows;
};

const createComplaint = async (user, supabase, data) => {
    const { symptoms, severity, notes } = data;
    if (!symptoms) throw Object.assign(new Error('Gejala wajib diisi.'), { statusCode: 400 });
    if (!severity) throw Object.assign(new Error('Tingkat keparahan wajib diisi.'), { statusCode: 400 });
    if (!['mild', 'moderate', 'severe'].includes(severity)) {
        throw Object.assign(new Error('Tingkat keparahan tidak valid.'), { statusCode: 400 });
    }

    // Insert complaint
    const { data: complaint, error: insertError } = await supabase
        .from('medical_complaints')
        .insert([{
            patient_id: user.id,
            symptoms,
            severity,
            notes
        }])
        .select()
        .single();

    if (insertError) throw insertError;

    // Fetch linked caregivers for the patient
    const query = `
        SELECT 
            fr.caregiver_id, 
            u.name as caregiver_name, 
            u.email as caregiver_email,
            p.phone as caregiver_phone
        FROM family_relations fr
        JOIN users u ON fr.caregiver_id = u.id
        LEFT JOIN profiles p ON u.id = p.user_id
        WHERE fr.patient_id = $1 AND fr.status = 'accepted'
    `;
    const { rows: caregivers } = await db.query(query, [user.id]);

    // Send notifications to caregivers
    for (const cg of caregivers) {
        const symptomsText = symptoms;
        const notesText = notes || 'Tidak ada catatan tambahan.';
        const severityLabels = { mild: 'Ringan', moderate: 'Sedang', severe: 'Parah/Darurat' };
        const severityLabel = severityLabels[severity] || severity;

        // 1. In-app notification
        await supabase
            .from('notifications')
            .insert([{
                user_id: cg.caregiver_id,
                title: 'Aduan Medis Darurat dari Pasien!',
                message: `Pasien ${user.name} melaporkan gejala: ${symptomsText} (Keparahan: ${severityLabel}).`,
                type: 'medical_complaint',
                is_read: false
            }]);

        // 2. WhatsApp Notification
        if (cg.caregiver_phone) {
            const waMessage = `🚨 *PEMBERITAHUAN DARURAT TEMANPULIH* 🚨\n\nPasien Anda, *${user.name}*, baru saja melaporkan keluhan medis mendadak!\n\n*Gejala:* ${symptomsText}\n*Tingkat Keparahan:* ${severityLabel}\n*Catatan:* ${notesText}\n\nMohon segera hubungi pasien atau lakukan tindakan medis yang diperlukan.`;
            try {
                await notificationService.sendWhatsApp(cg.caregiver_phone, waMessage);
            } catch (waErr) {
                console.error('[WhatsApp Alert Error]:', waErr.message);
            }
        }

        // 3. Email Notification
        if (cg.caregiver_email) {
            const emailSubject = `🚨 DARURAT: Keluhan Medis Mendadak dari Pasien ${user.name}`;
            const emailHtml = `
                <div style="font-family: sans-serif; padding: 20px; border: 1px solid #ffcdd2; background-color: #ffebee; border-radius: 8px; max-width: 600px;">
                    <h2 style="color: #c62828; margin-top: 0;">⚠️ Pemberitahuan Keluhan Medis TemanPulih</h2>
                    <p>Halo <strong>${cg.caregiver_name}</strong>,</p>
                    <p>Pasien Anda, <strong>${user.name}</strong>, baru saja melaporkan keluhan medis mendadak:</p>
                    <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
                        <tr>
                            <td style="padding: 8px; font-weight: bold; width: 150px; border-bottom: 1px solid #ef9a9a;">Gejala:</td>
                            <td style="padding: 8px; border-bottom: 1px solid #ef9a9a;">${symptomsText}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #ef9a9a;">Keparahan:</td>
                            <td style="padding: 8px; border-bottom: 1px solid #ef9a9a; color: #c62828; font-weight: bold;">${severityLabel}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #ef9a9a;">Catatan:</td>
                            <td style="padding: 8px; border-bottom: 1px solid #ef9a9a;">${notesText}</td>
                        </tr>
                    </table>
                    <p style="font-weight: bold; color: #c62828;">Mohon segera menghubungi pasien untuk memberikan bantuan medis yang diperlukan.</p>
                    <hr style="border: none; border-top: 1px solid #ef9a9a; margin: 20px 0;" />
                    <p style="font-size: 12px; color: #757575; margin-bottom: 0;">Email ini dikirimkan otomatis oleh sistem darurat TemanPulih.</p>
                </div>
            `;
            const emailText = `Pemberitahuan Keluhan Medis TemanPulih\n\nPasien Anda, ${user.name}, baru saja melaporkan keluhan medis mendadak:\n- Gejala: ${symptomsText}\n- Tingkat Keparahan: ${severityLabel}\n- Catatan: ${notesText}\n\nMohon segera hubungi pasien untuk tindakan lebih lanjut.`;
            try {
                await notificationService.sendEmail(cg.caregiver_email, emailSubject, emailHtml, emailText);
            } catch (emailErr) {
                console.error('[Email Alert Error]:', emailErr.message);
            }
        }
    }

    return complaint;
};

const getComplaints = async (user, supabase, patientId) => {
    let targetPatientId = user.id;
    if (patientId) {
        const { patientId: resolvedId, error } = await resolveTargetPatientId(user, patientId);
        if (error) throw Object.assign(new Error(error), { statusCode: 403 });
        targetPatientId = resolvedId;
    }

    const { data, error: fetchError } = await supabase
        .from('medical_complaints')
        .select(`
            *,
            patient:users!medical_complaints_patient_id_fkey(name, email)
        `)
        .eq('patient_id', targetPatientId)
        .order('created_at', { ascending: false });

    if (fetchError) throw fetchError;
    return data;
};

const createCheckin = async (user, supabase, data) => {
    const { condition_rating, symptoms_felt, notes } = data;
    if (!condition_rating || condition_rating < 1 || condition_rating > 5) {
        throw Object.assign(new Error('Rating kondisi (1-5) wajib diisi.'), { statusCode: 400 });
    }

    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });

    const { data: checkin, error } = await supabase
        .from('daily_checkins')
        .upsert({
            patient_id: user.id,
            condition_rating,
            symptoms_felt,
            notes,
            checkin_date: todayStr,
            created_at: new Date().toISOString()
        }, { onConflict: 'patient_id, checkin_date' })
        .select()
        .single();

    if (error) throw error;
    return checkin;
};

const getCheckins = async (user, supabase, patientId, limit = 7) => {
    let targetPatientId = user.id;
    if (patientId) {
        const { patientId: resolvedId, error } = await resolveTargetPatientId(user, patientId);
        if (error) throw Object.assign(new Error(error), { statusCode: 403 });
        targetPatientId = resolvedId;
    }

    const { data, error: fetchError } = await supabase
        .from('daily_checkins')
        .select(`
            *,
            patient:users!daily_checkins_patient_id_fkey(name, email)
        `)
        .eq('patient_id', targetPatientId)
        .order('checkin_date', { ascending: false })
        .limit(limit);

    if (fetchError) throw fetchError;
    return data;
};

const getTodayCheckinStatus = async (user, supabase) => {
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
    const { data, error } = await supabase
        .from('daily_checkins')
        .select('*')
        .eq('patient_id', user.id)
        .eq('checkin_date', todayStr)
        .maybeSingle();

    if (error) throw error;
    return data || null;
};

module.exports = { 
    invite, 
    getMembers,
    createComplaint,
    getComplaints,
    createCheckin,
    getCheckins,
    getTodayCheckinStatus
};
