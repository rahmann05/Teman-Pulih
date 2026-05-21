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
    getDrugNames,
    fuzzyMatchName,
    getDocsByDiseaseName,
    getDocsByDrugName,
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
        const condCol = await getChromaCollection(process.env.CHROMA_DATABASE || 'RAG-TemanPulih');
        const drugCol = await getChromaCollection(process.env.CHROMA_DATABASE_DRUGS || 'RAG-TemanPulih-Obat');

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

        // Step 4: Enrich with drug info if obat_terkait is missing
        if (!parsedInfo.obat_terkait && drugCol) {
            const drugResult = await fetchDrugsForCondition(drugCol, resolvedName);
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

// ─── DRUG CROSS-REFERENCE ─────────────────────────────────────────────────────

/**
 * Ambil obat terkait dari RAG-TemanPulih-Obat untuk suatu kondisi penyakit.
 * Hanya Layer 1: semantic vector search dengan nama penyakit.
 *
 * @param {object} drugCol     - ChromaDB drug collection
 * @param {string} illnessName - Nama penyakit
 * @returns {{ nama_obat, indikasi, dosis, aturan_pakai, efek_samping }[]}
 */
const fetchDrugsForCondition = async (drugCol, illnessName) => {
    if (!drugCol || !illnessName) return [];
    const drugs    = [];
    const seenDrugs = new Set();

    try {
        const queries   = buildQueryList(illnessName).slice(0, 4);
        const semResult = await drugCol.query({ queryTexts: queries, nResults: 6 });
        const semDocs   = semResult?.documents?.flat().filter(Boolean) || [];
        const semMetas  = semResult?.metadatas?.flat() || [];

        for (let i = 0; i < semDocs.length; i++) {
            const meta = semMetas[i] || {};
            const nama = meta.nama_obat;
            if (!nama) continue;

            const key = normalizeText(nama);
            if (seenDrugs.has(key)) continue;
            seenDrugs.add(key);

            // Fetch full content by nama_obat
            const fullContent = await getDocsByDrugName(drugCol, nama);
            const parsed = parseDrugContent(fullContent || semDocs[i]);

            drugs.push({
                nama_obat:    nama,
                kategori:     meta.kategori       || parsed.kategori     || '',
                indikasi:     parsed.indikasi     || '',
                komposisi:    parsed.komposisi    || '',
                dosis:        parsed.dosis        || '',
                aturan_pakai: parsed.aturan_pakai || '',
                efek_samping: parsed.efek_samping || '',
            });

            if (drugs.length >= 5) break;
        }
    } catch (e) {
        console.warn(`[ILLNESS] fetchDrugsForCondition error for "${illnessName}":`, e.message);
    }

    return drugs;
};

// ─── SEARCH ILLNESS (autocomplete / suggestion) ───────────────────────────────

/**
 * Cari penyakit berdasarkan nama atau gejala.
 *
 * Alur baru (metadata-first):
 * 1. Fuzzy match query terhadap cached disease_name list
 * 2. Untuk setiap match: fetch semua chunk via getDocsByDiseaseName
 * 3. Parse info → cross-reference ke drug collection
 * 4. Fallback ke vector search jika tidak ada metadata match
 *
 * @param {string} query - User's search query
 * @returns {object[]} Array of illness suggestions
 */
const searchIllness = async (query) => {
    if (!query || query.trim().length < 2) return [];

    try {
        const condCol = await getChromaCollection(process.env.CHROMA_DATABASE || 'RAG-TemanPulih').catch(() => null);
        const drugCol = await getChromaCollection(process.env.CHROMA_DATABASE_DRUGS || 'RAG-TemanPulih-Obat').catch(() => null);

        if (!condCol) return [];

        console.log(`[ILLNESS SEARCH] Query: "${query}"`);

        // Step 1: Fuzzy match from cached disease names
        const diseaseNames = await getDiseaseNames();
        const matches      = fuzzyMatchName(query.trim(), diseaseNames, 6);

        const suggestions = [];

        if (matches.length > 0) {
            console.log(`[ILLNESS SEARCH] ${matches.length} fuzzy matches: ${matches.map(m => m.name).join(', ')}`);

            for (const match of matches) {
                try {
                    const fullContent = await getDocsByDiseaseName(condCol, match.name);
                    if (!fullContent) continue;

                    const info = parseIllnessContent(fullContent);

                    // Cross-reference drugs
                    const drugResults = drugCol ? await fetchDrugsForCondition(drugCol, match.name) : [];
                    if (drugResults.length > 0 && !info.obat_terkait) {
                        info.obat_terkait = drugResults.map(d => d.nama_obat).filter(Boolean).join(', ');
                    }

                    suggestions.push({
                        name: match.name,
                        illness_info: {
                            indikasi:     info.indikasi,
                            gejala_umum:  info.gejala_umum,
                            penanganan:   info.penanganan,
                            obat_terkait: info.obat_terkait,
                            peringatan:   info.peringatan,
                            drug_details: drugResults.length > 0 ? drugResults.slice(0, 3) : undefined,
                        },
                        relevance_score: match.score,
                        match_type:     match.type,
                    });
                } catch (e) {
                    console.warn(`[ILLNESS SEARCH] Error fetching "${match.name}":`, e.message);
                }
            }
        }

        // Fallback: vector search if no metadata matches found
        if (suggestions.length === 0) {
            console.log(`[ILLNESS SEARCH] No metadata matches, trying vector fallback...`);
            const queries = buildQueryList(query.trim()).slice(0, 4);
            const result  = await condCol.query({ queryTexts: queries, nResults: 20 });
            const docs    = result?.documents?.flat().filter(Boolean) || [];
            const metas   = result?.metadatas?.flat() || [];

            const seenNames = new Set();
            for (let i = 0; i < metas.length; i++) {
                const dname = metas[i]?.disease_name;
                if (!dname || seenNames.has(dname)) continue;
                seenNames.add(dname);

                const fullContent = await getDocsByDiseaseName(condCol, dname);
                const info = parseIllnessContent(fullContent || docs[i] || '');
                const drugResults = drugCol ? await fetchDrugsForCondition(drugCol, dname) : [];

                if (drugResults.length > 0 && !info.obat_terkait) {
                    info.obat_terkait = drugResults.map(d => d.nama_obat).filter(Boolean).join(', ');
                }

                suggestions.push({
                    name: dname,
                    illness_info: {
                        indikasi:     info.indikasi,
                        gejala_umum:  info.gejala_umum,
                        penanganan:   info.penanganan,
                        obat_terkait: info.obat_terkait,
                        peringatan:   info.peringatan,
                        drug_details: drugResults.length > 0 ? drugResults.slice(0, 3) : undefined,
                    },
                    relevance_score: 0,
                    match_type: 'vector',
                });

                if (suggestions.length >= 6) break;
            }
        }

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
