const { supabase } = require('../config/db');

// Registrasi User
const register = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        // 1. Daftarkan user ke Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: email,
            password: password,
        });

        if (authError) throw authError;

        // 2. Simpan profil tambahan/role ke tabel public.users
        const userId = authData.user.id;
        const { data: userData, error: userError } = await supabase
            .from('users')
            .insert([{ id: userId, name: name, email: email, role: role }])
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
        const { email, password } = req.body;
        
        // 1. Login melalui Supabase Auth
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) throw error;

        // 2. Ambil informasi role user dari tabel public.users
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('role, name')
            .eq('id', data.user.id)
            .single();

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
        const { data: userData } = await supabase
            .from('users')
            .select('role, name')
            .eq('id', user.id)
            .single();

        res.status(200).json({
            user: { id: user.id, email: user.email, ...userData }
        });
    } catch (error) {
        res.status(401).json({ error: error.message });
    }
};

module.exports = { register, login, getMe };