const profileService = require('../services/profileService');
const { getSupabaseClient } = require('../helpers/supabase');

const getProfile = async (req, res, next) => {
    try {
        const data = await profileService.getProfile(req.user.id);
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
