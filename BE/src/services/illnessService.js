/**
 * illnessService.js — Illness history & RAG-based illness search
 *
 * Responsibilities:
 * - getIllnessHistory  : Fetch patient illness records from Supabase
 * - addIllness         : Insert new illness + fetch illness_info from ChromaDB
 * - markRecovered      : Mark an illness as recovered
 * - searchIllness      : Search ChromaDB for illness suggestions (metadata-first)
 * - fetchIllnessInfoFromChroma : Fetch full illness info by name from ChromaDB
 */

const { cacheGet, cacheSet, cacheDel } = require('../helpers/cache');
const { resolveTargetPatientId } = require('../helpers/patientAccess');
const {
    getChromaCollection,
    getDiseaseNames,
    fuzzyMatchName,
    getDocsByDiseaseName,
    searchAllDrugCollections,
    COLLECTIONS,
} = require('../helpers/chromaHelper');
const {
    parseIllnessContent,
    parseDrugContent,
    buildQueryList,
    normalizeText,
} = require('../helpers/ragUtils');

// ─── ILLNESS HISTORY ──────────────────────────────────────────────────────────

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

// ─── ADD ILLNESS ──────────────────────────────────────────────────────────────

/**
 * Tambah penyakit baru. Otomatis ambil illness_info dari ChromaDB jika tidak disediakan.
 */
const addIllness = async (user, supabase, { illness_name, started_at, notes, illness_info }) => {
    if (!illness_name || !illness_name.trim()) {
        throw Object.assign(new Error('Nama penyakit wajib diisi.'), { statusCode: 400 });
    }

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

    // Update last_illness di profiles untuk sinkronisasi EMR / chatbot
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

// ─── FETCH ILLNESS INFO ───────────────────────────────────────────────────────

/**
 * Ambil info kondisi penyakit dari ChromaDB berdasarkan nama penyakit.
 * Menggunakan metadata $eq filter (bukan vector search) untuk akurasi.
 *
 * @param {string} illnessName - Nama penyakit eksak atau mendekati eksak
 * @returns {object|null} Parsed illness info, atau null jika tidak ditemukan
 */
const fetchIllnessInfoFromChroma = async (illnessName) => {
    if (!illnessName) return null;
    try {
        const condCol = await getChromaCollection(COLLECTIONS.DISEASE);

        // Step 1: Fuzzy match name from cache
        const diseaseNames = await getDiseaseNames();
        const matches      = fuzzyMatchName(illnessName, diseaseNames, 1);
        const resolvedName = matches[0]?.name || illnessName;

        console.log(`[ILLNESS INFO] "${illnessName}" → using name "${resolvedName}"`);

        // Step 2: Fetch all chunks by disease_name
        let fullContent = condCol ? await getDocsByDiseaseName(condCol, resolvedName) : '';

        // Fallback: vector search if no metadata match
        if (!fullContent && condCol) {
            console.log(`[ILLNESS INFO] Metadata fetch empty, trying vector fallback...`);
            const queries = buildQueryList(illnessName).slice(0, 3);
            const result  = await condCol.query({ queryTexts: queries, nResults: 5 });
            const docs  = result?.documents?.flat().filter(Boolean) || [];
            const metas = result?.metadatas?.flat() || [];
            for (let i = 0; i < docs.length; i++) {
                const dname = metas[i]?.disease_name;
                if (dname) {
                    fullContent = await getDocsByDiseaseName(condCol, dname);
                    if (fullContent) break;
                }
            }
            if (!fullContent) fullContent = docs[0] || '';
        }

        if (!fullContent) return null;

        // Step 3: Parse illness info
        const parsedInfo = parseIllnessContent(fullContent);

        // Step 4: Enrich with drug info from all 3 drug collections
        if (!parsedInfo.obat_terkait) {
            const drugResult = await fetchDrugsForCondition(resolvedName);
            if (drugResult.length > 0) {
                parsedInfo.obat_terkait = drugResult.map(d => d.nama_obat).filter(Boolean).join(', ');
                parsedInfo.drug_details = drugResult.slice(0, 3);
            }
        }

        const hasAnyInfo = Object.values(parsedInfo).some(v => v && (typeof v === 'string' ? v.length > 0 : true));
        return hasAnyInfo ? parsedInfo : null;
    } catch (e) {
        console.warn('[CHROMA] fetchIllnessInfoFromChroma error:', e.message);
        return null;
    }
};

// ─── DRUG CROSS-REFERENCE (multi-collection) ─────────────────────────────────

/**
 * Ambil obat terkait dari SEMUA drug collections (detail + puskesmas + rs).
 * Uses the multi-collection search from chromaDrugSearch.
 *
 * @param {string} illnessName - Nama penyakit
 * @returns {{ nama_obat, kategori, indikasi, komposisi, dosis, aturan_pakai, efek_samping }[]}
 */
const fetchDrugsForCondition = async (illnessName) => {
    if (!illnessName) return [];
    try {
        const hits = await searchAllDrugCollections(illnessName, 5);
        return hits.map(hit => {
            const parsed = hit.detailDoc ? parseDrugContent(hit.detailDoc) : {};
            return {
                nama_obat:    hit.name,
                kategori:     hit.meta?.kategori   || parsed.kategori     || '',
                indikasi:     parsed.indikasi     || '',
                komposisi:    parsed.komposisi    || '',
                dosis:        parsed.dosis        || '',
                aturan_pakai: parsed.aturan_pakai || '',
                efek_samping: parsed.efek_samping || '',
                tersedia_di:  hit.sources.filter(s => s !== 'detail').map(s => s === 'puskesmas' ? 'Puskesmas' : 'Rumah Sakit').join(', '),
            };
        });
    } catch (e) {
        console.warn(`[ILLNESS] fetchDrugsForCondition error for "${illnessName}":`, e.message);
        return [];
    }
};

// ─── SEARCH ILLNESS (autocomplete / suggestion) ───────────────────────────────

const searchIllness = async (query) => {
    if (!query || query.trim().length < 2) return [];

    try {
        const condCol = await getChromaCollection(COLLECTIONS.DISEASE).catch(() => null);

        console.log(`[ILLNESS SEARCH] Query: "${query}"`);

        // Step 1: Gemini normalization (lightweight, 3s timeout)
        let geminiDiseaseNames = [];
        try {
            const { genAI } = require('./chatbotService');
            const prompt = `Pengguna menginputkan keluhan atau nama kondisi: "${query}". Berikan 1-3 kemungkinan nama penyakit/kondisi Indonesia. HANYA kembalikan array JSON string. Tanpa penjelasan.`;
            const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite', generationConfig: { temperature: 0.1, maxOutputTokens: 100 } });
            const result = await Promise.race([
                model.generateContent(prompt),
                new Promise((_, rej) => setTimeout(() => rej(new Error('Gemini timeout')), 3000))
            ]);
            const text = result.response.text().trim();
            const jsonMatch = text.match(/\[.*\]/s);
            if (jsonMatch) {
                geminiDiseaseNames = JSON.parse(jsonMatch[0]).filter(s => typeof s === 'string' && s.length >= 2);
                console.log(`[ILLNESS SEARCH] Gemini predictions:`, geminiDiseaseNames);
            }
        } catch (e) {
            console.warn('[ILLNESS SEARCH] Gemini prediction failed:', e.message);
        }

        const diseaseNames = await getDiseaseNames();
        const suggestions = [];
        const seenNames = new Set();

        // Step 2: Fuzzy match from query and Gemini predictions
        const searchTerms = [query.trim(), ...geminiDiseaseNames].filter(Boolean);

        const fetchDiseaseData = async (dname, score, type) => {
            try {
                const fullContent = condCol ? await getDocsByDiseaseName(condCol, dname) : '';
                if (!fullContent) return null;
                const info = parseIllnessContent(fullContent);
                // Cross-reference: fetch drugs from all 3 collections
                if (!info.obat_terkait) {
                    const drugResults = await fetchDrugsForCondition(dname);
                    if (drugResults.length > 0) {
                        info.obat_terkait = drugResults.map(d => d.nama_obat).filter(Boolean).join(', ');
                        info.drug_details = drugResults.slice(0, 3);
                    }
                }
                return {
                    name: dname,
                    illness_info: {
                        indikasi:     info.indikasi,
                        gejala_umum:  info.gejala_umum,
                        penanganan:   info.penanganan,
                        obat_terkait: info.obat_terkait,
                        peringatan:   info.peringatan,
                        drug_details: info.drug_details,
                    },
                    relevance_score: score,
                    match_type: type,
                };
            } catch (e) {
                console.warn(`[ILLNESS SEARCH] Error fetching "${dname}":`, e.message);
                return null;
            }
        };

        const allMatches = [];
        for (const term of searchTerms) {
            allMatches.push(...fuzzyMatchName(term, diseaseNames, 4));
        }

        const uniqueMatches = [];
        for (const match of allMatches) {
            if (!seenNames.has(match.name)) {
                seenNames.add(match.name);
                uniqueMatches.push(match);
            }
        }
        
        uniqueMatches.sort((a, b) => b.score - a.score);
        const topMatches = uniqueMatches.slice(0, 6);

        if (topMatches.length > 0) {
            const resolved = await Promise.allSettled(topMatches.map(m => fetchDiseaseData(m.name, m.score || 0, m.type || 'fuzzy')));
            suggestions.push(...resolved.filter(r => r.status === 'fulfilled' && r.value).map(r => r.value));
        }

        // Step 3: Fallback Vector Search if no metadata matches
        if (suggestions.length === 0 && condCol) {
            console.log(`[ILLNESS SEARCH] No metadata matches, trying vector fallback...`);
            const queries = buildQueryList(query.trim()).slice(0, 4);
            const result  = await condCol.query({ queryTexts: queries, nResults: 10 });
            const metas   = result?.metadatas?.flat() || [];

            const vectorMatches = [];
            for (const meta of metas) {
                const dname = meta?.disease_name;
                if (dname && !seenNames.has(dname)) {
                    seenNames.add(dname);
                    vectorMatches.push(dname);
                    if (vectorMatches.length >= 6) break;
                }
            }

            if (vectorMatches.length > 0) {
                const resolved = await Promise.allSettled(vectorMatches.map(name => fetchDiseaseData(name, 0, 'vector')));
                suggestions.push(...resolved.filter(r => r.status === 'fulfilled' && r.value).map(r => r.value));
            }
        }

        // NO Gemini synthesis fallback — return empty if no RAG data found
        // This prevents hallucination and ensures all data is grounded in ChromaDB

        console.log(`[ILLNESS SEARCH] Returned ${suggestions.length} results for "${query}"`);
        return suggestions;
    } catch (e) {
        console.warn('[CHROMA] searchIllness error:', e.message);
        return [];
    }
};

// ─── MARK RECOVERED ───────────────────────────────────────────────────────────

/**
 * Tandai penyakit sebagai sudah sembuh
 */
const markRecovered = async (user, supabase, illnessId) => {
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

module.exports = {
    getIllnessHistory,
    addIllness,
    markRecovered,
    searchIllness,
    fetchIllnessInfoFromChroma,
};
