const { emailRegex } = require('../helpers/validation');
const { normalizePhone } = require('../helpers/phone');
const { cacheDel } = require('../helpers/cache');

const requestAccess = async (caregiverId, supabase, identifier) => {
    if (!identifier) throw Object.assign(new Error('Email atau nomor telepon pasien wajib diisi.'), { statusCode: 400 });

    const isEmail = emailRegex.test(identifier);
    let patientId = null;

    if (isEmail) {
        const { data: user, error } = await supabase
            .from('users').select('id, profiles(phone)').eq('email', identifier.toLowerCase()).single();
        if (error || !user) throw Object.assign(new Error('Pasien dengan email tersebut tidak ditemukan.'), { statusCode: 404 });
        patientId = user.id;
    } else {
        const normalizedPhone = normalizePhone(identifier);
        const { data: profile, error } = await supabase
            .from('profiles').select('user_id, phone').eq('phone', normalizedPhone).single();
        if (error || !profile) throw Object.assign(new Error('Pasien dengan nomor telepon tersebut tidak ditemukan.'), { statusCode: 404 });
        patientId = profile.user_id;
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

    const { data: relation, error: relationError } = await supabase
        .from('family_relations')
        .upsert({ caregiver_id: caregiverId, patient_id: patientId, status: 'pending' }, { onConflict: 'patient_id, caregiver_id' })
        .select().single();
    if (relationError) throw relationError;

    await cacheDel(`family_relations:${caregiverId}`, `family_relations:${patientId}`);
    return relation;
};

const approveAccess = async (patientId, supabase, relation_id, status) => {
    if (!['accepted', 'rejected'].includes(status)) {
        throw Object.assign(new Error('Status tidak valid.'), { statusCode: 400 });
    }

    const { data: relation, error } = await supabase
        .from('family_relations')
        .update({ status })
        .eq('id', relation_id)
        .eq('patient_id', patientId)
        .select().single();

    if (error || !relation) throw Object.assign(new Error('Permintaan tidak ditemukan atau Anda tidak memiliki akses.'), { statusCode: 404 });

    await cacheDel(
        `family_relations:${patientId}`,
        `family_relations:${relation.caregiver_id}`,
        `emr_profile:caregiver_${relation.caregiver_id}`
    );
    return relation;
};

const getPendingRequests = async (patientId, supabase) => {
    const { data, error } = await supabase
        .from('family_relations')
        .select('id, created_at, caregiver:users!caregiver_id(id, name, email)')
        .eq('patient_id', patientId)
        .eq('status', 'pending');
    if (error) throw error;
    return data;
};

module.exports = { requestAccess, approveAccess, getPendingRequests };
