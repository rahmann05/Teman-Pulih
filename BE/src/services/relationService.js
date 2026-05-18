const { emailRegex } = require('../helpers/validation');
const { normalizePhone } = require('../helpers/phone');
const { cacheDel } = require('../helpers/cache');
const db = require('../config/db');
const notificationService = require('./notificationService');

const requestAccess = async (caregiverId, supabase, identifier) => {
    if (!identifier) throw Object.assign(new Error('Email atau nomor telepon pasien wajib diisi.'), { statusCode: 400 });

    const isEmail = emailRegex.test(identifier);
    let patientId = null;

    if (isEmail) {
        const { rows } = await db.query('SELECT id FROM users WHERE email = $1', [identifier.toLowerCase()]);
        const userRow = rows[0];
        if (!userRow) throw Object.assign(new Error('Pasien dengan email tersebut tidak ditemukan.'), { statusCode: 404 });
        patientId = userRow.id;
    } else {
        const normalizedPhone = normalizePhone(identifier);
        const { rows } = await db.query('SELECT user_id FROM profiles WHERE phone = $1', [normalizedPhone]);
        const profileRow = rows[0];
        if (!profileRow) throw Object.assign(new Error('Pasien dengan nomor telepon tersebut tidak ditemukan.'), { statusCode: 404 });
        patientId = profileRow.user_id;
    }

    if (patientId === caregiverId) {
        throw Object.assign(new Error('Anda tidak bisa menambahkan diri sendiri sebagai pasien.'), { statusCode: 400 });
    }

    const { data: existingRelation } = await supabase
        .from('family_relations').select('*').eq('caregiver_id', caregiverId).eq('patient_id', patientId).maybeSingle();

    if (existingRelation) {
        if (existingRelation.status === 'accepted') throw Object.assign(new Error('Pasien ini sudah ada di daftar Anda.'), { statusCode: 400 });
        if (existingRelation.status === 'pending') throw Object.assign(new Error('Permintaan akses ke pasien ini sedang menunggu persetujuan.'), { statusCode: 400 });
    }

    // Generate 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    const { data: relation, error: relationError } = await supabase
        .from('family_relations')
        .upsert({ 
            caregiver_id: caregiverId, 
            patient_id: patientId, 
            status: 'pending',
            initiated_by: caregiverId,
            verification_code: verificationCode
        }, { onConflict: 'patient_id, caregiver_id' })
        .select().single();
    if (relationError) throw relationError;

    // Fetch caregiver's name for notification context
    const { rows: caregiverRows } = await db.query('SELECT name FROM users WHERE id = $1', [caregiverId]);
    const caregiverName = caregiverRows[0]?.name || 'Caregiver';

    // Send verification code to the patient
    try {
        await notificationService.sendVerificationCode({
            identifier: identifier.trim(),
            code: verificationCode,
            senderName: caregiverName,
            isEmail
        });
    } catch (sendErr) {
        console.error('[Notification Send Error]: Failed to send verification code:', sendErr.message);
        // Do not crash the API if notification helper fails (for smooth development)
    }

    await cacheDel(`family_relations:${caregiverId}`, `family_relations:${patientId}`);
    return relation;
};

const approveAccess = async (userId, supabase, relation_id, status, verification_code) => {
    if (!['accepted', 'rejected'].includes(status)) {
        throw Object.assign(new Error('Status tidak valid.'), { statusCode: 400 });
    }

    // Fetch the relation to check initiator and verification code
    const { data: relation, error: fetchError } = await supabase
        .from('family_relations')
        .select('*')
        .eq('id', relation_id)
        .maybeSingle();

    if (fetchError || !relation) {
        throw Object.assign(new Error('Permintaan tidak ditemukan.'), { statusCode: 404 });
    }

    if (relation.status !== 'pending') {
        throw Object.assign(new Error('Permintaan ini sudah diproses.'), { statusCode: 400 });
    }

    // Enforce that the approver is the RECIPIENT of the request
    if (relation.initiated_by === userId) {
        throw Object.assign(new Error('Anda tidak dapat menyetujui permintaan yang Anda kirim sendiri.'), { statusCode: 403 });
    }

    if (relation.patient_id !== userId && relation.caregiver_id !== userId) {
        throw Object.assign(new Error('Anda tidak memiliki akses untuk menyetujui permintaan ini.'), { statusCode: 403 });
    }

    // Verify code for approval
    if (status === 'accepted') {
        if (!verification_code) {
            throw Object.assign(new Error('Kode verifikasi wajib diisi.'), { statusCode: 400 });
        }
        if (relation.verification_code !== verification_code.toString().trim()) {
            throw Object.assign(new Error('Kode verifikasi salah.'), { statusCode: 400 });
        }
    }

    const { data: updatedRelation, error } = await supabase
        .from('family_relations')
        .update({ status, verification_code: null }) // clear code once resolved
        .eq('id', relation_id)
        .select().single();

    if (error || !updatedRelation) throw Object.assign(new Error('Gagal memperbarui hubungan.'), { statusCode: 500 });

    await cacheDel(
        `family_relations:${relation.patient_id}`,
        `family_relations:${relation.caregiver_id}`,
        `emr_profile:caregiver_${relation.caregiver_id}`
    );
    return updatedRelation;
};

const getPendingRequests = async (userId, supabase) => {
    const query = `
        SELECT 
            fr.id, fr.created_at, fr.initiated_by,
            json_build_object('id', p.id, 'name', p.name, 'email', p.email) as patient,
            json_build_object('id', c.id, 'name', c.name, 'email', c.email) as caregiver
        FROM family_relations fr
        JOIN users p ON fr.patient_id = p.id
        JOIN users c ON fr.caregiver_id = c.id
        WHERE 
            ((fr.patient_id = $1 AND fr.initiated_by != $1) OR (fr.caregiver_id = $1 AND fr.initiated_by != $1))
            AND fr.status = 'pending'
    `;
    const { rows } = await db.query(query, [userId]);
    return rows;
};

module.exports = { requestAccess, approveAccess, getPendingRequests };
