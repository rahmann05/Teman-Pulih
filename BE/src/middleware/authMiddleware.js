const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { supabase, createSupabaseClient } = require('../config/db');

const authenticateToken = (req, res, next) => {
    // Ambil token dari header Authorization: Bearer <token>
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Akses ditolak, token tidak tersedia' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Menyimpan data user (id, role) ke request
        next();
    } catch (error) {
        return res.status(403).json({ message: 'Token tidak valid atau kedaluwarsa' });
    }
};

const authorizeRole = (roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Anda tidak memiliki izin untuk mengakses resource ini' });
        }
        next();
    };
};

const resolveActiveRole = async (userId, requestedRole) => {
    // Sesuai permintaan: User bebas memilih login sebagai pasien atau caregiver.
    // Kita tidak lagi menggunakan tabel roles.
    const allowedRoles = ['patient', 'caregiver'];

    const activeRole = requestedRole && allowedRoles.includes(requestedRole)
        ? requestedRole
        : 'patient';

    return { activeRole, allowedRoles };
};

const requireAuth = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Access denied. No token provided.' });
        }

        // 1. Verifikasi token via Supabase Auth
        const { data: { user }, error } = await supabase.auth.getUser(token);
        
        if (error || !user) {
            return res.status(401).json({ error: 'Invalid or expired token.' });
        }

        // 2. Cari user di tabel public.users menggunakan DB Pool (Bypass RLS)
        const userQuery = 'SELECT id, auth_id, name, email FROM users WHERE auth_id = $1';
        const { rows: userRows } = await db.query(userQuery, [user.id]);
        const appUser = userRows[0];

        if (!appUser) {
            return res.status(404).json({ error: 'Profil user tidak ditemukan.' });
        }

        const requestedRoleRaw = req.headers['x-active-role'];
        const requestedRole = typeof requestedRoleRaw === 'string'
            ? requestedRoleRaw.trim().toLowerCase()
            : null;

        const { activeRole, allowedRoles, error: roleError } = await resolveActiveRole(
            appUser.id,
            requestedRole && ['patient', 'caregiver'].includes(requestedRole) ? requestedRole : null
        );

        if (roleError) {
            return res.status(403).json({ error: roleError, allowed_roles: allowedRoles });
        }

        // Simpan data user internal agar controller memakai primary key database.
        req.user = {
            id: appUser.id,
            auth_id: appUser.auth_id,
            email: appUser.email || user.email,
            name: appUser.name,
            role: activeRole,
            allowed_roles: allowedRoles
        };
        req.supabase = createSupabaseClient(token);
        next();
    } catch (err) {
        console.error('Auth Middleware Error:', err.message);
        res.status(500).json({ error: 'Internal server error during authentication.' });
    }
};

module.exports = { authenticateToken, authorizeRole, requireAuth };