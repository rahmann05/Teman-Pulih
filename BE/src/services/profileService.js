const db = require('../config/db');
const { normalizePhone, phoneRegex } = require('../helpers/phone');
const { cacheGet, cacheSet, cacheDel } = require('../helpers/cache');

const getProfile = async (userId) => {
    const cacheKey = `profile_data:${userId}`;
    const cached = await cacheGet(cacheKey);
    if (cached) {
        console.log(`[REDIS] Profil ditarik dari Cache - User ID: ${userId}`);
        return cached;
    }

    const userQuery = 'SELECT id, name, email FROM users WHERE id = $1';
    const { rows: userRows } = await db.query(userQuery, [userId]);
    const user = userRows[0];
    if (!user) throw Object.assign(new Error('User tidak ditemukan'), { statusCode: 404 });

    const profileQuery = `
        SELECT id, user_id, phone, address, birth_date, gender,
               blood_type, height, weight, allergies, chronic_conditions,
               emergency_contact_name, emergency_contact_phone,
               smoking_habit, alcohol_habit, is_emr_completed,
               past_illnesses, last_illness, surgeries_history,
               routine_medications, blood_pressure_range
        FROM profiles WHERE user_id = $1
    `;
    const { rows: profileRows } = await db.query(profileQuery, [userId]);
    const profile = profileRows[0];

    const formattedProfile = {
        id: user.id,
        name: user.name,
        email: user.email,
        profile: profile || null,
    };

    await cacheSet(cacheKey, formattedProfile);
    return formattedProfile;
};

const updateProfile = async (userId, supabase, updates) => {
    if (updates.phone) {
        const normalizedPhone = normalizePhone(updates.phone);
        if (!phoneRegex.test(normalizedPhone)) {
            throw Object.assign(new Error('Format nomor telepon tidak valid.'), { statusCode: 400 });
        }
        updates.phone = normalizedPhone;
    }

    // Whitelist valid columns to prevent Supabase from throwing 'column does not exist' errors
    const validColumns = [
        'phone', 'address', 'birth_date', 'gender', 'blood_type', 'height', 'weight',
        'allergies', 'chronic_conditions', 'emergency_contact_name', 'emergency_contact_phone',
        'smoking_habit', 'alcohol_habit', 'is_emr_completed', 'past_illnesses',
        'last_illness', 'surgeries_history', 'routine_medications', 'blood_pressure_range'
    ];

    const cleanUpdates = {};
    for (const key of Object.keys(updates)) {
        if (validColumns.includes(key)) {
            cleanUpdates[key] = updates[key];
        }
    }

    if (Object.keys(cleanUpdates).length === 0) {
        return await getProfile(userId); // Return current if nothing to update
    }

    const { data, error } = await supabase
        .from('profiles')
        .update(cleanUpdates)
        .eq('user_id', userId)
        .select()
        .maybeSingle();
    if (error) throw error;
    if (!data) throw Object.assign(new Error('Profil tidak ditemukan.'), { statusCode: 404 });

    await cacheDel(
        `profile_data:${userId}`,
        `emr_profile:patient_${userId}`,
        `emr_profile:caregiver_${userId}`
    );
    return data;
};

module.exports = { getProfile, updateProfile };
