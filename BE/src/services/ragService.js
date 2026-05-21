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
} = require('../helpers/chromaHelper');

const {
    normalizeText,
    buildQueryList,
    parseDrugContent,
    parseIllnessContent,
} = require('../helpers/ragUtils');

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

    const drugCol = await getChromaCollection(process.env.CHROMA_DATABASE_DRUGS || 'RAG-TemanPulih-Obat');
    if (!drugCol) return null;

    // Step 1: Fuzzy match against cached drug names
    const drugNames = await getDrugNames();
    const matches   = fuzzyMatchName(query, drugNames, 1);
    const bestMatch = matches[0]?.name || null;

    if (bestMatch) {
        console.log(`[RAG DRUG] "${query}" → matched "${bestMatch}" (${matches[0].type})`);
        const fullContent = await getDocsByDrugName(drugCol, bestMatch);
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

    // Step 2: Vector fallback — check nama_obat match first
    console.log(`[RAG DRUG] No metadata match for "${query}", trying vector fallback...`);
    const komposisiMatches = []; // collect drugs that match by komposisi
    try {
        const queries = buildQueryList(query).slice(0, 4);
        const result  = await drugCol.query({ queryTexts: queries, nResults: 10 });
        const docs  = result?.documents?.flat().filter(Boolean) || [];
        const metas = result?.metadatas?.flat() || [];

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

    // Step 3: Komposisi/ingredient match — return first drug that contains this ingredient
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

    console.warn(`[RAG DRUG] No match found for "${query}"`);
    return null;
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
        const docs  = result?.documents?.flat().filter(Boolean) || [];
        const metas = result?.metadatas?.flat() || [];

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
    searchDisease,
    buildChatbotContext,
    checkDrugAllergy,
    enrichDrugDetails,
    getPatientContextText,
};
