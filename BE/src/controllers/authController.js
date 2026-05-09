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

        // 2. Ambil role_id dari tabel roles
        const { data: roleData, error: roleError } = await supabase
            .from('roles')
            .select('id')
            .eq('name', role)
            .single();

        if (roleError || !roleData) {
            // Jika role belum ada, insert perlahan atau lemparkan error
            return res.status(400).json({ error: "Role tidak valid atau belum disetup di database." });
        }

        // 3. Simpan profil tambahan/role_id ke tabel public.users
        const authId = authData.user.id;
        const { data: userData, error: userError } = await supabase
            .from('users')
            .insert([{ auth_id: authId, name: normalizedName, email: normalizedEmail, role_id: roleData.id }])
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

        // 2. Ambil informasi role user dari tabel public.users beserta relasinya ke roles
        let { data: userData, error: userError } = await supabase
            .from('users')
            .select(`
                id,
                name,
                role_id,
                roles ( name )
            `)
            .eq('auth_id', data.user.id)
            .single();

        if (userError || !userData) {
            const roleFromMetadata = data.user?.user_metadata?.role || data.user?.app_metadata?.role;
            const resolvedRole = normalizedRole || roleFromMetadata || 'patient';
            const resolvedName = data.user?.user_metadata?.name || data.user?.email?.split('@')[0] || 'User';

            // Ambil role_id dari tabel roles
            const { data: roleData, error: roleError } = await supabase
                .from('roles')
                .select('id, name')
                .eq('name', resolvedRole)
                .single();

            if (roleError || !roleData) {
                return res.status(400).json({ error: "Role tidak valid." });
            }

            // Upsert menggunakan filter eq karena id internal adalah SERIAL
            // Cek terlebih dahulu
            let createdUser;
            const { data: existingUser } = await supabase
                .from('users')
                .select('id')
                .eq('auth_id', data.user.id)
                .single();

            if(existingUser) {
                 const { data: updated, error: updateError } = await supabase
                    .from('users')
                    .update({ name: resolvedName, email: data.user.email, role_id: roleData.id })
                    .eq('auth_id', data.user.id)
                    .select(`id, name, role_id, roles ( name )`)
                    .single();
                 if (updateError) return res.status(401).json({ error: updateError.message });
                 createdUser = updated;
            } else {
                 const { data: inserted, error: insertError } = await supabase
                    .from('users')
                    .insert([{ auth_id: data.user.id, name: resolvedName, email: data.user.email, role_id: roleData.id }])
                    .select(`id, name, role_id, roles ( name )`)
                    .single();
                 if (insertError) return res.status(401).json({ error: insertError.message });
                 createdUser = inserted;
            }

            userData = createdUser;
        }

        res.status(200).json({
            message: 'Login successful',
            user: {
                id: userData.id, // Profile ID pendek (SERIAL)
                auth_id: data.user.id, // Supabase Auth UUID
                email: data.user.email,
                name: userData.name,
                role: userData.roles?.name || resolvedRole
            },
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

        // Ambil detail role/nama beserta tabel join roles
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select(`
                id,
                name,
                roles ( name )
            `)
            .eq('auth_id', user.id)
            .single();

        if (userError || !userData) {
            return res.status(404).json({ error: 'Profil user tidak ditemukan.' });
        }

        res.status(200).json({
            user: {
                id: userData.id,
                auth_id: user.id,
                email: user.email,
                name: userData.name,
                role: userData.roles?.name
            }
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