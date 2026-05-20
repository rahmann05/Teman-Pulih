const { cacheGet, cacheSet, cacheDel } = require('../helpers/cache');
const { resolveTargetPatientId } = require('../helpers/patientAccess');

/**
 * Ambil riwayat penyakit pasien (aktif dan sudah sembuh)
 */
const getIllnessHistory = async (user, supabase, patientId) => {
    let targetPatientId = user.id;
    if (patientId) {
        const { patientId: resolvedId, error } = await resolveTargetPatientId(user, patientId);
        if (error) throw Object.assign(new Error(error), { statusCode: 403 });
        targetPatientId = resolvedId;
    }

    const cacheKey = `illness_history:${targetPatientId}`;
    const cached = await cacheGet(cacheKey);
    if (cached) {
        console.log(`[REDIS] Illness history dari cache — patient ${targetPatientId}`);
        return cached;
    }

    const { data, error: fetchError } = await supabase
        .from('illness_history')
        .select('*')
        .eq('patient_id', targetPatientId)
        .order('started_at', { ascending: false });

    if (fetchError) throw fetchError;
    await cacheSet(cacheKey, data, 1800); // 30 menit TTL
    return data;
};

/**
 * Tambah penyakit baru
 */
const addIllness = async (user, supabase, { illness_name, started_at, notes }) => {
    if (!illness_name || !illness_name.trim()) {
        throw Object.assign(new Error('Nama penyakit wajib diisi.'), { statusCode: 400 });
    }

    const { data, error } = await supabase
        .from('illness_history')
        .insert([{
            patient_id:   user.id,
            illness_name: illness_name.trim(),
            started_at:   started_at || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }),
            notes:        notes?.trim() || null,
            is_active:    true,
        }])
        .select()
        .single();

    if (error) throw error;

    // Update field last_illness di profiles agar RAG / EMR tetap sinkron
    await supabase
        .from('profiles')
        .update({ last_illness: illness_name.trim() })
        .eq('user_id', user.id);

    await cacheDel(
        `illness_history:${user.id}`,
        `emr_profile:patient_${user.id}`,
        `emr_profile:caregiver_${user.id}`,
        `profile_data:${user.id}`
    );

    return data;
};

/**
 * Tandai penyakit sebagai sudah sembuh
 */
const markRecovered = async (user, supabase, illnessId) => {
    // Pastikan hanya pemilik yang bisa update
    const { data: existing } = await supabase
        .from('illness_history')
        .select('id, patient_id')
        .eq('id', illnessId)
        .eq('patient_id', user.id)
        .single();

    if (!existing) {
        throw Object.assign(new Error('Riwayat penyakit tidak ditemukan atau bukan milik Anda.'), { statusCode: 404 });
    }

    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });

    const { data, error } = await supabase
        .from('illness_history')
        .update({ is_active: false, recovered_at: today })
        .eq('id', illnessId)
        .eq('patient_id', user.id)
        .select()
        .single();

    if (error) throw error;

    await cacheDel(
        `illness_history:${user.id}`,
        `emr_profile:patient_${user.id}`,
        `emr_profile:caregiver_${user.id}`
    );

    return data;
};

module.exports = { getIllnessHistory, addIllness, markRecovered };
