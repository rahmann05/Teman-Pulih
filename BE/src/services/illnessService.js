const { cacheGet, cacheSet, cacheDel } = require('../helpers/cache');
const { resolveTargetPatientId } = require('../helpers/patientAccess');
const { chromaClient } = require('../config/chroma.js');

/**
 * Ambil riwayat penyakit pasien (aktif dan sudah sembuh)
 */
const getIllnessHistory = async (user, supabase, patientId) => {
    let targetPatientId = user.id;
    if (patientId) {
        const { patientId: resolvedId, error } = await resolveTargetPatientId(user, patientId);
        if (error) throw Object.assign(new Error(error), { statusCode: 403 });
        targetPatientId = resolvedId;
    }

    const cacheKey = `illness_history:${targetPatientId}`;
    const cached = await cacheGet(cacheKey);
    if (cached) {
        console.log(`[REDIS] Illness history dari cache — patient ${targetPatientId}`);
        return cached;
    }

    const { data, error: fetchError } = await supabase
        .from('illness_history')
        .select('*')
        .eq('patient_id', targetPatientId)
        .order('started_at', { ascending: false });

    if (fetchError) throw fetchError;
    await cacheSet(cacheKey, data, 1800); // 30 menit TTL
    return data;
};

/**
 * Tambah penyakit baru
 */
const addIllness = async (user, supabase, { illness_name, started_at, notes, illness_info }) => {
    if (!illness_name || !illness_name.trim()) {
        throw Object.assign(new Error('Nama penyakit wajib diisi.'), { statusCode: 400 });
    }

    // Jika illness_info tidak diberikan, coba ambil dari Chroma
    let resolvedInfo = illness_info || null;
    if (!resolvedInfo) {
        try {
            resolvedInfo = await fetchIllnessInfoFromChroma(illness_name.trim());
        } catch (e) {
            console.warn('[CHROMA] Gagal ambil illness_info:', e.message);
        }
    }

    const { data, error } = await supabase
        .from('illness_history')
        .insert([{
            patient_id:   user.id,
            illness_name: illness_name.trim(),
            started_at:   started_at || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }),
            notes:        notes?.trim() || null,
            is_active:    true,
            illness_info: resolvedInfo,
        }])
        .select()
        .single();

    if (error) throw error;

    // Update field last_illness di profiles agar RAG / EMR tetap sinkron
    await supabase
        .from('profiles')
        .update({ last_illness: illness_name.trim() })
        .eq('user_id', user.id);

    await cacheDel(
        `illness_history:${user.id}`,
        `emr_profile:patient_${user.id}`,
        `emr_profile:caregiver_${user.id}`,
        `profile_data:${user.id}`
    );

    return data;
};

/**
 * Ambil info kondisi penyakit dari Chroma RAG
 */
const fetchIllnessInfoFromChroma = async (illnessName) => {
    try {
        const collectionName = process.env.CHROMA_DATABASE || 'RAG-TemanPulih';
        const condCol = await chromaClient.getCollection({ name: collectionName });
        if (!condCol) return null;

        const result = await condCol.query({ queryTexts: [illnessName], nResults: 3 });
        if (!result?.documents?.[0]?.length) return null;

        const docs = result.documents[0].filter(Boolean);
        if (docs.length === 0) return null;

        // Parse info dari dokumen kondisi
        const fullText = docs.join(' ');
        const extractField = (text, ...patterns) => {
            for (const pattern of patterns) {
                const regex = new RegExp(`${pattern}[:\\s]+([^\\n.]{10,200})`, 'i');
                const match = text.match(regex);
                if (match && match[1]?.trim()) return match[1].trim().substring(0, 300);
            }
            return null;
        };

        // Coba ambil nama obat terkait
        const obatMatch = fullText.match(/Obat Terkait[:\s]+([^\n.]+)/i);
        const obatTerkait = obatMatch ? obatMatch[1].trim() : null;

        return {
            indikasi:     extractField(fullText, 'Indikasi', 'Definisi', 'Pengertian', 'adalah penyakit'),
            gejala_umum:  extractField(fullText, 'Gejala', 'Tanda', 'Gejala Umum'),
            penanganan:   extractField(fullText, 'Penanganan', 'Pengobatan', 'Terapi', 'Tatalaksana'),
            obat_terkait: obatTerkait,
            peringatan:   extractField(fullText, 'Peringatan', 'Perhatian', 'Kontraindikasi'),
        };
    } catch (e) {
        console.warn('[CHROMA] fetchIllnessInfoFromChroma error:', e.message);
        return null;
    }
};

/**
 * Cari penyakit berdasarkan gejala atau nama penyakit (via Chroma RAG)
 */
const searchIllness = async (query) => {
    if (!query || query.trim().length < 2) return [];

    try {
        const collectionName = process.env.CHROMA_DATABASE || 'RAG-TemanPulih';
        const condCol = await chromaClient.getCollection({ name: collectionName });
        if (!condCol) return [];

        const result = await condCol.query({ queryTexts: [query.trim()], nResults: 8 });
        if (!result?.documents?.[0]?.length) return [];

        const suggestions = [];
        const seenNames = new Set();

        for (let i = 0; i < result.documents[0].length; i++) {
            const doc = result.documents[0][i];
            if (!doc) continue;

            // Coba ekstrak nama penyakit dari dokumen
            const namePatterns = [
                /^([A-Z][a-zA-Z\s/()-]{3,50})(?=\s*[:\n])/m,
                /Kondisi:\s*([\w\s/()-]{3,50})/i,
                /Penyakit:\s*([\w\s/()-]{3,50})/i,
                /([A-Z][a-z]+(?:\s+[A-Za-z]+){0,3})(?=\s+adalah)/,
            ];

            let name = null;
            for (const pattern of namePatterns) {
                const match = doc.match(pattern);
                if (match && match[1]?.trim().length >= 3) {
                    name = match[1].trim();
                    break;
                }
            }

            if (!name) continue;
            if (seenNames.has(name.toLowerCase())) continue;
            seenNames.add(name.toLowerCase());

            // Parse info singkat
            const extractShort = (text, ...patterns) => {
                for (const pattern of patterns) {
                    const regex = new RegExp(`${pattern}[:\\s]+([^\\n.]{5,150})`, 'i');
                    const match = text.match(regex);
                    if (match && match[1]?.trim()) return match[1].trim().substring(0, 150);
                }
                return null;
            };

            const obatMatch = doc.match(/Obat Terkait[:\s]+([^\n.]+)/i);

            suggestions.push({
                name,
                illness_info: {
                    indikasi:     extractShort(doc, 'Indikasi', 'Definisi', 'Pengertian'),
                    gejala_umum:  extractShort(doc, 'Gejala', 'Tanda', 'Gejala Umum'),
                    penanganan:   extractShort(doc, 'Penanganan', 'Pengobatan', 'Terapi'),
                    obat_terkait: obatMatch ? obatMatch[1].trim() : null,
                    peringatan:   extractShort(doc, 'Peringatan', 'Perhatian'),
                },
                distance: result.distances?.[0]?.[i] ?? null,
            });

            if (suggestions.length >= 5) break;
        }

        return suggestions;
    } catch (e) {
        console.warn('[CHROMA] searchIllness error:', e.message);
        return [];
    }
};

/**
 * Tandai penyakit sebagai sudah sembuh
 */
const markRecovered = async (user, supabase, illnessId) => {
    // Pastikan hanya pemilik yang bisa update
    const { data: existing } = await supabase
        .from('illness_history')
        .select('id, patient_id')
        .eq('id', illnessId)
        .eq('patient_id', user.id)
        .single();

    if (!existing) {
        throw Object.assign(new Error('Riwayat penyakit tidak ditemukan atau bukan milik Anda.'), { statusCode: 404 });
    }

    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });

    const { data, error } = await supabase
        .from('illness_history')
        .update({ is_active: false, recovered_at: today })
        .eq('id', illnessId)
        .eq('patient_id', user.id)
        .select()
        .single();

    if (error) throw error;

    await cacheDel(
        `illness_history:${user.id}`,
        `emr_profile:patient_${user.id}`,
        `emr_profile:caregiver_${user.id}`
    );

    return data;
};

module.exports = { getIllnessHistory, addIllness, markRecovered, searchIllness, fetchIllnessInfoFromChroma };
