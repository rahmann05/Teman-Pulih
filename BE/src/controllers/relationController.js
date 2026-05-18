const relationService = require('../services/relationService');
const { getSupabaseClient } = require('../helpers/supabase');

const requestAccess = async (req, res, next) => {
    try {
        const supabase = getSupabaseClient(req);
        const relation = await relationService.requestAccess(req.user.id, supabase, req.body.identifier);
        res.status(200).json({ message: 'Permintaan akses berhasil dikirim ke pasien.', relation });
    } catch (err) { next(err); }
};

const approveAccess = async (req, res, next) => {
    try {
        const supabase = getSupabaseClient(req);
        const { relation_id, status, verification_code } = req.body;
        const relation = await relationService.approveAccess(req.user.id, supabase, relation_id, status, verification_code);
        res.status(200).json({ message: `Permintaan akses telah di-${status === 'accepted' ? 'setujui' : 'tolak'}.`, relation });
    } catch (err) { next(err); }
};

const getPendingRequests = async (req, res, next) => {
    try {
        const supabase = getSupabaseClient(req);
        const requests = await relationService.getPendingRequests(req.user.id, supabase);
        res.status(200).json({ requests });
    } catch (err) { next(err); }
};

module.exports = { requestAccess, approveAccess, getPendingRequests };