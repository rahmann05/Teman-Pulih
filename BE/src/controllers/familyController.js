const familyService = require('../services/familyService');
const { getSupabaseClient } = require('../helpers/supabase');

const inviteFamily = async (req, res, next) => {
    try {
        const supabase = getSupabaseClient(req);
        const result = await familyService.invite(req.user, supabase, req.body.identifier);
        res.status(200).json(result);
    } catch (err) {
        next(err);
    }
};

const getFamilyMembers = async (req, res, next) => {
    try {
        const supabase = getSupabaseClient(req);
        const members = await familyService.getMembers(req.user, supabase);
        res.status(200).json({ members });
    } catch (err) {
        next(err);
    }
};

module.exports = { inviteFamily, getFamilyMembers };
