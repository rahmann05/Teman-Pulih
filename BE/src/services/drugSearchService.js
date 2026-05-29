/**
 * drugSearchService.js — Drug search across all 3 ChromaDB collections
 *
 * Single responsibility: searchDrug (single best), searchDrugsList (multiple results)
 * Anti-hallucination: returns null/[] when no RAG match — never synthesizes.
 * Anti-timeout: concurrent queries via Promise.allSettled, no exhaustive scans.
 */

const {
    getChromaCollection, COLLECTIONS,
    getDrugNames, fuzzyMatchName,
    getDocsByDrugName, searchAllDrugCollections, checkDrugAvailability,
} = require('../helpers/chromaHelper');

const { normalizeText, parseDrugContent } = require('../helpers/ragUtils');

// ─── GEMINI QUERY NORMALIZER (lightweight, no synthesis) ─────────────────────

/**
 * Use Gemini ONLY to map colloquial/brand names to standard medical terms.
 * 3s timeout, never generates drug info — only returns candidate names.
 */
const _geminiNormalizeDrug = async (query) => {
    try {
        const { genAI } = require('./chatbotService');
        const prompt = `Pengguna mencari obat: "${query}". Berikan 1-2 kemungkinan nama obat generik Indonesia yang paling relevan. HANYA kembalikan array JSON string. Contoh: ["parasetamol"]. Tanpa penjelasan.`;
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash-lite',
            generationConfig: { temperature: 0.1, maxOutputTokens: 100 }
        });
        const result = await Promise.race([
            model.generateContent(prompt),
            new Promise((_, rej) => setTimeout(() => rej(new Error('Gemini timeout')), 3000))
        ]);
        const text = result.response.text().trim();
        const match = text.match(/\[.*\]/s);
        if (match) return JSON.parse(match[0]).filter(s => typeof s === 'string' && s.length >= 2);
    } catch (e) {
        console.warn(`[RAG DRUG] Gemini normalize failed:`, e.message);
    }
    return [];
};

// ─── FORMULARY PARSER ─────────────────────────────────────────────────────────

/** Parse a Puskesmas/RS formulary document (Kategori, Kelas Terapi, Nama Generik, Formulasi). */
const parseFormularyDoc = (doc, meta = {}) => {
    if (!doc) return {};
    const result = {};
    for (const line of doc.split('\n')) {
        const [key, ...valParts] = line.split(':');
        if (!key || !valParts.length) continue;
        const k = key.trim().toLowerCase();
        const v = valParts.join(':').trim();
        if (k === 'kelas terapi') result.kelas_terapi = v;
        if (k === 'nama generik') result.nama_generik = v;
        if (k === 'formulasi')    result.formulasi = v;
        if (k === 'kategori')     result.kategori_fasilitas = v;
    }
    result.kelas_terapi = result.kelas_terapi || meta.kelas_terapi || '';
    return result;
};

const _formatAvailability = (avail) => {
    if (!avail) return '';
    const parts = [];
    if (avail.puskesmas) parts.push('Puskesmas');
    if (avail.rs) parts.push('Rumah Sakit');
    return parts.join(', ');
};

// ─── searchDrug (single best match) ──────────────────────────────────────────

/**
 * Search for drug information across all 3 collections.
 * Strategy: fuzzy match → metadata fetch (detail first) → vector fallback.
 * Returns null if nothing found — NEVER synthesizes from Gemini.
 */
const searchDrug = async (query) => {
    if (!query?.trim()) return null;

    // Step 1: Gemini normalization (non-blocking, 3s timeout)
    const geminiNames = await _geminiNormalizeDrug(query);

    // Step 2: Fuzzy match against cached drug names from all 3 collections
    const drugNames = await getDrugNames();
    const searchTerms = [query.trim(), ...geminiNames].filter(Boolean);

    for (const term of searchTerms) {
        const matches = fuzzyMatchName(term, drugNames, 1);
        const bestMatch = matches[0]?.name;
        if (!bestMatch) continue;

        console.log(`[RAG DRUG] "${term}" → matched "${bestMatch}" (${matches[0].type})`);

        // Try detail collection first for rich clinical info
        const detailCol = await getChromaCollection(COLLECTIONS.DRUG_DETAIL);
        if (detailCol) {
            const fullContent = await getDocsByDrugName(detailCol, bestMatch).catch(() => '');
            if (fullContent) {
                const parsed = parseDrugContent(fullContent);
                const availability = await checkDrugAvailability(bestMatch).catch(() => ({}));
                return {
                    nama_obat: bestMatch, ...parsed,
                    raw_content: fullContent,
                    tersedia_di: _formatAvailability(availability),
                };
            }
        }

        // Fallback: try formulary collections
        const puskCol = await getChromaCollection(COLLECTIONS.DRUG_PUSKESMAS);
        const rsCol   = await getChromaCollection(COLLECTIONS.DRUG_RS);
        for (const [col, label] of [[puskCol, 'Puskesmas'], [rsCol, 'Rumah Sakit']]) {
            if (!col) continue;
            const content = await getDocsByDrugName(col, bestMatch).catch(() => '');
            if (content) {
                const formulary = parseFormularyDoc(content);
                return {
                    nama_obat: bestMatch,
                    kategori: formulary.kelas_terapi || '',
                    formulasi: formulary.formulasi || '',
                    tersedia_di: label,
                    raw_content: content,
                };
            }
        }
    }

    // Step 3: Multi-collection vector search fallback
    console.log(`[RAG DRUG] No fuzzy match for "${query}", trying vector search...`);
    const vectorHits = await searchAllDrugCollections(query, 6);
    if (vectorHits.length > 0) {
        const best = vectorHits[0];
        const content = best.detailDoc || best.doc;
        const parsed = best.detailDoc ? parseDrugContent(best.detailDoc) : parseFormularyDoc(best.doc, best.meta);
        return {
            nama_obat: best.name, ...parsed,
            raw_content: content,
            tersedia_di: best.sources.map(s => s === 'puskesmas' ? 'Puskesmas' : s === 'rs' ? 'Rumah Sakit' : 'Detail').join(', '),
        };
    }

    console.warn(`[RAG DRUG] No match found for "${query}" — returning null (no hallucination)`);
    return null;
};

// ─── searchDrugsList (multiple matches) ──────────────────────────────────────

const searchDrugsList = async (query) => {
    if (!query?.trim()) return [];
    const resultsMap = new Map();

    const addResult = (name, parsed, doc, availability = '') => {
        if (!resultsMap.has(name)) {
            resultsMap.set(name, {
                nama_obat: name,
                kategori:       parsed.kategori       || parsed.kelas_terapi || '',
                indikasi:       parsed.indikasi       || '',
                komposisi:      parsed.komposisi      || '',
                dosis:          parsed.dosis          || '',
                aturan_pakai:   parsed.aturan_pakai   || '',
                efek_samping:   parsed.efek_samping   || '',
                kontraindikasi: parsed.kontraindikasi || '',
                peringatan:     parsed.peringatan     || '',
                formulasi:      parsed.formulasi      || '',
                tersedia_di:    availability,
                raw_content:    doc,
            });
        }
    };

    // Step 1: Gemini normalization
    const geminiNames = await _geminiNormalizeDrug(query);

    // Step 2: Fuzzy match against all drug names
    const drugNames = await getDrugNames();
    const searchTerms = [query.trim(), ...geminiNames].filter(Boolean);
    const uniqueMatches = new Set();
    for (const term of searchTerms) {
        for (const m of fuzzyMatchName(term, drugNames, 5)) uniqueMatches.add(m.name);
    }

    // Step 3: Fetch matched drugs (prefer detail collection for clinical info)
    if (uniqueMatches.size > 0) {
        const detailCol = await getChromaCollection(COLLECTIONS.DRUG_DETAIL);
        await Promise.allSettled(Array.from(uniqueMatches).map(async (name) => {
            if (detailCol) {
                const fullContent = await getDocsByDrugName(detailCol, name).catch(() => '');
                if (fullContent) {
                    const parsed = parseDrugContent(fullContent);
                    const avail = await checkDrugAvailability(name).catch(() => ({}));
                    addResult(name, parsed, fullContent, _formatAvailability(avail));
                    return;
                }
            }
            // Fallback: check formulary collections
            const puskCol = await getChromaCollection(COLLECTIONS.DRUG_PUSKESMAS);
            const rsCol   = await getChromaCollection(COLLECTIONS.DRUG_RS);
            for (const [col, label] of [[puskCol, 'Puskesmas'], [rsCol, 'Rumah Sakit']]) {
                if (!col) continue;
                const content = await getDocsByDrugName(col, name).catch(() => '');
                if (content) {
                    addResult(name, parseFormularyDoc(content), content, label);
                    break;
                }
            }
        }));
    }

    // Step 4: Multi-collection vector search for additional results
    if (resultsMap.size < 3) {
        const vectorHits = await searchAllDrugCollections(query, 8);
        for (const hit of vectorHits) {
            if (resultsMap.has(hit.name)) continue;
            const parsed = hit.detailDoc ? parseDrugContent(hit.detailDoc) : parseFormularyDoc(hit.doc, hit.meta);
            const avail = hit.sources.filter(s => s !== 'detail').map(s => s === 'puskesmas' ? 'Puskesmas' : 'Rumah Sakit').join(', ');
            addResult(hit.name, parsed, hit.detailDoc || hit.doc, avail);
        }
    }

    return Array.from(resultsMap.values());
};

module.exports = { searchDrug, searchDrugsList, parseFormularyDoc };
