const { GoogleGenerativeAI } = require('@google/generative-ai');
const { cacheGet, cacheSet } = require('../helpers/cache');


const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'MISSING_API_KEY');

const sanitizeInput = (text) => text ? text.replace(/\s+/g, ' ').trim().substring(0, 700) : '';

const normalizeHistory = (pastChats) => {
    const validHistory = [];
    let expectedRole = 'user';
    for (const chat of pastChats) {
        const role = chat.sender === 'user' ? 'user' : 'model';
        if (role === expectedRole && chat.message.trim()) {
            validHistory.push({ role, parts: [{ text: chat.message }] });
            expectedRole = role === 'user' ? 'model' : 'user';
        }
    }
    if (validHistory.length > 0 && validHistory[validHistory.length - 1].role === 'user') {
        validHistory.pop();
    }
    return validHistory;
};

const getHistory = async (supabase, userId) => {
    const { data, error } = await supabase
        .from('chat_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });
    if (error) throw error;
    return data;
};

const clearHistory = async (supabase, userId) => {
    const { error } = await supabase.from('chat_history').delete().eq('user_id', userId);
    if (error) throw error;
};

const getEmrContext = async (supabase, user) => {
    const userId = user.id;
    const cacheKey = user.role === 'caregiver'
        ? `emr_profile:caregiver_${userId}`
        : `emr_profile:patient_${userId}`;

    const cached = await cacheGet(cacheKey);
    if (cached && cached.targetPatientId) {
        console.log(`[REDIS] EMR & Private Medications ditarik dari Cache (Super Cepat) - User ID: ${userId}`);
        return cached;
    }

    let targetPatientId = userId;
    let patientProfileName = user.name || 'Pasien';

    if (user.role === 'caregiver') {
        const { data: rel } = await supabase
            .from('family_relations')
            .select('patient_id, users!family_relations_patient_id_fkey(name)')
            .eq('caregiver_id', userId)
            .eq('status', 'accepted')
            .single();
        if (rel) {
            targetPatientId = rel.patient_id;
            patientProfileName = rel.users?.name || 'Pasien Anda';
        }
    }

    let emrContext = '';
    let routineMedicationsForSearch = '';
    let privateContext = '';

    const { data: userProfile } = await supabase
        .from('profiles').select('*').eq('user_id', targetPatientId).single();

    if (userProfile) {
        routineMedicationsForSearch = userProfile.routine_medications || '';
        emrContext = `[REKAM MEDIS PASIEN (${patientProfileName})]
- Gol. Darah: ${userProfile.blood_type || '-'}
- Tensi Normal: ${userProfile.blood_pressure_range || '-'}
- Tinggi/Berat: ${userProfile.height || '-'}
- Alergi: ${userProfile.allergies || '-'}
- Penyakit Kronis: ${userProfile.chronic_conditions || '-'}
- Penyakit Terdahulu: ${userProfile.past_illnesses || '-'}
- Penyakit Terakhir: ${userProfile.last_illness || '-'}
- Riwayat Operasi: ${userProfile.surgeries_history || '-'}
- OBAT RUTIN: ${routineMedicationsForSearch || '-'}
`;
    }

    const { data: patientMedications } = await supabase
        .from('medications').select('name, dosage, instructions').eq('user_id', targetPatientId);

    if (patientMedications && patientMedications.length > 0) {
        privateContext = `\n--- DATA MEDIS PRIVAT (${patientProfileName}) ---\n\n(Informasi ini privat dan eksklusif. Hanya Anda dan Pasien/Caregiver ini yang mengetahuinya)\nDaftar Obat Sedang Dikonsumsi Pasien saat ini:\n`;
        privateContext += patientMedications.map(m => `- ${m.name} (${m.dosage}): ${m.instructions}`).join('\n');
        routineMedicationsForSearch += ' ' + patientMedications.map(m => m.name).join(' ');
    }

    // Penyakit aktif terkini (illness_history)
    try {
        const { data: activeIllnesses } = await supabase
            .from('illness_history')
            .select('illness_name, started_at, notes')
            .eq('patient_id', targetPatientId)
            .eq('is_active', true)
            .order('started_at', { ascending: false })
            .limit(5);

        if (activeIllnesses && activeIllnesses.length > 0) {
            const illnessList = activeIllnesses
                .map(i => `- ${i.illness_name} (sejak ${i.started_at})${i.notes ? ': ' + i.notes : ''}`)
                .join('\n');
            emrContext += `\n[PENYAKIT AKTIF SAAT INI]\n${illnessList}\n`;
        }
    } catch (_) { /* tabel mungkin belum ada, abaikan */ }

    // 3 check-in kondisi harian terakhir
    try {
        const { data: recentCheckins } = await supabase
            .from('daily_checkins')
            .select('checkin_date, condition_rating, symptoms_felt')
            .eq('patient_id', targetPatientId)
            .order('checkin_date', { ascending: false })
            .limit(3);

        if (recentCheckins && recentCheckins.length > 0) {
            const ratingLabels = ['', 'Sangat Buruk', 'Buruk', 'Cukup', 'Baik', 'Sangat Baik'];
            const checkinList = recentCheckins
                .map(c => `- ${c.checkin_date}: Kondisi ${ratingLabels[c.condition_rating] || c.condition_rating}/5, Gejala: ${c.symptoms_felt || 'tidak ada'}`)
                .join('\n');
            emrContext += `\n[CHECK-IN KONDISI TERBARU]\n${checkinList}\n`;
        }
    } catch (_) { /* tabel mungkin belum ada, abaikan */ }

    const result = { emrContext, routineMedicationsForSearch, privateContext, targetPatientId };
    await cacheSet(cacheKey, result, 21600);
    return result;
};

// buildRagContext is now in ragService.js and imported directly by chatbotController


module.exports = { sanitizeInput, normalizeHistory, getHistory, clearHistory, getEmrContext, genAI };
