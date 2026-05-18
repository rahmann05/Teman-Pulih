const { GoogleGenerativeAI } = require('@google/generative-ai');
const { chromaClient } = require('../config/chroma.js');
const { cacheGet, cacheSet } = require('../helpers/cache');
const medicationService = require('./medicationService');

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
        privateContext = `\n--- DATA MEDIS PRIVAT (${patientProfileName}) ---
\n(Informasi ini terenkripsi dan eksklusif. Hanya Anda dan Pasien/Caregiver ini yang mengetahuinya)\nDaftar Obat Sedang Dikonsumsi Pasien saat ini:\n`;
        privateContext += patientMedications.map(m => `- ${m.name} (${m.dosage}): ${m.instructions}`).join('\n');
        routineMedicationsForSearch += ' ' + patientMedications.map(m => m.name).join(' ');
    }

    const result = { emrContext, routineMedicationsForSearch, privateContext, targetPatientId };
    await cacheSet(cacheKey, result, 21600);
    return result;
};

const buildRagContext = async (searchTerms, routineMedications, user = null, supabase = null, targetPatientId = null) => {
    const primaryQuery = (searchTerms && searchTerms.length > 0) ? searchTerms[0] : '';
    if (primaryQuery) {
        try {
            const chromaResult = await medicationService.searchChroma(primaryQuery, user, supabase, targetPatientId);
            if (chromaResult) {
                const obatItems = chromaResult.obat || [];
                const kondisiItems = chromaResult.kondisi || [];

                let ragContext = '';
                if (kondisiItems.length > 0) {
                    const kondisiText = kondisiItems.slice(0, 3).map((k) => k.content).filter(Boolean).join('\n---\n');
                    if (kondisiText) ragContext += `=== REFERENSI KONDISI MEDIS ===\n${kondisiText}\n\n`;
                }

                if (obatItems.length > 0) {
                    const obatText = obatItems.slice(0, 5).map((o) => {
                        const parts = [
                            `Informasi Obat: ${o.nama_obat}`,
                            o.kategori ? `Kategori: ${o.kategori}` : '',
                            o.indikasi ? `Indikasi: ${o.indikasi}` : '',
                            o.komposisi ? `Komposisi: ${o.komposisi}` : '',
                            o.dosis ? `Dosis: ${o.dosis}` : '',
                            o.aturan_pakai ? `Aturan Pakai: ${o.aturan_pakai}` : '',
                            o.efek_samping ? `Efek Samping: ${o.efek_samping}` : ''
                        ].filter(Boolean);
                        return parts.join('\n');
                    }).join('\n---\n');
                    if (obatText) ragContext += `=== REFERENSI OBAT & INTERAKSI ===\n${obatText}\n\n`;
                }

                if (ragContext) {
                    console.log(`[RAG] Referensi dari searchChroma: ${obatItems.length} Obat, ${kondisiItems.length} Kondisi.`);
                    return ragContext;
                }
            }
        } catch (e) {
            console.warn('[RAG] Fallback ke query langsung ChromaDB:', e.message);
        }
    }

    const [penyakitCol, obatCol] = await Promise.all([
        chromaClient.getCollection({ name: process.env.CHROMA_DATABASE || 'RAG-TemanPulih' }),
        chromaClient.getCollection({ name: process.env.CHROMA_DATABASE_DRUGS || 'RAG-TemanPulih-Obat' }),
    ]);

    const obatQueries = [...searchTerms];
    if (routineMedications && routineMedications.length > 2) obatQueries.push(routineMedications);

    const [hasilPenyakit, hasilObat] = await Promise.allSettled([
        penyakitCol.query({ queryTexts: searchTerms, nResults: 2 }),
        obatCol.query({ queryTexts: obatQueries, nResults: 3 }),
    ]);

    const extractDocs = (r) => {
        if (r.status !== 'fulfilled' || !r.value?.documents) return [];
        return [...new Set(r.value.documents.flat().filter(d => d))];
    };

    const docsPenyakit = extractDocs(hasilPenyakit).slice(0, 2);
    const docsObat = extractDocs(hasilObat).slice(0, 3);

    let ragContextFormatted = '';
    if (docsPenyakit.length > 0) ragContextFormatted += `=== REFERENSI KONDISI MEDIS ===\n${docsPenyakit.join('\n---\n')}\n\n`;
    if (docsObat.length > 0) ragContextFormatted += `=== REFERENSI OBAT & INTERAKSI ===\n${docsObat.join('\n---\n')}\n\n`;
    if (ragContextFormatted) console.log(`[RAG] Referensi paralel berhasil: ${docsPenyakit.length} Penyakit, ${docsObat.length} Obat.`);

    return ragContextFormatted;
};

module.exports = { sanitizeInput, normalizeHistory, getHistory, clearHistory, getEmrContext, buildRagContext, genAI };
