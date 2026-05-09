const { supabase } = require('../config/db');

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

const getAllowedRoles = async (userId) => {
    const { data: patientRelation } = await supabase
        .from('family_relations')
        .select('id')
        .eq('patient_id', userId)
        .eq('status', 'accepted')
        .limit(1)
        .maybeSingle();

    const { data: caregiverRelation } = await supabase
        .from('family_relations')
        .select('id')
        .eq('caregiver_id', userId)
        .eq('status', 'accepted')
        .limit(1)
        .maybeSingle();

    const allowedRoles = ['patient'];
    if (caregiverRelation) allowedRoles.push('caregiver');
    return allowedRoles;
};

// Registrasi User
const register = async (req, res) => {
    try {
        const { name, email, phone, password } = req.body;
        const normalizedEmail = email?.trim().toLowerCase();
        const normalizedName = name?.trim();
        const normalizedPhone = normalizePhone(phone?.trim());

        if (!normalizedEmail || !password || !normalizedName || !normalizedPhone) {
            return res.status(400).json({ error: 'Data registrasi tidak lengkap' });
        }

        if (!emailRegex.test(normalizedEmail)) {
            return res.status(400).json({ error: 'Format email tidak valid' });
        }

        if (!phoneRegex.test(normalizedPhone)) {
            return res.status(400).json({ error: 'Format nomor telepon tidak valid' });
        }

        // 1. Daftarkan user ke Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: normalizedEmail,
            password: password,
        });

        if (authError) throw authError;

        // 2. Simpan profil tambahan ke tabel public.users
        const authId = authData.user.id;
        const { data: userData, error: userError } = await supabase
            .from('users')
            .insert([{ auth_id: authId, name: normalizedName, email: normalizedEmail }])
            .select()
            .single();

        if (userError) throw userError;

        const { error: profileError } = await supabase
            .from('profiles')
            .insert([{ user_id: userData.id, phone: normalizedPhone }]);

        if (profileError) throw profileError;

        res.status(201).json({
            message: 'User registered successfully. Verifikasi email Anda (jika diaktifkan di Supabase).',
            user: userData,
            session: authData.session
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Login User
const login = async (req, res) => {
    try {
        const { identifier, password, role } = req.body;
        const normalizedIdentifier = identifier?.trim();
        const normalizedRole = role?.trim().toLowerCase();

        if (!normalizedIdentifier || !password) {
            return res.status(400).json({ error: 'Email/No. Telepon dan kata sandi wajib diisi' });
        }

        const isEmail = emailRegex.test(normalizedIdentifier.toLowerCase());
        const normalizedPhone = normalizePhone(normalizedIdentifier);
        let resolvedEmail = isEmail ? normalizedIdentifier.toLowerCase() : null;

        if (!isEmail) {
            if (!phoneRegex.test(normalizedPhone)) {
                return res.status(400).json({ error: 'Format nomor telepon tidak valid' });
            }

            const { data: phoneOwner, error: phoneLookupError } = await supabase
                .from('profiles')
                .select('user_id, phone, users ( id, auth_id, email, name )')
                .eq('phone', normalizedPhone)
                .single();

            if (phoneLookupError || !phoneOwner?.users?.email) {
                return res.status(404).json({ error: 'Nomor telepon belum terdaftar' });
            }

            resolvedEmail = phoneOwner.users.email;
        }

        // 1. Login melalui Supabase Auth
        const { data, error } = await supabase.auth.signInWithPassword({
            email: resolvedEmail,
            password: password,
        });

        if (error) throw error;

        // 2. Ambil user internal atau buat bila belum ada
        let { data: userData, error: userError } = await supabase
            .from('users')
            .select('id, name, email')
            .eq('auth_id', data.user.id)
            .single();

        if (userError || !userData) {
            const resolvedName = data.user?.user_metadata?.name || data.user?.email?.split('@')[0] || 'User';

            const { data: inserted, error: insertError } = await supabase
                .from('users')
                .insert([{ auth_id: data.user.id, name: resolvedName, email: data.user.email }])
                .select('id, name, email')
                .single();
            if (insertError) return res.status(401).json({ error: insertError.message });
            userData = inserted;
        }

        const allowedRoles = await getAllowedRoles(userData.id);
        const requestedRole = normalizedRole && ['patient', 'caregiver'].includes(normalizedRole)
            ? normalizedRole
            : null;

        if (requestedRole && !allowedRoles.includes(requestedRole)) {
            return res.status(403).json({ error: 'Role tidak diizinkan untuk akun ini' });
        }

        const activeRole = requestedRole || allowedRoles[0];

        res.status(200).json({
            message: 'Login successful',
            user: {
                id: userData.id, // Profile ID pendek (SERIAL)
                auth_id: data.user.id, // Supabase Auth UUID
                email: data.user.email,
                name: userData.name,
                role: activeRole
            },
            allowed_roles: allowedRoles,
            token: data.session.access_token,
            refresh_token: data.session.refresh_token
        });
    } catch (error) {
        res.status(401).json({ error: error.message });
    }
};

// Mock implementation for auth controller
const getMe = async (req, res) => {
    try {
        // Mendapatkan token dari header
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) throw new Error('Token is missing');

        // Verifikasi token/Dapatkan user
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error) throw error;

        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id, name, email')
            .eq('auth_id', user.id)
            .single();

        if (userError || !userData) {
            return res.status(404).json({ error: 'Profil user tidak ditemukan.' });
        }

        const allowedRoles = await getAllowedRoles(userData.id);
        res.status(200).json({
            user: {
                id: userData.id,
                auth_id: user.id,
                email: userData.email || user.email,
                name: userData.name
            },
            allowed_roles: allowedRoles
        });
    } catch (error) {
        res.status(401).json({ error: error.message });
    }
};

// Refresh Token
const refreshToken = async (req, res) => {
    try {
        const { refresh_token } = req.body;

        if (!refresh_token) {
            return res.status(400).json({ error: 'Refresh token wajib disertakan.' });
        }

        const { data, error } = await supabase.auth.refreshSession({
            refresh_token: refresh_token
        });

        if (error) throw error;

        res.status(200).json({
            message: 'Token berhasil diperbarui',
            token: data.session.access_token,
            refresh_token: data.session.refresh_token
        });
    } catch (error) {
        res.status(401).json({ error: error.message });
    }
};

module.exports = { register, login, getMe, refreshToken };