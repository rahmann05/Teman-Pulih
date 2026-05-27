/**
 * ragService.js — RAG (Retrieval-Augmented Generation) service
 *
 * Responsibilities:
 * - searchDrug(query)    : Find drug info by name (metadata-first, then vector fallback)
 * - searchDisease(query) : Find disease info by name (metadata-first)
 * - buildChatbotContext  : Build RAG context string for chatbot LLM prompt
 * - checkDrugAllergy     : Check drug vs patient allergy
 * - enrichDrugDetails    : Enrich drug object from all chunks
 * - getPatientContextText: Build patient profile string
 */

const {
    getChromaCollection,
    getDiseaseNames,
    getDrugNames,
    fuzzyMatchName,
    getDocsByDiseaseName,
    getDocsByDrugName,
    getFullDrugContent,
    queryDiseasesBySymptoms,
} = require('../helpers/chromaHelper');


const {
    normalizeText,
    buildQueryList,
    parseDrugContent,
    parseIllnessContent,
} = require('../helpers/ragUtils');

// ─── ALIGNMENT HELPER ────────────────────────────────────────────────────────
const alignQueryResults = (result) => {
    const rawDocs = result?.documents?.flat() || [];
    const rawMetas = result?.metadatas?.flat() || [];
    
    const docs = [];
    const metas = [];
    for (let i = 0; i < rawDocs.length; i++) {
        if (rawDocs[i] && rawMetas[i]) {
            docs.push(rawDocs[i]);
            metas.push(rawMetas[i]);
        }
    }
    return { docs, metas };
};

// ─── PATIENT CONTEXT ──────────────────────────────────────────────────────────

/**
 * Build a single patient context string for prompt enrichment.
 */
const getPatientContextText = (profile) => {
    if (!profile) return '';
    return [
        profile.chronic_conditions,
        profile.past_illnesses,
        profile.last_illness,
        profile.routine_medications,
    ].filter(Boolean).join(' ');
};

// ─── ALLERGY CHECK ────────────────────────────────────────────────────────────

/**
 * Check if a drug conflicts with the patient's documented allergies.
 * @returns {{ hasAllergy: boolean, details: string }}
 */
const checkDrugAllergy = (drug, patientProfile) => {
    if (!patientProfile?.allergies) return { hasAllergy: false, details: '' };
    const allergies = patientProfile.allergies.toLowerCase().split(/,\s*/);
    const drugText  = `${drug.nama_obat || ''} ${drug.komposisi || ''} ${drug.raw_content || ''}`.toLowerCase();
    for (const allergen of allergies) {
        const trimmed = allergen.trim();
        if (trimmed && drugText.includes(trimmed)) {
            return {
                hasAllergy: true,
                details: `Peringatan Medis: Mengandung "${trimmed}" yang tidak cocok dengan riwayat alergi pasien!`,
            };
        }
    }
    return { hasAllergy: false, details: '' };
};

// ─── DRUG ENRICHMENT ──────────────────────────────────────────────────────────

/**
 * Enrich a drug object by fetching all its chunks when structured fields are missing.
 */
const enrichDrugDetails = async (drug, drugCol) => {
    if (!drugCol || !drug?.source_id) return drug;
    const hasDetails = Boolean(
        drug.kategori || drug.indikasi || drug.komposisi || drug.dosis || drug.aturan_pakai
    );
    if (hasDetails) return drug;

    const fullContent = await getFullDrugContent(drugCol, drug.source_id, drug.raw_content);
    const parsedFull  = parseDrugContent(fullContent);
    return {
        ...drug,
        raw_content:  fullContent,
        kategori:     drug.kategori     || parsedFull.kategori     || '',
        indikasi:     drug.indikasi     || parsedFull.indikasi     || '',
        komposisi:    drug.komposisi    || parsedFull.komposisi    || '',
        dosis:        drug.dosis        || parsedFull.dosis        || '',
        aturan_pakai: drug.aturan_pakai || parsedFull.aturan_pakai || '',
        efek_samping: drug.efek_samping || parsedFull.efek_samping || '',
    };
};

// ─── PRIMARY SEARCH: DRUG ─────────────────────────────────────────────────────

/**
 * Search for drug information by name.
 *
 * Strategy:
 * 1. Fuzzy match query against cached nama_obat list
 * 2. Fetch all chunks WHERE nama_obat = $eq matchedName → parse
 * 3. Fallback: vector search in RAG-TemanPulih-Obat if no exact match found
 *
 * @param {string} query - Drug name to search for
 * @returns {{ nama_obat, kategori, indikasi, komposisi, dosis, aturan_pakai, efek_samping } | null}
 */
const searchDrug = async (query) => {
    if (!query?.trim()) return null;

    const drugCol = await getChromaCollection(process.env.CHROMA_DATABASE_DRUGS || 'RAG-TemanPulih-Obat').catch(() => null);

    // Step 1: Use Gemini to predict standard drug name
    let geminiDrugName = null;
    try {
        const { genAI } = require('./chatbotService');
        const prompt = `Pengguna menginputkan pencarian obat: "${query}". 
Berikan 1 kemungkinan nama obat generik atau merek dagang paling umum dalam bahasa Indonesia yang paling relevan.
HANYA kembalikan string nama obat, tanpa tambahan apapun.
Contoh jika input "panadol": Paracetamol
Contoh jika input "obat pusing": Paracetamol`;
        
        const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite', generationConfig: { temperature: 0.1 } });
        const result = await model.generateContent(prompt);
        geminiDrugName = result.response.text().trim();
        console.log(`[RAG DRUG] Gemini prediction: "${geminiDrugName}"`);
    } catch (e) {
        console.warn('[RAG DRUG] Gemini prediction failed:', e.message);
    }

    const drugNames = await getDrugNames();
    const searchTerms = [query.trim(), geminiDrugName].filter(Boolean);

    // Step 2: Fuzzy match against cached drug names
    for (const term of searchTerms) {
        const matches = fuzzyMatchName(term, drugNames, 1);
        const bestMatch = matches[0]?.name || null;

        if (bestMatch) {
            console.log(`[RAG DRUG] "${term}" → matched "${bestMatch}" (${matches[0].type})`);
            const fullContent = drugCol ? await getDocsByDrugName(drugCol, bestMatch).catch(()=>'') : '';
            if (fullContent) {
                const parsed = parseDrugContent(fullContent);
                return {
                    nama_obat:    bestMatch,
                    kategori:     parsed.kategori     || '',
                    indikasi:     parsed.indikasi     || '',
                    komposisi:    parsed.komposisi    || '',
                    dosis:        parsed.dosis        || '',
                    aturan_pakai: parsed.aturan_pakai || '',
                    efek_samping: parsed.efek_samping || '',
                    peringatan:   parsed.peringatan   || '',
                    raw_content:  fullContent,
                };
            }
        }
    }

    // Step 3: Vector fallback — check nama_obat match first
    console.log(`[RAG DRUG] No metadata match for "${query}", trying vector fallback...`);
    const komposisiMatches = []; // collect drugs that match by komposisi
    if (drugCol) {
        try {
            const queries = buildQueryList(query).slice(0, 4);
            const result  = await drugCol.query({ queryTexts: queries, nResults: 10 });
            const { docs, metas } = alignQueryResults(result);

            const normQuery = normalizeText(query);

            for (let i = 0; i < docs.length; i++) {
                const nama = metas[i]?.nama_obat;
                if (!nama) continue;

                // Check nama_obat match (substring)
                const normNama = normalizeText(nama);
                if (normNama.includes(normQuery) || normQuery.includes(normNama)) {
                    const fullContent = await getDocsByDrugName(drugCol, nama);
                    const parsed = parseDrugContent(fullContent || docs[i]);
                    console.log(`[RAG DRUG] Vector fallback matched by name "${nama}"`);
                    return {
                        nama_obat:    nama,
                        kategori:     parsed.kategori     || '',
                        indikasi:     parsed.indikasi     || '',
                        komposisi:    parsed.komposisi    || '',
                        dosis:        parsed.dosis        || '',
                        aturan_pakai: parsed.aturan_pakai || '',
                        efek_samping: parsed.efek_samping || '',
                        peringatan:   parsed.peringatan   || '',
                        raw_content:  fullContent || docs[i],
                    };
                }

                // Check komposisi match — query might be an ingredient name
                const normDoc = normalizeText(docs[i]);
                if (normDoc.includes(normQuery)) {
                    komposisiMatches.push({ nama, doc: docs[i] });
                }
            }
        } catch (e) {
            console.warn(`[RAG DRUG] Vector fallback failed:`, e.message);
        }
    }

    // Step 4: Komposisi/ingredient match — return first drug that contains this ingredient
    if (komposisiMatches.length > 0) {
        const first = komposisiMatches[0];
        const fullContent = await getDocsByDrugName(drugCol, first.nama).catch(() => first.doc);
        const parsed = parseDrugContent(fullContent || first.doc);
        console.log(`[RAG DRUG] Matched by komposisi/ingredient: "${first.nama}" contains "${query}"`);
        return {
            nama_obat:    first.nama,
            kategori:     parsed.kategori     || '',
            indikasi:     parsed.indikasi     || '',
            komposisi:    parsed.komposisi    || '',
            dosis:        parsed.dosis        || '',
            aturan_pakai: parsed.aturan_pakai || '',
            efek_samping: parsed.efek_samping || '',
            peringatan:   parsed.peringatan   || '',
            raw_content:  fullContent || first.doc,
            matched_by_ingredient: true,
        };
    }

    // Step 5: Synthesize via Gemini if RAG returns absolutely nothing
    if (geminiDrugName) {
        console.log('[RAG DRUG] No RAG matches, generating synthesis from Gemini...');
        try {
            const { genAI } = require('./chatbotService');
            const p = `Berikan informasi medis edukatif singkat tentang obat "${geminiDrugName}" dalam format JSON.
Format HARUS persis seperti ini tanpa markdown tambahan:
{
  "kategori": "Kategori obat",
  "indikasi": "Kegunaan utama",
  "komposisi": "Bahan aktif utama",
  "dosis": "Dosis umum",
  "aturan_pakai": "Cara penggunaan umum",
  "efek_samping": "Efek samping umum",
  "kontraindikasi": "Siapa yang tidak boleh meminumnya",
  "peringatan": "Hal yang harus diperhatikan"
}`;
            const m = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite', generationConfig: { temperature: 0.1 } });
            const r = await m.generateContent(p);
            const t = r.response.text().trim();
            const j = t.match(/\{.*\}/s);
            if (j) {
                const parsed = JSON.parse(j[0]);
                return {
                    nama_obat:    geminiDrugName,
                    kategori:     parsed.kategori     || '',
                    indikasi:     parsed.indikasi     || '',
                    komposisi:    parsed.komposisi    || '',
                    dosis:        parsed.dosis        || '',
                    aturan_pakai: parsed.aturan_pakai || '',
                    efek_samping: parsed.efek_samping || '',
                    peringatan:   parsed.peringatan   || '',
                    raw_content:  "Generated by Gemini API",
                    matched_by_ingredient: false,
                };
            }
        } catch(e) {
            console.warn('[RAG DRUG] Synthesis error:', e.message);
        }
    }

    console.warn(`[RAG DRUG] No match found for "${query}"`);
    return null;
};


/**
 * Search for multiple matching drugs by name or ingredient/composition.
 *
 * @param {string} query - Drug name or ingredient to search for
 * @returns {Promise<Array>} Array of drug objects
 */
const searchDrugsList = async (query) => {
    if (!query?.trim()) return [];

    const drugCol = await getChromaCollection(process.env.CHROMA_DATABASE_DRUGS || 'RAG-TemanPulih-Obat').catch(() => null);

    const resultsMap = new Map();

    const addResult = (name, parsed, doc) => {
        if (!resultsMap.has(name)) {
            resultsMap.set(name, {
                nama_obat:      name,
                kategori:       parsed.kategori       || '',
                indikasi:       parsed.indikasi       || '',
                komposisi:      parsed.komposisi      || '',
                dosis:          parsed.dosis          || '',
                aturan_pakai:   parsed.aturan_pakai   || '',
                efek_samping:   parsed.efek_samping   || '',
                kontraindikasi: parsed.kontraindikasi || '',
                peringatan:     parsed.peringatan     || '',
                raw_content:    doc,
            });
        }
    };

    // Step 1: Use Gemini to predict standard drug names based on user input
    let geminiDrugNames = [];
    try {
        const { genAI } = require('./chatbotService');
        const prompt = `Pengguna menginputkan pencarian obat: "${query}". 
Tugasmu adalah memberikan 3 kemungkinan nama obat generik atau merek dagang umum dalam bahasa Indonesia yang relevan.
HANYA kembalikan array JSON berisi string nama obat. Dilarang memberikan teks lain.
Contoh jika input "obat sakit kepala": ["Paracetamol", "Ibuprofen", "Aspirin"]
Contoh jika input "panadol": ["Paracetamol", "Panadol"]`;
        
        const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite', generationConfig: { temperature: 0.1 } });
        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();
        const jsonMatch = text.match(/\[.*\]/s);
        if (jsonMatch) {
            geminiDrugNames = JSON.parse(jsonMatch[0]);
            console.log(`[RAG DRUG LIST] Gemini predictions:`, geminiDrugNames);
        }
    } catch (e) {
        console.warn('[RAG DRUG LIST] Gemini prediction failed:', e.message);
    }

    const drugNames = await getDrugNames();
    const searchTerms = [query.trim(), ...geminiDrugNames].filter(Boolean);

    // Step 2: Fuzzy match against cached drug names for all search terms
    const uniqueDrugMatches = new Set();
    for (const term of searchTerms) {
        const matches = fuzzyMatchName(term, drugNames, 5);
        for (const m of matches) {
            uniqueDrugMatches.add(m.name);
        }
    }

    if (uniqueDrugMatches.size > 0 && drugCol) {
        await Promise.all(Array.from(uniqueDrugMatches).map(async (name) => {
            const fullContent = await getDocsByDrugName(drugCol, name).catch(() => '');
            if (fullContent) {
                const parsed = parseDrugContent(fullContent);
                addResult(name, parsed, fullContent);
            }
        }));
    }

    // Step 3: Vector search — collect unique candidates, then check FULL document content
    if (drugCol) {
        try {
            const queries = buildQueryList(query).slice(0, 4);
            const result  = await drugCol.query({ queryTexts: queries, nResults: 15 });
            const { docs, metas } = alignQueryResults(result);

            const normQuery = normalizeText(query);

            // Collect unique drug names returned by vector search
            const candidateNames = new Set();
            for (let i = 0; i < docs.length; i++) {
                const name = metas[i]?.nama_obat;
                if (name && !resultsMap.has(name)) candidateNames.add(name);
            }

            // Fetch full document for each candidate and check name OR full content
            await Promise.all(Array.from(candidateNames).map(async (name) => {
                const fullContent = await getDocsByDrugName(drugCol, name).catch(() => '');
                if (!fullContent) return;
                const normName = normalizeText(name);
                const normFull = normalizeText(fullContent);
                if (normName.includes(normQuery) || normQuery.includes(normName) || normFull.includes(normQuery)) {
                    const parsed = parseDrugContent(fullContent);
                    addResult(name, parsed, fullContent);
                }
            }));
        } catch (e) {
            console.warn(`[RAG DRUG LIST] Vector search failed:`, e.message);
        }
    }

    // Step 4: Exhaustive ingredient/composition scan (fallback for ingredient queries e.g. "paracetamol")
    if (resultsMap.size === 0 && drugCol) {
        console.log(`[RAG DRUG LIST] No results yet — trying exhaustive ingredient scan for "${query}"...`);
        try {
            const allDrugNames = await getDrugNames();
            const normQuery    = normalizeText(query);
            const BATCH        = 10;

            for (let i = 0; i < allDrugNames.length; i += BATCH) {
                await Promise.all(allDrugNames.slice(i, i + BATCH).map(async (name) => {
                    if (resultsMap.has(name)) return;
                    const fullContent = await getDocsByDrugName(drugCol, name).catch(() => '');
                    if (!fullContent) return;
                    if (normalizeText(fullContent).includes(normQuery)) {
                        const parsed = parseDrugContent(fullContent);
                        addResult(name, parsed, fullContent);
                        console.log(`[RAG DRUG LIST] Ingredient match: "${name}" contains "${query}"`);
                    }
                }));
            }
        } catch (e) {
            console.warn(`[RAG DRUG LIST] Ingredient scan failed:`, e.message);
        }
    }

    // Step 5: Synthesize via Gemini if RAG returns absolutely nothing
    if (resultsMap.size === 0 && geminiDrugNames.length > 0) {
        console.log('[RAG DRUG LIST] No RAG matches, generating synthesis from Gemini...');
        try {
            const { genAI } = require('./chatbotService');
            const targetDrug = geminiDrugNames[0];
            const p = `Berikan informasi medis edukatif singkat tentang obat "${targetDrug}" dalam format JSON.
Format HARUS persis seperti ini tanpa markdown tambahan:
{
  "kategori": "Kategori obat",
  "indikasi": "Kegunaan utama",
  "komposisi": "Bahan aktif utama",
  "dosis": "Dosis umum",
  "aturan_pakai": "Cara penggunaan umum",
  "efek_samping": "Efek samping umum",
  "kontraindikasi": "Siapa yang tidak boleh meminumnya",
  "peringatan": "Hal yang harus diperhatikan"
}`;
            const m = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite', generationConfig: { temperature: 0.1 } });
            const r = await m.generateContent(p);
            const t = r.response.text().trim();
            const j = t.match(/\{.*\}/s);
            if (j) {
                const info = JSON.parse(j[0]);
                addResult(targetDrug, info, "Generated by Gemini API");
            }
        } catch(e) {
            console.warn('[RAG DRUG LIST] Synthesis error:', e.message);
        }
    }

    return Array.from(resultsMap.values());
};

// ─── MULTI-SYMPTOM DISEASE SEARCH ────────────────────────────────────────────

/**
 * Search for diseases that match a given set of symptoms.
 *
 * Strategy 1 — Direct fuzzy match: each symptom matched against disease names
 *   (finds conditions named after a symptom, e.g. "Pusing", "Mual").
 * Strategy 2 — Vector search: combined symptom string used as embedding query;
 *   candidates re-scored by counting symptom overlap in the full document.
 * Strategy 3 — gejala_umum re-rank: additional bonus for symptoms found
 *   specifically in the structured Gejala field.
 *
 * @param {string[]} symptoms - Array of symptom strings from user input
 * @returns {Promise<Array>}  Top-3 ranked disease objects with matchedSymptoms[]
 */
const searchDiseaseBySymptoms = async (symptoms) => {
    if (!symptoms?.length) return [];

    const condCol = await getChromaCollection(process.env.CHROMA_DATABASE || 'RAG-TemanPulih');
    if (!condCol) return [];

    const diseaseNames = await getDiseaseNames();
    const resultsMap   = new Map(); // disease_name → enriched entry

    const upsert = (name, parsed, rawContent, score, matched) => {
        const prev = resultsMap.get(name);
        if (!prev) {
            resultsMap.set(name, {
                name,
                indikasi:      parsed.indikasi     || '',
                gejala_umum:   parsed.gejala_umum  || '',
                penanganan:    parsed.penanganan   || '',
                obat_terkait:  parsed.obat_terkait || '',
                peringatan:    parsed.peringatan   || '',
                raw_content:   rawContent,
                score,
                matchedSymptoms: matched,
            });
        } else {
            const merged = [...new Set([...prev.matchedSymptoms, ...matched])];
            prev.matchedSymptoms = merged;
            prev.score = Math.max(prev.score, score);
        }
    };

    // ── Strategy 1: Direct fuzzy name match per symptom ──────────────────────
    for (const symptom of symptoms) {
        const matches = fuzzyMatchName(symptom, diseaseNames, 2);
        for (const m of matches) {
            if (resultsMap.has(m.name)) continue;
            const fullContent = await getDocsByDiseaseName(condCol, m.name);
            if (fullContent) {
                const parsed = parseIllnessContent(fullContent);
                const scoreMap = { exact: 90, substring: 70, fuzzy: 50 };
                upsert(m.name, parsed, fullContent, scoreMap[m.type] || 50, [symptom]);
                console.log(`[RAG SYMPTOMS] S1 match: "${symptom}" → "${m.name}" (${m.type})`);
            }
        }
    }

    // ── Strategy 2: Vector search with combined symptom query ────────────────
    try {
        const { docs, metas } = await queryDiseasesBySymptoms(condCol, symptoms, 12);

        // Group unique disease names found by vector search
        const candidates = new Map();
        for (let i = 0; i < docs.length; i++) {
            const dname = metas[i]?.disease_name;
            if (dname && !candidates.has(dname)) candidates.set(dname, docs[i]);
        }

        // Fetch full content per candidate and score by symptom overlap
        await Promise.all(Array.from(candidates.entries()).map(async ([dname, sampleDoc]) => {
            const fullContent = await getDocsByDiseaseName(condCol, dname).catch(() => sampleDoc);
            const parsed      = parseIllnessContent(fullContent || sampleDoc);
            const normContent = normalizeText(fullContent || sampleDoc);
            const matched     = symptoms.filter(s => normContent.includes(normalizeText(s)));
            const score       = 20 + matched.length * 25;
            upsert(dname, parsed, fullContent || sampleDoc, score, matched);
        }));
    } catch (e) {
        console.warn('[RAG SYMPTOMS] Strategy 2 vector search failed:', e.message);
    }

    // ── Strategy 3: Re-rank by gejala_umum field overlap ────────────────────
    for (const entry of resultsMap.values()) {
        if (entry.gejala_umum) {
            const normGejala = normalizeText(entry.gejala_umum);
            const gMatched   = symptoms.filter(s => normGejala.includes(normalizeText(s)));
            if (gMatched.length > 0) {
                entry.score += gMatched.length * 15;
                entry.matchedSymptoms = [...new Set([...entry.matchedSymptoms, ...gMatched])];
            }
        }
    }

    const ranked = Array.from(resultsMap.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);

    if (ranked.length > 0) {
        console.log(
            `[RAG SYMPTOMS] Top conditions for [${symptoms.join(', ')}]:`,
            ranked.map(d => `${d.name}(${d.score})`).join(', ')
        );
    }
    return ranked;
};

/**
 * Build a differential-diagnosis RAG context string from a set of symptoms.
 * Calls searchDiseaseBySymptoms, then formats the top-3 results with priority
 * labels ([KEMUNGKINAN UTAMA] / [KEMUNGKINAN LAIN]) for the LLM prompt.
 *
 * @param {string[]} symptoms
 * @returns {Promise<string>} Formatted context block, or '' if no match
 */
const buildSymptomDifferentialContext = async (symptoms) => {
    if (!symptoms?.length) return '';
    try {
        const diseases = await searchDiseaseBySymptoms(symptoms);
        if (!diseases.length) return '';

        let ctx = `=== REFERENSI KONDISI MEDIS (Berdasarkan Gejala: ${symptoms.join(', ')}) ===\n`;
        for (let i = 0; i < diseases.length; i++) {
            const d       = diseases[i];
            const label   = i === 0 ? '[KEMUNGKINAN UTAMA]' : '[KEMUNGKINAN LAIN]';
            const lines   = [
                `${label} Kondisi: ${d.name}`,
                d.matchedSymptoms?.length ? `Gejala Cocok: ${d.matchedSymptoms.join(', ')}` : '',
                d.indikasi     ? `Definisi: ${d.indikasi}`         : '',
                d.gejala_umum  ? `Gejala Umum: ${d.gejala_umum}`  : '',
                d.penanganan   ? `Penanganan: ${d.penanganan}`     : '',
                d.obat_terkait ? `Obat Terkait: ${d.obat_terkait}` : '',
                d.peringatan   ? `Peringatan: ${d.peringatan}`     : '',
            ].filter(Boolean).join('\n');
            ctx += `${lines}\n---\n`;
        }
        return ctx + '\n';
    } catch (e) {
        console.error('[RAG SYMPTOMS] buildSymptomDifferentialContext error:', e.message);
        return '';
    }
};

// ─── PRIMARY SEARCH: DISEASE ──────────────────────────────────────────────────


/**
 * Search for disease/condition information by name.
 *
 * Strategy:
 * 1. Fuzzy match query against cached disease_name list
 * 2. Fetch all chunks WHERE disease_name = $eq matchedName → parse
 * 3. Fallback: vector search in RAG-TemanPulih
 *
 * @param {string} query - Disease name or symptom to search for
 * @returns {{ name, gejala_umum, indikasi, penanganan, obat_terkait, peringatan, raw_content } | null}
 */
const searchDisease = async (query) => {
    if (!query?.trim()) return null;

    const condCol = await getChromaCollection(process.env.CHROMA_DATABASE || 'RAG-TemanPulih');
    if (!condCol) return null;

    // Step 1: Fuzzy match against cached disease names
    const diseaseNames = await getDiseaseNames();
    const matches      = fuzzyMatchName(query, diseaseNames, 1);
    const bestMatch    = matches[0]?.name || null;

    if (bestMatch) {
        console.log(`[RAG DISEASE] "${query}" → matched "${bestMatch}" (${matches[0].type})`);
        const fullContent = await getDocsByDiseaseName(condCol, bestMatch);
        if (fullContent) {
            const parsed = parseIllnessContent(fullContent);
            return {
                name:         bestMatch,
                indikasi:     parsed.indikasi     || '',
                gejala_umum:  parsed.gejala_umum  || '',
                penanganan:   parsed.penanganan   || '',
                obat_terkait: parsed.obat_terkait || '',
                peringatan:   parsed.peringatan   || '',
                raw_content:  fullContent,
            };
        }
    }

    // Step 2: Vector fallback
    console.log(`[RAG DISEASE] No metadata match for "${query}", trying vector fallback...`);
    try {
        const queries = buildQueryList(query).slice(0, 4);
        const result  = await condCol.query({ queryTexts: queries, nResults: 5 });
        const { docs, metas } = alignQueryResults(result);

        for (let i = 0; i < docs.length; i++) {
            const dname = metas[i]?.disease_name;
            if (!dname) continue;
            const normDname = normalizeText(dname);
            const normQuery = normalizeText(query);
            if (normDname.includes(normQuery) || normQuery.includes(normDname)) {
                // Got a hit — fetch full content
                const fullContent = await getDocsByDiseaseName(condCol, dname);
                const parsed = parseIllnessContent(fullContent || docs[i]);
                console.log(`[RAG DISEASE] Vector fallback matched "${dname}"`);
                return {
                    name:         dname,
                    indikasi:     parsed.indikasi     || '',
                    gejala_umum:  parsed.gejala_umum  || '',
                    penanganan:   parsed.penanganan   || '',
                    obat_terkait: parsed.obat_terkait || '',
                    peringatan:   parsed.peringatan   || '',
                    raw_content:  fullContent || docs[i],
                };
            }
        }
    } catch (e) {
        console.warn(`[RAG DISEASE] Vector fallback failed:`, e.message);
    }

    console.warn(`[RAG DISEASE] No match found for "${query}"`);
    return null;
};

// ─── CHATBOT CONTEXT BUILDER ──────────────────────────────────────────────────

/**
 * Build RAG context string for the chatbot LLM prompt.
 *
 * @param {string} classification - 'OBAT' | 'PENYAKIT' (from Gemini classifier)
 * @param {string} keyword        - Primary search keyword
 * @param {object} patientProfile - Patient profile for allergy check (optional)
 * @returns {string} Formatted context string, or '' if nothing found
 */
const buildChatbotContext = async (classification, keyword, patientProfile = null) => {
    if (!keyword?.trim()) return '';

    try {
        if (classification === 'OBAT') {
            const drug = await searchDrug(keyword);
            if (!drug) {
                // Fallback: try disease collection with has_drugs=true
                return await _buildDrugFallbackFromCondition(keyword);
            }

            const allergyCheck = patientProfile ? checkDrugAllergy(drug, patientProfile) : { hasAllergy: false };
            const lines = [
                `Informasi Obat: ${drug.nama_obat}`,
                drug.kategori     ? `Kategori: ${drug.kategori}`          : '',
                drug.indikasi     ? `Indikasi: ${drug.indikasi}`          : '',
                drug.komposisi    ? `Komposisi: ${drug.komposisi}`        : '',
                drug.dosis        ? `Dosis: ${drug.dosis}`                : '',
                drug.aturan_pakai ? `Aturan Pakai: ${drug.aturan_pakai}` : '',
                drug.efek_samping ? `Efek Samping: ${drug.efek_samping}` : '',
                drug.peringatan   ? `Peringatan: ${drug.peringatan}`      : '',
                allergyCheck.hasAllergy ? `⚠️ ${allergyCheck.details}`   : '',
            ].filter(Boolean).join('\n');

            console.log(`[RAG CHATBOT] OBAT context built for "${drug.nama_obat}"`);
            return `=== REFERENSI OBAT ===\n${lines}\n\n`;

        } else {
            // PENYAKIT (default)
            const disease = await searchDisease(keyword);
            if (!disease) return '';

            const lines = [
                `Kondisi: ${disease.name}`,
                disease.indikasi     ? `Definisi: ${disease.indikasi}`         : '',
                disease.gejala_umum  ? `Gejala: ${disease.gejala_umum}`        : '',
                disease.penanganan   ? `Penanganan: ${disease.penanganan}`      : '',
                disease.obat_terkait ? `Obat Terkait: ${disease.obat_terkait}` : '',
                disease.peringatan   ? `Peringatan: ${disease.peringatan}`      : '',
            ].filter(Boolean).join('\n');

            console.log(`[RAG CHATBOT] PENYAKIT context built for "${disease.name}"`);
            return `=== REFERENSI KONDISI MEDIS ===\n${lines}\n\n`;
        }
    } catch (e) {
        console.error('[RAG CHATBOT] buildChatbotContext error:', e.message);
        return '';
    }
};

/**
 * Fallback: search drug info from RAG-TemanPulih (condition collection)
 * where has_drugs = true, using vector search on the keyword.
 */
const _buildDrugFallbackFromCondition = async (keyword) => {
    try {
        const condCol = await getChromaCollection(process.env.CHROMA_DATABASE || 'RAG-TemanPulih');
        if (!condCol) return '';

        const queries = buildQueryList(keyword).slice(0, 3);
        const result  = await condCol.query({
            queryTexts: queries,
            nResults: 5,
            where: { has_drugs: { $eq: true } },
        });

        const docs = result?.documents?.flat().filter(Boolean) || [];
        if (!docs.length) return '';

        const combined = docs.slice(0, 3).join('\n---\n');
        console.log(`[RAG CHATBOT] Drug fallback from condition collection for "${keyword}"`);
        return `=== REFERENSI OBAT (dari kondisi medis) ===\n${combined}\n\n`;
    } catch (e) {
        console.warn(`[RAG CHATBOT] Drug fallback from condition failed:`, e.message);
        return '';
    }
};

module.exports = {
    searchDrug,
    searchDrugsList,
    searchDisease,
    searchDiseaseBySymptoms,
    buildSymptomDifferentialContext,
    buildChatbotContext,
    checkDrugAllergy,
    enrichDrugDetails,
    getPatientContextText,
};

