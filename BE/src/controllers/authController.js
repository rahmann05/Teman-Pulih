const { supabase } = require('../config/db');
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

        // 1. Daftarkan user ke Supabase Auth dengan Metadata
        // Trigger on_auth_user_created akan menangani insert ke tabel public.users & profiles
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: normalizedEmail,
            password: password,
            options: {
                data: {
                    name: normalizedName,
                    phone: normalizedPhone
                }
            }
        });

        if (authError) throw authError;

        // 2. Ambil profil yang baru dibuat oleh trigger (untuk mengembalikan ID serial)
        const { data: userData } = await supabase
            .from('users')
            .select('id, name, email')
            .eq('auth_id', authData.user.id)
            .single();

        const finalUser = userData || { 
            auth_id: authData.user.id, 
            email: authData.user.email, 
            name: normalizedName 
        };

        res.status(201).json({
            message: 'User registered successfully. You can now login as a Patient or Caregiver.',
            user: finalUser,
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

        // 2. Ambil user internal
        let { data: userData, error: userError } = await supabase
            .from('users')
            .select('id, name, email')
            .eq('auth_id', data.user.id)
            .single();

        if (userError || !userData) {
             // Re-sync if missing for some reason
            const resolvedName = data.user?.user_metadata?.name || data.user?.email?.split('@')[0] || 'User';
            const { data: inserted } = await supabase
                .from('users')
                .insert([{ auth_id: data.user.id, name: resolvedName, email: data.user.email }])
                .select('id, name, email')
                .single();
            userData = inserted;
        }

        // Setiap user diizinkan login sebagai patient atau caregiver
        const allowedRoles = ['patient', 'caregiver'];
        const activeRole = normalizedRole && allowedRoles.includes(normalizedRole)
            ? normalizedRole
            : 'patient';

        res.status(200).json({
            message: 'Berhasil login',
            user: finalUser,
            session: authData.session,
            access_token: authData.session.access_token
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// OAuth Login
const oauthLogin = async (req, res) => {
    try {
        const { access_token, role } = req.body;
        const normalizedRole = role?.trim().toLowerCase() || 'patient';

        console.log('--- OAuth Login Attempt ---');
        console.log('Role requested:', normalizedRole);

        if (!access_token) {
            return res.status(400).json({ error: 'Access token wajib disertakan.' });
        }

        // 1. Verifikasi token via Supabase
        const { data: { user }, error: authError } = await supabase.auth.getUser(access_token);
        
        if (authError || !user) {
            console.error('Auth verification error:', authError);
            throw new Error('Token tidak valid atau kedaluwarsa.');
        }

        console.log('Authenticated User:', user.email);

        // Create a scoped client with the user's token to satisfy RLS
        const { createClient } = require('@supabase/supabase-js');
        const userSupabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
            global: { headers: { Authorization: `Bearer ${access_token}` } }
        });

        // 2. Pastikan user ada di tabel public.users
        let { data: userData, error: userError } = await userSupabase
            .from('users')
            .select('id, name, email')
            .eq('auth_id', user.id)
            .single();

        if (userError || !userData) {
            console.log('User not found in public.users, creating...');
            const resolvedName = user.user_metadata?.name || user.email?.split('@')[0] || 'User';
            // This insert should now work because we're using the user's token
            const { data: inserted, error: insertError } = await userSupabase
                .from('users')
                .insert([{ auth_id: user.id, name: resolvedName, email: user.email }])
                .select('id, name, email')
                .single();
            
            if (insertError) {
                console.error('Failed to create user:', insertError);
                throw insertError;
            }
            userData = inserted;
        }

        console.log('Internal User Data:', userData);

        // 3. Pastikan role terdaftar di user_roles
        const { data: roleData, error: roleLookupError } = await userSupabase
            .from('roles')
            .select('id')
            .eq('name', normalizedRole)
            .single();

        if (roleLookupError || !roleData) {
            console.error('Role lookup error:', roleLookupError);
            // Don't throw, just use a default or log
        } else {
            console.log('Syncing role:', normalizedRole, 'ID:', roleData.id);
            // Cek apakah user sudah punya role ini
            const { data: existingUserRole } = await userSupabase
                .from('user_roles')
                .select('role_id')
                .eq('user_id', userData.id)
                .eq('role_id', roleData.id)
                .single();

            if (!existingUserRole) {
                console.log('Adding new role to user');
                await userSupabase
                    .from('user_roles')
                    .insert([{ user_id: userData.id, role_id: roleData.id }]);
            }
        }

        // 4. Pastikan profile ada
        const { data: profileData } = await userSupabase
            .from('profiles')
            .select('id')
            .eq('user_id', userData.id)
            .single();

        if (!profileData) {
            console.log('Creating missing profile');
            await userSupabase
                .from('profiles')
                .insert([{ user_id: userData.id }]);
        }

        // 5. Ambil semua role yang dimiliki user untuk response
        const { data: userRoles } = await userSupabase
            .from('user_roles')
            .select('roles (name)')
            .eq('user_id', userData.id);
        
        const allowedRoles = userRoles?.map(ur => ur.roles.name) || [normalizedRole];

        console.log('OAuth Login Success for:', user.email);

        res.status(200).json({
            message: 'OAuth Login successful',
            user: {
                id: userData.id,
                auth_id: user.id,
                email: user.email,
                name: userData.name,
                role: normalizedRole
            },
            allowed_roles: allowedRoles,
            token: access_token
        });
    } catch (error) {
        console.error('OAuth Login Error:', error);
        res.status(401).json({ error: error.message });
    }
};

// Get Me
const getMe = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // REDIS CACHE: Cek cache 'me' untuk user ini
        const cacheKey = `auth_me:${req.user.id}:${req.user.role || 'patient'}`;
        if (redis.status === 'ready') {
            const cachedData = await redis.get(cacheKey);
            if (cachedData) {
                console.log(`[REDIS] Auth Data ditarik dari Cache - User ID: ${req.user.id}`);
                return res.status(200).json(JSON.parse(cachedData));
            }
        }

        const allowedRoles = req.user.allowed_roles || ['patient', 'caregiver'];
        const activeRole = req.user.role || 'patient';

        const responseData = {
            user: {
                id: req.user.id,
                auth_id: req.user.auth_id,
                email: req.user.email,
                name: req.user.name,
                role: activeRole
            },
            allowed_roles: allowedRoles
        };

        // SIMPAN KE REDIS: Set kedaluwarsa 2 jam
        if (redis.status === 'ready') {
            await redis.set(cacheKey, JSON.stringify(responseData), 'EX', 7200);
        }

        res.status(200).json(responseData);
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
        const { data, error } = await supabase.auth.refreshSession({ refresh_token });
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

module.exports = { register, login, oauthLogin, getMe, refreshToken };