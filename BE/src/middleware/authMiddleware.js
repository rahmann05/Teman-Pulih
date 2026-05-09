const jwt = require('jsonwebtoken');
const { supabase } = require('../config/db');

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

const requireAuth = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Access denied. No token provided.' });
        }

        const { data: { user }, error } = await supabase.auth.getUser(token);
        
        if (error || !user) {
            return res.status(401).json({ error: 'Invalid or expired token.' });
        }

        const { data: appUser, error: appUserError } = await supabase
            .from('users')
            .select(`
                id,
                auth_id,
                name,
                email,
                roles ( name )
            `)
            .eq('auth_id', user.id)
            .single();

        if (appUserError || !appUser) {
            return res.status(404).json({ error: 'Profil user tidak ditemukan.' });
        }

        // Simpan data user internal agar controller memakai primary key database.
        req.user = {
            id: appUser.id,
            auth_id: appUser.auth_id,
            email: appUser.email || user.email,
            name: appUser.name,
            role: appUser.roles?.name,
        };
        next();
    } catch (err) {
        res.status(500).json({ error: 'Internal server error during authentication.' });
    }
};

module.exports = { authenticateToken, authorizeRole, requireAuth };