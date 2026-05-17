const db = require('../config/db');

const canAccessPatient = async (caregiverId, patientId) => {
    const query = 'SELECT id FROM family_relations WHERE caregiver_id = $1 AND patient_id = $2 AND status = $3 LIMIT 1';
    const { rows } = await db.query(query, [caregiverId, patientId, 'accepted']);
    return rows.length > 0;
};

const resolveTargetPatientId = async (user, candidatePatientId) => {
    if (!candidatePatientId) return { patientId: user.id };

    if (user.role === 'caregiver') {
        const allowed = await canAccessPatient(user.id, candidatePatientId);
        if (!allowed) {
            return { error: 'Anda tidak memiliki akses ke pasien ini.' };
        }
        return { patientId: candidatePatientId };
    }

    if (String(candidatePatientId) !== String(user.id)) {
        return { error: 'Anda tidak memiliki akses ke pasien ini.' };
    }

    return { patientId: user.id };
};

module.exports = { canAccessPatient, resolveTargetPatientId };
