const profileService = require('../services/profileService');
const { getSupabaseClient } = require('../helpers/supabase');

const db = require('../config/db');

const getProfile = async (req, res, next) => {
    try {
        const userId = req.query.patientId ? parseInt(req.query.patientId, 10) : req.user.id;
        
        // Secure access: caregivers can only view profiles of patients connected to them
        if (req.query.patientId && req.user.role === 'caregiver') {
            const { rows: rels } = await db.query(
                "SELECT id FROM family_relations WHERE caregiver_id = $1 AND patient_id = $2 AND status = 'accepted'",
                [req.user.id, userId]
            );
            if (rels.length === 0) {
                return res.status(403).json({ error: 'Anda tidak memiliki akses ke profil pasien ini.' });
            }
        } else if (req.query.patientId && req.user.id !== userId) {
            return res.status(403).json({ error: 'Akses ditolak.' });
        }

        const data = await profileService.getProfile(userId);
        res.status(200).json(data);
    } catch (err) {
        next(err);
    }
};

const updateProfile = async (req, res, next) => {
    try {
        const supabase = getSupabaseClient(req);
        const data = await profileService.updateProfile(req.user.id, supabase, { ...req.body });
        res.status(200).json({ message: 'Profile updated successfully', data });
    } catch (err) {
        next(err);
    }
};

module.exports = { getProfile, updateProfile };
