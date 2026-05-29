/**
 * diseaseSearchService.js — Disease/condition search with drug cross-referencing
 *
 * Single responsibility: searchDisease, searchDiseaseBySymptoms, buildSymptomDifferentialContext
 * Cross-references diseases with drugs from all 3 drug collections.
 */

const {
    getChromaCollection, COLLECTIONS,
    getDiseaseNames, fuzzyMatchName,
    getDocsByDiseaseName, queryDiseasesBySymptoms,
    vectorQuery, searchAllDrugCollections,
} = require('../helpers/chromaHelper');

const { normalizeText, parseIllnessContent } = require('../helpers/ragUtils');

// ─── GEMINI NORMALIZER (disease) ─────────────────────────────────────────────

const _geminiNormalizeDisease = async (query) => {
    try {
        const { genAI } = require('./chatbotService');
        const prompt = `Pengguna mencari kondisi: "${query}". Berikan 1-2 kemungkinan nama penyakit/kondisi medis Indonesia yang paling relevan. HANYA kembalikan array JSON string. Contoh: ["maag"]. Tanpa penjelasan.`;
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
        console.warn(`[RAG DISEASE] Gemini normalize failed:`, e.message);
    }
    return [];
};

// ─── searchDisease (single best match) ──────────────────────────────────────

const searchDisease = async (query) => {
    if (!query?.trim()) return null;

    const condCol = await getChromaCollection(COLLECTIONS.DISEASE);
    if (!condCol) return null;

    // Step 1: Fuzzy match against cached disease names
    const diseaseNames = await getDiseaseNames();
    const matches = fuzzyMatchName(query, diseaseNames, 1);
    const bestMatch = matches[0]?.name || null;

    if (bestMatch) {
        console.log(`[RAG DISEASE] "${query}" → matched "${bestMatch}" (${matches[0].type})`);
        const fullContent = await getDocsByDiseaseName(condCol, bestMatch);
        if (fullContent) {
            const parsed = parseIllnessContent(fullContent);
            // Cross-reference: find related drugs from all 3 drug collections
            if (!parsed.obat_terkait) {
                try {
                    const drugHits = await searchAllDrugCollections(bestMatch, 3);
                    if (drugHits.length > 0) {
                        parsed.obat_terkait = drugHits.map(h => h.name).join(', ');
                    }
                } catch (e) { /* ignore cross-ref failures */ }
            }
            return { name: bestMatch, ...parsed, raw_content: fullContent };
        }
    }

    // Step 2: Vector fallback
    console.log(`[RAG DISEASE] No metadata match for "${query}", trying vector fallback...`);
    try {
        const { docs, metas } = await vectorQuery(condCol, query, 5);
        for (let i = 0; i < docs.length; i++) {
            const dname = metas[i]?.disease_name;
            if (!dname) continue;
            const normDname = normalizeText(dname);
            const normQuery = normalizeText(query);
            if (normDname.includes(normQuery) || normQuery.includes(normDname)) {
                const fullContent = await getDocsByDiseaseName(condCol, dname);
                const parsed = parseIllnessContent(fullContent || docs[i]);
                console.log(`[RAG DISEASE] Vector fallback matched "${dname}"`);
                return { name: dname, ...parsed, raw_content: fullContent || docs[i] };
            }
        }
    } catch (e) {
        console.warn(`[RAG DISEASE] Vector fallback failed:`, e.message);
    }

    console.warn(`[RAG DISEASE] No match found for "${query}" — returning null`);
    return null;
};

// ─── searchDiseaseBySymptoms ─────────────────────────────────────────────────

const searchDiseaseBySymptoms = async (symptoms) => {
    if (!symptoms?.length) return [];

    const condCol = await getChromaCollection(COLLECTIONS.DISEASE);
    if (!condCol) return [];

    const diseaseNames = await getDiseaseNames();
    const resultsMap = new Map();

    const upsert = (name, parsed, rawContent, score, matched) => {
        const prev = resultsMap.get(name);
        if (!prev) {
            resultsMap.set(name, {
                name, indikasi: parsed.indikasi || '', gejala_umum: parsed.gejala_umum || '',
                penanganan: parsed.penanganan || '', obat_terkait: parsed.obat_terkait || '',
                peringatan: parsed.peringatan || '', raw_content: rawContent,
                score, matchedSymptoms: matched,
            });
        } else {
            prev.matchedSymptoms = [...new Set([...prev.matchedSymptoms, ...matched])];
            prev.score = Math.max(prev.score, score);
        }
    };

    // Strategy 1: Gemini prediction → fuzzy match
    const geminiPredicted = await _geminiNormalizeDisease(symptoms.join(', '));
    const s1Candidates = new Set();
    for (const term of geminiPredicted) {
        for (const m of fuzzyMatchName(term, diseaseNames, 2)) s1Candidates.add(m.name);
    }

    await Promise.allSettled(Array.from(s1Candidates).map(async (name) => {
        const fullContent = await getDocsByDiseaseName(condCol, name);
        if (fullContent) {
            upsert(name, parseIllnessContent(fullContent), fullContent, 90, symptoms);
        }
    }));

    // Strategy 2: Vector search with combined symptom query
    try {
        const { docs, metas, distances } = await queryDiseasesBySymptoms(condCol, symptoms, 12);
        const candidates = new Map();
        for (let i = 0; i < docs.length; i++) {
            const dname = metas[i]?.disease_name;
            if (dname && !candidates.has(dname)) candidates.set(dname, { doc: docs[i], dist: distances[i] });
        }

        await Promise.allSettled(Array.from(candidates.entries()).map(async ([dname, { doc, dist }]) => {
            const fullContent = await getDocsByDiseaseName(condCol, dname).catch(() => doc);
            const parsed = parseIllnessContent(fullContent || doc);
            const maxDistScore = Math.max(0, 100 - (dist * 100));
            const normContent = normalizeText(fullContent || doc);
            const tokens = symptoms.map(s => s.toLowerCase().split(/\s+/).filter(w => w.length > 3)).flat();
            const uniqueMatched = [...new Set(tokens.filter(w => normContent.includes(w)))];
            upsert(dname, parsed, fullContent || doc, maxDistScore + uniqueMatched.length * 10, symptoms);
        }));
    } catch (e) {
        console.warn('[RAG SYMPTOMS] Vector search failed:', e.message);
    }

    // Strategy 3: Re-rank by gejala_umum field overlap
    for (const entry of resultsMap.values()) {
        if (entry.gejala_umum) {
            const normGejala = normalizeText(entry.gejala_umum);
            const tokens = symptoms.map(s => s.toLowerCase().split(/\s+/).filter(w => w.length > 3)).flat();
            const matched = [...new Set(tokens.filter(w => normGejala.includes(w)))];
            if (matched.length > 0) entry.score += matched.length * 15;
        }
    }

    // Top 3, then cross-reference with drug collections for obat_terkait
    const ranked = Array.from(resultsMap.values()).sort((a, b) => b.score - a.score).slice(0, 3);

    await Promise.allSettled(ranked.map(async (disease) => {
        if (disease.obat_terkait) return;
        try {
            const hits = await searchAllDrugCollections(disease.name, 3);
            if (hits.length > 0) disease.obat_terkait = hits.map(h => h.name).join(', ');
        } catch (e) { /* ignore */ }
    }));

    if (ranked.length > 0) {
        console.log(`[RAG SYMPTOMS] Top: ${ranked.map(d => `${d.name}(${d.score})`).join(', ')}`);
    }
    return ranked;
};

// ─── buildSymptomDifferentialContext ──────────────────────────────────────────

const buildSymptomDifferentialContext = async (symptoms) => {
    if (!symptoms?.length) return '';
    try {
        const diseases = await searchDiseaseBySymptoms(symptoms);
        if (!diseases.length) return '';

        let ctx = `=== REFERENSI KONDISI MEDIS (Berdasarkan Gejala: ${symptoms.join(', ')}) ===\n`;
        for (let i = 0; i < diseases.length; i++) {
            const d = diseases[i];
            const label = i === 0 ? '[KEMUNGKINAN UTAMA]' : '[KEMUNGKINAN LAIN]';
            const lines = [
                `${label} Kondisi: ${d.name}`,
                d.matchedSymptoms?.length ? `Gejala Cocok: ${d.matchedSymptoms.join(', ')}` : '',
                d.indikasi     ? `Definisi: ${d.indikasi}` : '',
                d.gejala_umum  ? `Gejala Umum: ${d.gejala_umum}` : '',
                d.penanganan   ? `Penanganan: ${d.penanganan}` : '',
                d.obat_terkait ? `Obat Terkait: ${d.obat_terkait}` : '',
                d.peringatan   ? `Peringatan: ${d.peringatan}` : '',
            ].filter(Boolean).join('\n');
            ctx += `${lines}\n---\n`;
        }
        return ctx + '\n';
    } catch (e) {
        console.error('[RAG SYMPTOMS] buildSymptomDifferentialContext error:', e.message);
        return '';
    }
};

module.exports = { searchDisease, searchDiseaseBySymptoms, buildSymptomDifferentialContext };
