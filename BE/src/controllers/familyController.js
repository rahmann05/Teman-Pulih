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

const createComplaint = async (req, res, next) => {
    try {
        const supabase = getSupabaseClient(req);
        const result = await familyService.createComplaint(req.user, supabase, req.body);
        res.status(201).json(result);
    } catch (err) {
        next(err);
    }
};

const getComplaints = async (req, res, next) => {
    try {
        const supabase = getSupabaseClient(req);
        const result = await familyService.getComplaints(req.user, supabase, req.query.patientId);
        res.status(200).json(result);
    } catch (err) {
        next(err);
    }
};

const createCheckin = async (req, res, next) => {
    try {
        const supabase = getSupabaseClient(req);
        const result = await familyService.createCheckin(req.user, supabase, req.body);
        res.status(201).json(result);
    } catch (err) {
        next(err);
    }
};

const getCheckins = async (req, res, next) => {
    try {
        const supabase = getSupabaseClient(req);
        const limit = req.query.limit ? parseInt(req.query.limit) : 7;
        const result = await familyService.getCheckins(req.user, supabase, req.query.patientId, limit);
        res.status(200).json(result);
    } catch (err) {
        next(err);
    }
};

const getTodayCheckinStatus = async (req, res, next) => {
    try {
        const supabase = getSupabaseClient(req);
        const result = await familyService.getTodayCheckinStatus(req.user, supabase);
        res.status(200).json(result);
    } catch (err) {
        next(err);
    }
};

module.exports = { 
    inviteFamily, 
    getFamilyMembers,
    createComplaint,
    getComplaints,
    createCheckin,
    getCheckins,
    getTodayCheckinStatus
};

