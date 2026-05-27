const db = require('../config/db');
const { supabase } = require('../config/db');

/**
 * Get all notifications for the active user
 */
const getNotifications = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const role = req.user.role; // 'patient' or 'caregiver'
        
        let query = `
            SELECT * FROM notifications 
            WHERE user_id = $1 
        `;
        
        const params = [userId];
        
        if (role === 'caregiver') {
            query += ` AND type IN ('caregiver_late', 'caregiver_taken', 'medical_complaint', 'compliance_alert') `;
        } else {
            query += ` AND type IN ('reminder_10m', 'reminder_exact', 'patient_late') `;
        }
        
        query += ` ORDER BY created_at DESC `;
        
        const { rows } = await db.query(query, params);
        
        res.status(200).json({ data: rows });
    } catch (err) {
        next(err);
    }
};

/**
 * Mark all notifications for the active user as read
 */
const markAllAsRead = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;
        
        let query = `
            UPDATE notifications 
            SET is_read = true 
            WHERE user_id = $1
        `;
        
        const params = [userId];
        
        if (role === 'caregiver') {
            query += ` AND type IN ('caregiver_late', 'caregiver_taken', 'medical_complaint', 'compliance_alert') `;
        } else {
            query += ` AND type IN ('reminder_10m', 'reminder_exact', 'patient_late') `;
        }
        
        await db.query(query, params);
        
        res.status(200).json({ message: 'Semua notifikasi ditandai telah dibaca' });
    } catch (err) {
        next(err);
    }
};

/**
 * Mark a single notification as read
 */
const markAsRead = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const notificationId = req.params.id;

        const query = `
            UPDATE notifications 
            SET is_read = true 
            WHERE id = $1 AND user_id = $2
            RETURNING *
        `;
        const { rows } = await db.query(query, [notificationId, userId]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Notifikasi tidak ditemukan' });
        }

        res.status(200).json({ message: 'Notifikasi ditandai telah dibaca', data: rows[0] });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getNotifications,
    markAllAsRead,
    markAsRead
};
