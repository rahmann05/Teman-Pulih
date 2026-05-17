const { emailRegex } = require('../helpers/validation');
const { normalizePhone, phoneRegex } = require('../helpers/phone');
const { cacheGet, cacheSet, cacheDel } = require('../helpers/cache');

const invite = async (user, supabase, identifier) => {
    if (!identifier) throw Object.assign(new Error('Email atau nomor telepon wajib diisi.'), { statusCode: 400 });

    const trimmedIdentifier = identifier.trim();
    const isEmail = emailRegex.test(trimmedIdentifier.toLowerCase());
    let invitedUser = null;

    if (isEmail) {
        const { data, error } = await supabase
            .from('users')
            .select('id, email')
            .eq('email', trimmedIdentifier.toLowerCase())
            .single();
        if (error) throw error;
        invitedUser = data;
    } else {
        const normalizedPhone = normalizePhone(trimmedIdentifier);
        if (!phoneRegex.test(normalizedPhone)) {
            throw Object.assign(new Error('Format nomor telepon tidak valid.'), { statusCode: 400 });
        }
        const { data, error } = await supabase
            .from('profiles')
            .select('user_id, users ( id, email )')
            .eq('phone', normalizedPhone)
            .single();
        if (error) throw error;
        invitedUser = data?.users ? { id: data.users.id, email: data.users.email } : null;
    }

    if (!invitedUser) throw Object.assign(new Error('Pengguna tidak ditemukan.'), { statusCode: 404 });
    if (!['patient', 'caregiver'].includes(user.role)) {
        throw Object.assign(new Error('Role aktif tidak valid.'), { statusCode: 400 });
    }

    const isSelfPatient = user.role === 'patient';
    const patientId = isSelfPatient ? user.id : invitedUser.id;
    const caregiverId = isSelfPatient ? invitedUser.id : user.id;

    const { error: inviteError } = await supabase
        .from('family_relations')
        .insert([{ patient_id: patientId, caregiver_id: caregiverId, status: 'pending' }]);
    if (inviteError) throw inviteError;

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

    const { data, error } = await supabase
        .from('family_relations')
        .select(`
            id, status, created_at,
            patient:patient_id (id, name, email),
            caregiver:caregiver_id (id, name, email)
        `)
        .or(`patient_id.eq.${user.id},caregiver_id.eq.${user.id}`);
    if (error) throw error;

    await cacheSet(cacheKey, data);
    return data;
};

module.exports = { invite, getMembers };
