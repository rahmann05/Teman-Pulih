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

const searchIllness = async (query) => {
    if (!query || query.trim().length < 2) return [];

    try {
        const condCol = await getChromaCollection(process.env.CHROMA_DATABASE || 'RAG-TemanPulih').catch(() => null);
        const drugCol = await getChromaCollection(process.env.CHROMA_DATABASE_DRUGS || 'RAG-TemanPulih-Obat').catch(() => null);

        console.log(`[ILLNESS SEARCH] Query: "${query}"`);

        // Step 1: Use Gemini to predict standard medical conditions based on user input
        let geminiDiseaseNames = [];
        try {
            const { genAI } = require('./chatbotService');
            const prompt = `Pengguna menginputkan keluhan atau nama kondisi: "${query}". 
Tugasmu adalah memberikan 3 kemungkinan kondisi medis atau penyakit umum dalam bahasa Indonesia yang relevan.
HANYA kembalikan array JSON berisi string nama penyakit. Dilarang memberikan teks lain.
Contoh jika input "perut perih": ["Maag", "Asam Lambung", "Gastritis"]
Contoh jika input "pusing muter": ["Vertigo", "Sakit Kepala", "Migrain"]`;
            
            const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite', generationConfig: { temperature: 0.1 } });
            const result = await model.generateContent(prompt);
            const text = result.response.text().trim();
            const jsonMatch = text.match(/\[.*\]/s);
            if (jsonMatch) {
                geminiDiseaseNames = JSON.parse(jsonMatch[0]);
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

        // Helper function for concurrent fetching
        const fetchDiseaseData = async (dname, score, type) => {
            try {
                const fullContent = condCol ? await getDocsByDiseaseName(condCol, dname) : '';
                if (!fullContent) return null;
                const info = parseIllnessContent(fullContent);
                const drugResults = drugCol ? await fetchDrugsForCondition(drugCol, dname) : [];
                if (drugResults.length > 0 && !info.obat_terkait) {
                    info.obat_terkait = drugResults.map(d => d.nama_obat).filter(Boolean).join(', ');
                }
                return {
                    name: dname,
                    illness_info: {
                        indikasi:     info.indikasi,
                        gejala_umum:  info.gejala_umum,
                        penanganan:   info.penanganan,
                        obat_terkait: info.obat_terkait,
                        peringatan:   info.peringatan,
                        drug_details: drugResults.length > 0 ? drugResults.slice(0, 3) : undefined,
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
            const resolved = await Promise.all(topMatches.map(m => fetchDiseaseData(m.name, m.score || 0, m.type || 'fuzzy')));
            suggestions.push(...resolved.filter(Boolean));
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
                const resolved = await Promise.all(vectorMatches.map(name => fetchDiseaseData(name, 0, 'vector')));
                suggestions.push(...resolved.filter(Boolean));
            }
        }

        // Step 4: Synthesize via Gemini if RAG returns absolutely nothing
        if (suggestions.length === 0 && geminiDiseaseNames.length > 0) {
            console.log('[ILLNESS SEARCH] No RAG matches, generating synthesis from Gemini...');
            try {
                const { genAI } = require('./chatbotService');
                const targetDisease = geminiDiseaseNames[0];
                const p = `Berikan informasi medis edukatif singkat tentang "${targetDisease}" dalam format JSON.
Format HARUS persis seperti ini tanpa markdown tambahan:
{
  "indikasi": "Penjelasan singkat tentang kondisi ini",
  "gejala_umum": "Gejala yang sering dialami",
  "penanganan": "Penanganan mandiri yang disarankan",
  "obat_terkait": "Contoh obat generik yang umum",
  "peringatan": "Kapan pasien harus segera ke dokter"
}`;
                const m = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite', generationConfig: { temperature: 0.1 } });
                const r = await m.generateContent(p);
                const t = r.response.text().trim();
                const j = t.match(/\{.*\}/s);
                if (j) {
                    const info = JSON.parse(j[0]);
                    suggestions.push({
                        name: targetDisease,
                        illness_info: info,
                        relevance_score: 0,
                        match_type: 'gemini-synthesized'
                    });
                }
            } catch(e) {
                console.warn('[ILLNESS SEARCH] Synthesis error:', e.message);
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
