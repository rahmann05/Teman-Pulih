const { emailRegex } = require('../helpers/validation');
const { normalizePhone, phoneRegex } = require('../helpers/phone');
const { cacheGet, cacheSet, cacheDel } = require('../helpers/cache');
const db = require('../config/db');
const notificationService = require('./notificationService');


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
            throw Object.assign(new Error('Undangan keluarga sedang dalam proses persetujuan.'), { statusCode: 400 });
        }
    }

    // Generate 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    const { error: inviteError } = await supabase
        .from('family_relations')
        .insert([{ 
            patient_id: patientId, 
            caregiver_id: caregiverId, 
            status: 'pending',
            initiated_by: user.id,
            verification_code: verificationCode
        }]);
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
        WHERE fr.patient_id = $1 OR fr.caregiver_id = $1
    `;
    const { rows } = await db.query(query, [user.id]);

    await cacheSet(cacheKey, rows);
    return rows;
};

module.exports = { invite, getMembers };
