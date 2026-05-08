const { supabase } = require('../config/db');

// Registrasi User
const register = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        const normalizedEmail = email?.trim().toLowerCase();
        const normalizedName = name?.trim();

        if (!normalizedEmail || !password || !normalizedName || !role) {
            return res.status(400).json({ error: 'Data registrasi tidak lengkap' });
        }

        // 1. Daftarkan user ke Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: normalizedEmail,
            password: password,
        });

        if (authError) throw authError;

        // 2. Simpan profil tambahan/role ke tabel public.users
        const userId = authData.user.id;
        const { data: userData, error: userError } = await supabase
            .from('users')
            .insert([{ id: userId, name: normalizedName, email: normalizedEmail, role: role }])
            .select()
            .single();

        if (userError) throw userError;

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
        const { email, password, role } = req.body;
        const normalizedEmail = email?.trim().toLowerCase();
        const normalizedRole = role?.trim().toLowerCase();

        if (!normalizedEmail || !password) {
            return res.status(400).json({ error: 'Email dan kata sandi wajib diisi' });
        }
        
        // 1. Login melalui Supabase Auth
        const { data, error } = await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password: password,
        });

        if (error) throw error;

        // 2. Ambil informasi role user dari tabel public.users
        let { data: userData, error: userError } = await supabase
            .from('users')
            .select('role, name')
            .eq('id', data.user.id)
            .single();

        if (userError || !userData) {
            const roleFromMetadata = data.user?.user_metadata?.role || data.user?.app_metadata?.role;
            const resolvedRole = normalizedRole || roleFromMetadata;
            const resolvedName = data.user?.user_metadata?.name || data.user?.email?.split('@')[0] || 'User';

            if (!resolvedRole) {
                return res.status(409).json({
                    error: 'Profil user tidak ditemukan. Sertakan role saat login atau lengkapi metadata role di Supabase Auth.'
                });
            }

            const { data: createdUser, error: createError } = await supabase
                .from('users')
                .upsert([
                    {
                        id: data.user.id,
                        name: resolvedName,
                        email: data.user.email,
                        role: resolvedRole
                    }
                ])
                .select('role, name')
                .single();

            if (createError || !createdUser) {
                return res.status(401).json({ error: createError?.message || 'Gagal membuat profil user.' });
            }

            userData = createdUser;
        }

        res.status(200).json({
            message: 'Login successful',
            user: { id: data.user.id, email: data.user.email, ...userData },
            token: data.session.access_token
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

        // Ambil detail role/nama
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('role, name')
            .eq('id', user.id)
            .single();

        if (userError || !userData) {
            return res.status(404).json({ error: 'Profil user tidak ditemukan.' });
        }

        res.status(200).json({
            user: { id: user.id, email: user.email, ...userData }
        });
    } catch (error) {
        res.status(401).json({ error: error.message });
    }
};

module.exports = { register, login, getMe };