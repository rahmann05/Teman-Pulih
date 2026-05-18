const db = require('../config/db');
const { resolveTargetPatientId } = require('../helpers/patientAccess');

const getMessages = async (userId, otherUserId) => {
    // Verify they are connected (or it's themselves if debugging, but usually it's caregiver <-> patient)
    // Check if relation exists
    const relationQuery = `
        SELECT id FROM family_relations 
        WHERE ((patient_id = $1 AND caregiver_id = $2) OR (patient_id = $2 AND caregiver_id = $1)) 
        AND status = 'accepted'
    `;
    const { rows: relationRows } = await db.query(relationQuery, [userId, otherUserId]);
    
    if (relationRows.length === 0) {
        throw Object.assign(new Error('Anda tidak memiliki akses chat dengan pengguna ini.'), { statusCode: 403 });
    }

    const query = `
        SELECT id, sender_id, receiver_id, content, created_at
        FROM direct_messages
        WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)
        ORDER BY created_at ASC
    `;
    const { rows } = await db.query(query, [userId, otherUserId]);
    return rows;
};

const sendMessage = async (senderId, receiverId, content) => {
    if (!content || !content.trim()) {
        throw Object.assign(new Error('Pesan tidak boleh kosong.'), { statusCode: 400 });
    }

    // Verify relation
    const relationQuery = `
        SELECT id FROM family_relations 
        WHERE ((patient_id = $1 AND caregiver_id = $2) OR (patient_id = $2 AND caregiver_id = $1)) 
        AND status = 'accepted'
    `;
    const { rows: relationRows } = await db.query(relationQuery, [senderId, receiverId]);
    
    if (relationRows.length === 0) {
        throw Object.assign(new Error('Anda tidak memiliki akses chat dengan pengguna ini.'), { statusCode: 403 });
    }

    const query = `
        INSERT INTO direct_messages (sender_id, receiver_id, content)
        VALUES ($1, $2, $3)
        RETURNING id, sender_id, receiver_id, content, created_at
    `;
    const { rows } = await db.query(query, [senderId, receiverId, content]);
    return rows[0];
};

module.exports = { getMessages, sendMessage };
