const { supabase } = require('../config/db');
const { emailRegex } = require('../helpers/validation');
const { normalizePhone, phoneRegex } = require('../helpers/phone');
const { cacheGet, cacheSet } = require('../helpers/cache');

const register = async (name, email, phone, password) => {
    const normalizedEmail = email?.trim().toLowerCase();
    const normalizedName = name?.trim();
    const normalizedPhone = normalizePhone(phone?.trim());

    if (!normalizedEmail || !password || !normalizedName || !normalizedPhone) {
        throw Object.assign(new Error('Data registrasi tidak lengkap'), { statusCode: 400 });
    }
    if (!emailRegex.test(normalizedEmail)) {
        throw Object.assign(new Error('Format email tidak valid'), { statusCode: 400 });
    }
    if (!phoneRegex.test(normalizedPhone)) {
        throw Object.assign(new Error('Format nomor telepon tidak valid'), { statusCode: 400 });
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: { data: { name: normalizedName, phone: normalizedPhone } },
    });
    if (authError) throw authError;

    const { data: userData } = await supabase
        .from('users')
        .select('id, name, email')
        .eq('auth_id', authData.user.id)
        .single();

    const finalUser = userData || { auth_id: authData.user.id, email: authData.user.email, name: normalizedName };
    return { user: finalUser, session: authData.session };
};

const login = async (identifier, password, role) => {
    const normalizedIdentifier = identifier?.trim();
    const normalizedRole = role?.trim().toLowerCase();

    if (!normalizedIdentifier || !password) {
        throw Object.assign(new Error('Email/No. Telepon dan kata sandi wajib diisi'), { statusCode: 400 });
    }

    const isEmail = emailRegex.test(normalizedIdentifier.toLowerCase());
    const normalizedPhone = normalizePhone(normalizedIdentifier);
    let resolvedEmail = isEmail ? normalizedIdentifier.toLowerCase() : null;

    if (!isEmail) {
        if (!phoneRegex.test(normalizedPhone)) {
            throw Object.assign(new Error('Format nomor telepon tidak valid'), { statusCode: 400 });
        }
        const { data: phoneOwner, error: phoneLookupError } = await supabase
            .from('profiles')
            .select('user_id, phone, users ( id, auth_id, email, name )')
            .eq('phone', normalizedPhone)
            .single();
        if (phoneLookupError || !phoneOwner?.users?.email) {
            throw Object.assign(new Error('Nomor telepon belum terdaftar'), { statusCode: 404 });
        }
        resolvedEmail = phoneOwner.users.email;
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email: resolvedEmail, password });
    if (error) throw error;

    let { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, name, email')
        .eq('auth_id', data.user.id)
        .single();

    if (userError || !userData) {
        const resolvedName = data.user?.user_metadata?.name || data.user?.email?.split('@')[0] || 'User';
        const { data: inserted } = await supabase
            .from('users')
            .insert([{ auth_id: data.user.id, name: resolvedName, email: data.user.email }])
            .select('id, name, email')
            .single();
        userData = inserted;
    }

    // Clear chat history on login
    try {
        await supabase.from('chat_history').delete().eq('user_id', userData.id);
        console.log(`[DB] Chat history cleared on login for user ID: ${userData.id}`);
    } catch (dbErr) {
        console.error('[DB] Gagal membersihkan riwayat chat saat login:', dbErr.message);
    }

    const allowedRoles = ['patient', 'caregiver'];
    const activeRole = normalizedRole && allowedRoles.includes(normalizedRole) ? normalizedRole : 'patient';

    return {
        user: { id: userData.id, auth_id: data.user.id, email: data.user.email, name: userData.name, role: activeRole },
        allowed_roles: allowedRoles,
        token: data.session.access_token,
        refresh_token: data.session.refresh_token,
    };
};

const oauthLogin = async (access_token, role) => {
    const normalizedRole = role?.trim().toLowerCase() || 'patient';

    if (!access_token) throw Object.assign(new Error('Access token wajib disertakan.'), { statusCode: 400 });

    const { data: { user }, error: authError } = await supabase.auth.getUser(access_token);
    if (authError || !user) throw Object.assign(new Error('Token tidak valid atau kedaluwarsa.'), { statusCode: 401 });

    const { createClient } = require('@supabase/supabase-js');
    const userSupabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: `Bearer ${access_token}` } },
    });

    let { data: userData, error: userError } = await userSupabase
        .from('users').select('id, name, email').eq('auth_id', user.id).single();

    if (userError || !userData) {
        const resolvedName = user.user_metadata?.name || user.email?.split('@')[0] || 'User';
        const { data: inserted, error: insertError } = await userSupabase
            .from('users')
            .insert([{ auth_id: user.id, name: resolvedName, email: user.email }])
            .select('id, name, email').single();
        if (insertError) throw insertError;
        userData = inserted;
    }

    const { data: roleData, error: roleLookupError } = await userSupabase
        .from('roles').select('id').eq('name', normalizedRole).single();

    if (!roleLookupError && roleData) {
        const { data: existingUserRole } = await userSupabase
            .from('user_roles').select('role_id').eq('user_id', userData.id).eq('role_id', roleData.id).single();
        if (!existingUserRole) {
            await userSupabase.from('user_roles').insert([{ user_id: userData.id, role_id: roleData.id }]);
        }
    }

    const { data: profileData } = await userSupabase.from('profiles').select('id').eq('user_id', userData.id).single();
    if (!profileData) {
        await userSupabase.from('profiles').insert([{ user_id: userData.id }]);
    }

    const { data: userRoles } = await userSupabase
        .from('user_roles').select('roles (name)').eq('user_id', userData.id);
    const allowedRoles = userRoles?.map(ur => ur.roles.name) || [normalizedRole];

    // Clear chat history on OAuth login
    try {
        await userSupabase.from('chat_history').delete().eq('user_id', userData.id);
        console.log(`[DB] Chat history cleared on OAuth login for user ID: ${userData.id}`);
    } catch (dbErr) {
        console.error('[DB] Gagal membersihkan riwayat chat saat OAuth login:', dbErr.message);
    }

    return {
        user: { id: userData.id, auth_id: user.id, email: user.email, name: userData.name, role: normalizedRole },
        allowed_roles: allowedRoles,
        token: access_token,
    };
};

const getMe = async (user) => {
    const cacheKey = `auth_me:${user.id}:${user.role || 'patient'}`;
    const cached = await cacheGet(cacheKey);
    if (cached) {
        console.log(`[REDIS] Auth Data ditarik dari Cache - User ID: ${user.id}`);
        return cached;
    }

    const responseData = {
        user: { id: user.id, auth_id: user.auth_id, email: user.email, name: user.name, role: user.role || 'patient' },
        allowed_roles: user.allowed_roles || ['patient', 'caregiver'],
    };
    await cacheSet(cacheKey, responseData, 7200);
    return responseData;
};

const refreshToken = async (refresh_token) => {
    if (!refresh_token) throw Object.assign(new Error('Refresh token wajib disertakan.'), { statusCode: 400 });
    const { data, error } = await supabase.auth.refreshSession({ refresh_token });
    if (error) {
        // If refresh fails, it could mean the token is invalid or expired.
        // It's hard to clear chat history here without userId, but the frontend should ideally call /logout.
        throw Object.assign(new Error('Sesi kedaluwarsa, silakan login kembali.'), { statusCode: 401 });
    }
    return { token: data.session.access_token, refresh_token: data.session.refresh_token };
};

const logout = async (user) => {
    if (!user || !user.id) return;
    
    // Hapus chat history di database
    try {
        await supabase.from('chat_history').delete().eq('user_id', user.id);
        console.log(`[DB] Chat history cleared on logout for user ID: ${user.id}`);
    } catch (err) {
        console.error('[DB] Gagal membersihkan riwayat chat saat logout:', err.message);
    }
    
    // (Opsional) Supabase sign out
    // await supabase.auth.admin.signOut(user.auth_id); // membutuhkan service role, kita skip saja yang penting history bersih
};

module.exports = { register, login, oauthLogin, getMe, refreshToken, logout };
