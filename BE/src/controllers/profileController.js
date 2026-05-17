const db = require('../config/db');
const redis = require('../config/redis.js');

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^(?:\+62|62|08)\d{8,12}$/;

const normalizePhone = (rawPhone) => {
    if (!rawPhone) return null;
    const cleaned = rawPhone.replace(/\s+/g, '').replace(/-/g, '');
    if (cleaned.startsWith('+62')) return cleaned;
    if (cleaned.startsWith('62')) return `+${cleaned}`;
    if (cleaned.startsWith('08')) return `+62${cleaned.slice(1)}`;
    return cleaned;
};

const getSupabaseClient = (req) => {
    if (!req.supabase) {
        throw new Error('Supabase client is not initialized for this request.');
    }
    return req.supabase;
};

// --- PROFIL ---
const getProfile = async (req, res) => {
    try {
        const userId = req.user.id;

        // REDIS CACHE: Cek cache profil untuk user ini
        const cacheKey = `profile_data:${userId}`;
        if (redis.status === 'ready') {
            const cachedData = await redis.get(cacheKey);
            if (cachedData) {
                console.log(`[REDIS] Profil ditarik dari Cache - User ID: ${userId}`);
                return res.status(200).json(JSON.parse(cachedData));
            }
        }

        // Menggunakan DB Pool untuk bypass RLS
        const userQuery = 'SELECT id, name, email FROM users WHERE id = $1';
        const { rows: userRows } = await db.query(userQuery, [userId]);
        const user = userRows[0];

        if (!user) {
            return res.status(404).json({ error: 'User tidak ditemukan' });
        }

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
        
        // Formating ulang response agar rapi
        const formattedProfile = {
            id: user.id,
            name: user.name,
            email: user.email,
            profile: profile || null
        };

        // SIMPAN KE REDIS: Set kedaluwarsa 4 jam
        if (redis.status === 'ready') {
            await redis.set(cacheKey, JSON.stringify(formattedProfile), 'EX', 14400);
        }

        res.status(200).json(formattedProfile);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const updates = { ...req.body };
        const supabase = getSupabaseClient(req);

        if (updates.phone) {
            const normalizedPhone = normalizePhone(updates.phone);
            if (!phoneRegex.test(normalizedPhone)) {
                return res.status(400).json({ error: 'Format nomor telepon tidak valid.' });
            }
            updates.phone = normalizedPhone;
        }

        // 1. GATEWAY -> DB: Update data profile
        const { data, error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('user_id', userId)
            .select()
            .single();

        if (error) throw error;

        // HAPUS CACHE PROFIL KARENA ADA PERUBAHAN
        if (redis.status === 'ready') {
            await redis.del(`profile_data:${userId}`);
            await redis.del(`emr_profile:patient_${userId}`);
            await redis.del(`emr_profile:caregiver_${userId}`);
        }

        // 2. GATEWAY -> FE
        res.status(200).json({ message: 'Profile updated successfully', data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// --- SINKRONISASI KELUARGA (FAMILY SYNC) ---
const inviteFamily = async (req, res) => {
    try {
        const userId = req.user.id;
        const { identifier } = req.body; // Email atau nomor telepon yang diundang
        const supabase = getSupabaseClient(req);

        if (!identifier) {
            return res.status(400).json({ error: 'Email atau nomor telepon wajib diisi.' });
        }

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
                return res.status(400).json({ error: 'Format nomor telepon tidak valid.' });
            }

            const { data, error } = await supabase
                .from('profiles')
                .select('user_id, users ( id, email )')
                .eq('phone', normalizedPhone)
                .single();
            if (error) throw error;
            invitedUser = data?.users ? { id: data.users.id, email: data.users.email } : null;
        }

        if (!invitedUser) {
            return res.status(404).json({ error: "Pengguna tidak ditemukan." });
        }

        if (!['patient', 'caregiver'].includes(req.user.role)) {
            return res.status(400).json({ error: 'Role aktif tidak valid.' });
        }

        // Tentukan siapa patient dan siapa caregiver berdasarkan role aktif
        const isSelfPatient = req.user.role === 'patient';
        const patientId = isSelfPatient ? userId : invitedUser.id;
        const caregiverId = isSelfPatient ? invitedUser.id : userId;

        // 2. GATEWAY -> DB: Masukkan status pending/accepted pada tabel family_relations
        const { error: inviteError } = await supabase
            .from('family_relations')
            .insert([{ patient_id: patientId, caregiver_id: caregiverId, status: 'pending' }]);

        if (inviteError) throw inviteError;

        // HAPUS CACHE RELASI
        if (redis.status === 'ready') {
            await redis.del(`family_relations:${userId}`);
            await redis.del(`family_relations:${invitedUser.id}`);
        }

        // 3. GATEWAY -> FE
        res.status(200).json({ message: "Undangan Keluarga berhasil dikirim.", status: "pending" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getFamilyMembers = async (req, res) => {
    try {
        const userId = req.user.id;
        const supabase = getSupabaseClient(req);

        // REDIS CACHE: Cek cache relasi untuk user ini
        const cacheKey = `family_relations:${userId}`;
        if (redis.status === 'ready') {
            const cachedData = await redis.get(cacheKey);
            if (cachedData) {
                console.log(`[REDIS] Daftar Relasi ditarik dari Cache - User ID: ${userId}`);
                return res.status(200).json({ members: JSON.parse(cachedData) });
            }
        }

        // GATEWAY -> DB: Ambil daftar relasi yang mencakup user ini (Bisa sebagai Patient atau Caregiver)
        const { data, error } = await supabase
            .from('family_relations')
            .select(`
                id, status, created_at,
                patient:patient_id (id, name, email),
                caregiver:caregiver_id (id, name, email)
            `)
            .or(`patient_id.eq.${userId},caregiver_id.eq.${userId}`);

        if
