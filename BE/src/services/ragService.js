/**
 * ragService.js — RAG (Retrieval-Augmented Generation) search service
 *
 * Single Responsibility: ChromaDB dual-collection search, relevance ranking,
 * drug enrichment, drug cross-reference, and RAG context building for chatbot.
 *
 * Does NOT handle: CRUD operations, HTTP, AI model calls, EMR context.
 */
const db = require('../config/db');
const { getChromaCollection, getFullDrugContent, getFullConditionContent } = require('../helpers/chromaHelper');
const {
    normalizeText,
    buildQueryList,
    softScore,
    isSoftRelevant,
    scoreDrugMatch,
    scoreConditionMatch,
    parseDrugContent,
} = require('../helpers/ragUtils');

// ─── INTERNAL HELPERS ─────────────────────────────────────────────────────────

/** Build a single patient context string for scoring bonus */
const getPatientContextText = (profile) => {
    if (!profile) return '';
    return [
        profile.chronic_conditions,
        profile.past_illnesses,
        profile.last_illness,
        profile.routine_medications,
    ].filter(Boolean).join(' ');
};

/** Try to parse drug-like data from a general condition document */
const parseGeneralContentToDrug = (content) => {
    if (!content) return null;
    const parsed = parseDrugContent(content);
    if (parsed.nama_obat) return parsed;
    const match = content.match(/Obat Terkait:\s*([^\n.]+)/i);
    if (match) return { ...parsed, nama_obat: match[1].trim() };
    return null;
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
 * Preserves existing fields — only fills in what's empty.
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

// ─── DRUG CROSS-REFERENCE ─────────────────────────────────────────────────────

/**
 * Fetch drugs relevant to a condition from RAG-TemanPulih-Obat.
 *
 * Two-layer strategy:
 *   Layer 1 — Semantic search with condition name
 *             (finds drugs whose "Indikasi" field mentions this condition)
 *   Layer 2 — Explicit "Obat Terkait: X" mentions in condition content
 *             (verified by lookup in drug collection)
 *
 * @param {object} drugCol     - ChromaDB drug collection
 * @param {string} illnessName - Condition name to search for
 * @param {string} condContent - Full merged condition content (for Layer 2)
 * @returns {object[]} Array of drug objects
 */
const fetchDrugsForCondition = async (drugCol, illnessName, condContent = '') => {
    if (!drugCol) return [];
    const drugs    = [];
    const seenDrugs = new Set();

    try {
        // ── Layer 1: Semantic search ──
        const queries  = buildQueryList(illnessName).slice(0, 4);
        const semResult = await drugCol.query({ queryTexts: queries, nResults: 6 });
        const semDocs   = semResult?.documents?.flat().filter(Boolean) || [];
        const semMetas  = semResult?.metadatas?.flat()                  || [];
        const semDists  = semResult?.distances?.flat()                  || [];

        for (let i = 0; i < semDocs.length; i++) {
            const doc      = semDocs[i];
            const meta     = semMetas[i] || {};
            const dist     = semDists[i] ?? null;
            const parsed   = parseDrugContent(doc);
            const nameToUse = meta.nama_obat || parsed.nama_obat;
            if (!nameToUse) continue;

            const key = normalizeText(nameToUse);
            if (seenDrugs.has(key)) continue;

            const score = softScore(illnessName, doc, dist, queries);
            if (!isSoftRelevant(score, dist)) continue;
            seenDrugs.add(key);

            let fullContent = doc;
            if (meta.source_id) fullContent = await getFullDrugContent(drugCol, meta.source_id, doc);
            const fullParsed = parseDrugContent(fullContent);

            drugs.push({
                nama_obat:    meta.nama_obat    || fullParsed.nama_obat    || nameToUse,
                kategori:     meta.kategori     || fullParsed.kategori     || '',
                indikasi:     fullParsed.indikasi    || parsed.indikasi    || '',
                komposisi:    fullParsed.komposisi   || parsed.komposisi   || '',
                dosis:        fullParsed.dosis        || parsed.dosis      || '',
                aturan_pakai: fullParsed.aturan_pakai || parsed.aturan_pakai || '',
                efek_samping: fullParsed.efek_samping  || parsed.efek_samping  || '',
                distance: dist,
            });
            if (drugs.length >= 5) break;
        }

        // ── Layer 2: Explicit "Obat Terkait:" lookup ──
        if (condContent) {
            const mentions = [...condContent.matchAll(/Obat Terkait[:\s]+([^\n.]+)/gi)];
            for (const match of mentions) {
                const drugName = match[1]?.trim();
                if (!drugName) continue;
                const key = normalizeText(drugName);
                if (seenDrugs.has(key)) continue;

                try {
                    const res   = await drugCol.query({ queryTexts: [drugName], nResults: 2 });
                    const docs  = res?.documents?.[0]  || [];
                    const metas = res?.metadatas?.[0]  || [];
                    const dists = res?.distances?.[0]  || [];

                    for (let j = 0; j < docs.length; j++) {
                        if (!docs[j]) continue;
                        const lParsed = parseDrugContent(docs[j]);
                        const lName   = metas[j]?.nama_obat || lParsed.nama_obat || drugName;
                        const lKey    = normalizeText(lName);
                        if (seenDrugs.has(lKey)) continue;

                        const nameMatch = lKey.includes(key) || key.includes(lKey);
                        if (!nameMatch && (dists[j] ?? 1) > 0.6) continue;

                        seenDrugs.add(lKey);
                        let fullContent = docs[j];
                        if (metas[j]?.source_id) {
                            fullContent = await getFullDrugContent(drugCol, metas[j].source_id, docs[j]);
                        }
                        const fullParsed = parseDrugContent(fullContent);
                        drugs.push({
                            nama_obat:    lName,
                            kategori:     metas[j]?.kategori || fullParsed.kategori || '',
                            indikasi:     fullParsed.indikasi     || lParsed.indikasi     || '',
                            komposisi:    fullParsed.komposisi    || lParsed.komposisi    || '',
                            dosis:        fullParsed.dosis        || lParsed.dosis        || '',
                            aturan_pakai: fullParsed.aturan_pakai || lParsed.aturan_pakai || '',
                            efek_samping: fullParsed.efek_samping  || lParsed.efek_samping  || '',
                            distance: dists[j] ?? null,
                            is_from_explicit_mention: true,
                        });
                        break; // satu match per drugName
                    }
                } catch (_) { /* abaikan */ }
            }
        }
    } catch (e) {
        console.warn(`[RAG] fetchDrugsForCondition error for "${illnessName}":`, e.message);
    }

    return drugs;
};

// ─── MAIN DUAL-COLLECTION SEARCH ──────────────────────────────────────────────

/**
 * searchChroma — Main RAG search across both collections.
 *
 * Flow:
 *   Phase 1 — Parallel query to RAG-TemanPulih-Obat + RAG-TemanPulih
 *   Phase 2 — Process drug results with soft relevance gate
 *   Phase 3 — Process condition results with chunk merging (all chunk_index)
 *   Phase 4 — Cross-reference condition "Obat Terkait" → drug collection
 *   Phase 5 — Fallback: parse drug info from condition content if obat < 2
 *   Phase 6 — Score, rank, return top results
 *
 * @returns {{ obat: object[], kondisi: object[] }}
 */
const searchChroma = async (queryText, user = null, supabase = null, targetPatientId = null) => {
    if (!queryText?.trim()) return { obat: [], kondisi: [] };

    const [drugCol, condCol] = await Promise.all([
        getChromaCollection(process.env.CHROMA_DATABASE_DRUGS || 'RAG-TemanPulih-Obat'),
        getChromaCollection(process.env.CHROMA_DATABASE       || 'RAG-TemanPulih'),
    ]);

    // Load patient profile for allergy check + scoring bonus
    let patientProfile = null;
    if (user && supabase && targetPatientId) {
        try {
            const { rows } = await db.query(
                'SELECT chronic_conditions, allergies, past_illnesses, last_illness, routine_medications FROM profiles WHERE user_id = $1',
                [targetPatientId]
            );
            patientProfile = rows[0] || null;
        } catch (e) { console.warn('[RAG] Failed to fetch patient profile:', e.message); }
    }

    const expandedQueries = buildQueryList(queryText);
    const dedupedQueries  = Array.from(
        new Set([queryText, ...expandedQueries].map(q => q.trim()).filter(Boolean))
    );
    console.log(`[RAG] Query: "${queryText}" → [${dedupedQueries.slice(0, 4).join(', ')}...]`);

    // ── Phase 1: Parallel search ──
    const [hasilObat, hasilKondisi] = await Promise.allSettled([
        drugCol ? drugCol.query({ queryTexts: dedupedQueries, nResults: 25 }) : Promise.resolve(null),
        condCol ? condCol.query({ queryTexts: dedupedQueries, nResults: 20 }) : Promise.resolve(null),
    ]);

    // ── Phase 2: Drug results — parse, dedup, soft gate ──
    const rawObatList = [];
    if (hasilObat.status === 'fulfilled' && hasilObat.value) {
        const r = hasilObat.value;
        for (let q = 0; q < (r.ids || []).length; q++) {
            const ids   = r.ids[q]       || [];
            const docs  = r.documents[q] || [];
            const metas = r.metadatas[q] || [];
            const dists = r.distances?.[q] || [];

            for (let i = 0; i < docs.length; i++) {
                if (!docs[i]) continue;
                const parsed    = parseDrugContent(docs[i]);
                const nameToUse = metas[i]?.nama_obat || parsed.nama_obat || '';
                if (!nameToUse) continue;

                const alreadyAdded = rawObatList.some(
                    o => normalizeText(o.nama_obat) === normalizeText(nameToUse)
                );
                if (alreadyAdded) continue;

                const candidate = {
                    id:           ids[i],
                    raw_content:  docs[i],
                    nama_obat:    nameToUse,
                    source_id:    metas[i]?.source_id || null,
                    kategori:     metas[i]?.kategori || parsed.kategori     || '',
                    indikasi:     parsed.indikasi    || '',
                    komposisi:    parsed.komposisi   || '',
                    dosis:        parsed.dosis       || '',
                    aturan_pakai: parsed.aturan_pakai || '',
                    efek_samping: parsed.efek_samping || '',
                    distance:     dists[i] !== undefined ? dists[i] : null,
                };

                const score = scoreDrugMatch(queryText, candidate);
                if (!isSoftRelevant(score, candidate.distance)) continue;
                rawObatList.push(candidate);
            }
        }
    }

    // Enrich drugs (fetch all chunks for missing structured fields)
    const obatList   = [];
    let enrichCount  = 0;
    for (const drug of rawObatList) {
        let enriched = drug;
        if (
            enrichCount < 10 && drug.source_id &&
            !(drug.kategori || drug.indikasi || drug.komposisi || drug.aturan_pakai || drug.dosis)
        ) {
            enriched = await enrichDrugDetails(drug, drugCol);
            enrichCount++;
        }
        if (isSoftRelevant(scoreDrugMatch(queryText, enriched), enriched.distance)) {
            const allergyCheck = checkDrugAllergy(enriched, patientProfile);
            enriched.allergy_warning = allergyCheck.hasAllergy ? allergyCheck.details : null;
            obatList.push(enriched);
        }
    }
    console.log(`[RAG] Drug: ${rawObatList.length} candidates → ${obatList.length} after soft gate`);

    // ── Phase 3: Condition results — chunk merging by source_id ──
    const rawKondisiList = [];
    if (hasilKondisi.status === 'fulfilled' && hasilKondisi.value) {
        const r            = hasilKondisi.value;
        const seenIds      = new Set();
        const seenSourceIds = new Set();

        for (let q = 0; q < (r.ids || []).length; q++) {
            const ids   = r.ids[q]       || [];
            const docs  = r.documents[q] || [];
            const metas = r.metadatas[q] || [];
            const dists = r.distances?.[q] || [];

            for (let i = 0; i < docs.length; i++) {
                if (!docs[i] || seenIds.has(ids[i])) continue;
                seenIds.add(ids[i]);

                const sourceId = metas[i]?.source_id || null;
                if (sourceId && seenSourceIds.has(sourceId)) continue; // sama penyakit beda chunk

                const dist      = dists[i] !== undefined ? dists[i] : null;
                const condScore = softScore(queryText, docs[i], dist, expandedQueries);
                if (!isSoftRelevant(condScore, dist)) continue;

                // Fetch SEMUA chunk untuk penyakit ini (chunk_index 0, 1, 2, ...)
                let fullContent = docs[i];
                if (sourceId && condCol) {
                    fullContent = await getFullConditionContent(condCol, sourceId, docs[i]);
                    seenSourceIds.add(sourceId);
                }

                rawKondisiList.push({
                    id:        ids[i],
                    content:   fullContent,
                    source:    metas[i]?.source   || '',
                    source_id: sourceId,
                    distance:  dist,
                });
            }
        }
    }
    console.log(`[RAG] Condition: ${rawKondisiList.length} results (chunk-merged)`);

    // ── Phase 4: Cross-reference "Obat Terkait" → drug collection ──
    const extractedDrugNames = [];
    for (const k of rawKondisiList) {
        const regex = /Obat Terkait:\s*([^.\n]+)/gi;
        let match;
        while ((match = regex.exec(k.content)) !== null) {
            const name = match[1]?.replace(/\.$/, '').trim();
            if (name && !extractedDrugNames.includes(name)) extractedDrugNames.push(name);
        }
    }

    if (extractedDrugNames.length > 0 && drugCol) {
        const lookups = extractedDrugNames
            .filter(dn => !obatList.some(o => normalizeText(o.nama_obat) === normalizeText(dn)))
            .map(dn => drugCol.query({ queryTexts: [dn], nResults: 2 })
                .then(res => ({ dn, res })).catch(() => null));

        const results = await Promise.all(lookups);
        for (const item of results) {
            if (!item?.res) continue;
            const ids   = item.res.ids[0]       || [];
            const docs  = item.res.documents[0] || [];
            const metas = item.res.metadatas[0] || [];
            const dists = item.res.distances?.[0] || [];

            for (let i = 0; i < docs.length; i++) {
                if (!docs[i]) continue;
                const parsed    = parseDrugContent(docs[i]);
                const nameToUse = metas[i]?.nama_obat || parsed.nama_obat || item.dn;
                const qClean    = normalizeText(item.dn);
                const nClean    = normalizeText(nameToUse);
                if (!nClean.includes(qClean) && !qClean.includes(nClean)) continue;

                const already = obatList.some(o => normalizeText(o.nama_obat) === normalizeText(nameToUse));
                if (already || !nameToUse) continue;

                const fullContent = await getFullDrugContent(drugCol, metas[i]?.source_id, docs[i]);
                const fullParsed  = parseDrugContent(fullContent);
                const drugObj = {
                    id:           ids[i],
                    raw_content:  fullContent,
                    nama_obat:    nameToUse,
                    source_id:    metas[i]?.source_id || null,
                    kategori:     metas[i]?.kategori || fullParsed.kategori || 'Medis (Terkait Kondisi)',
                    indikasi:     fullParsed.indikasi    || '',
                    komposisi:    fullParsed.komposisi   || '',
                    dosis:        fullParsed.dosis       || '',
                    aturan_pakai: fullParsed.aturan_pakai || '',
                    efek_samping: fullParsed.efek_samping || '',
                    distance:     dists[i] !== undefined ? dists[i] : null,
                    is_extracted_from_condition: true,
                };
                const allergyCheck = checkDrugAllergy(drugObj, patientProfile);
                drugObj.allergy_warning = allergyCheck.hasAllergy ? allergyCheck.details : null;
                obatList.push(drugObj);
            }
        }
    }

    // ── Phase 5: Fallback — parse drug from condition docs if obat still low ──
    if (obatList.length < 2 && drugCol) {
        console.log('[RAG] Drug count low, trying condition-doc fallback...');
        for (const cond of rawKondisiList) {
            if (!cond.content) continue;
            const general = parseGeneralContentToDrug(cond.content);
            if (!general?.nama_obat) continue;
            const already = obatList.some(o => normalizeText(o.nama_obat) === normalizeText(general.nama_obat));
            if (already) continue;

            try {
                const res = await drugCol.query({ queryTexts: [general.nama_obat], nResults: 1 });
                if (!res?.documents?.[0]?.[0]) continue;
                const lookupParsed = parseDrugContent(res.documents[0][0]);
                const lookupName   = res.metadatas[0]?.[0]?.nama_obat || lookupParsed.nama_obat || '';
                const lClean       = normalizeText(lookupName);
                const gClean       = normalizeText(general.nama_obat);
                if (!lClean.includes(gClean) && !gClean.includes(lClean)) continue;

                const fullContent = await getFullDrugContent(drugCol, res.metadatas[0]?.[0]?.source_id, res.documents[0][0]);
                const fullParsed  = parseDrugContent(fullContent);
                const drugObj = {
                    id:           res.ids[0][0],
                    raw_content:  fullContent,
                    nama_obat:    lookupName || general.nama_obat,
                    source_id:    res.metadatas[0]?.[0]?.source_id || null,
                    kategori:     fullParsed.kategori    || 'Medis',
                    indikasi:     fullParsed.indikasi    || '',
                    komposisi:    fullParsed.komposisi   || '',
                    dosis:        fullParsed.dosis       || '',
                    aturan_pakai: fullParsed.aturan_pakai || '',
                    efek_samping: fullParsed.efek_samping || '',
                    distance:     res.distances?.[0]?.[0] ?? null,
                    is_fallback_from_general: true,
                };
                const allergyCheck = checkDrugAllergy(drugObj, patientProfile);
                drugObj.allergy_warning = allergyCheck.hasAllergy ? allergyCheck.details : null;
                obatList.push(drugObj);
            } catch (e) {
                console.warn(`[RAG] Fallback lookup failed for "${general.nama_obat}":`, e.message);
            }
        }
        console.log(`[RAG] After fallback: ${obatList.length} drug results`);
    }

    // ── Phase 6: Score, rank, slice ──
    const patientContextText = getPatientContextText(patientProfile);

    const rankedObat = obatList
        .map(drug => ({ ...drug, match_score: scoreDrugMatch(queryText, drug, patientContextText) }))
        .filter(drug => drug.match_score > 0)
        .sort((a, b) => b.match_score - a.match_score)
        .slice(0, 5);

    const rankedKondisi = rawKondisiList
        .map(cond => ({ ...cond, match_score: scoreConditionMatch(queryText, cond, patientContextText, dedupedQueries) }))
        .filter(cond => cond.match_score >= 1)
        .sort((a, b) => b.match_score - a.match_score)
        .slice(0, 4);

    console.log(`[RAG] Final: ${rankedObat.length} obat (top: ${rankedObat[0]?.nama_obat || 'none'}), ${rankedKondisi.length} kondisi`);
    return { obat: rankedObat, kondisi: rankedKondisi };
};

// ─── RAG CONTEXT BUILDER ──────────────────────────────────────────────────────

/** Format searchChroma result object into a human-readable string for LLM prompt */
const formatChromaResult = (result) => {
    if (!result) return '';
    const obatItems    = result.obat    || [];
    const kondisiItems = result.kondisi || [];
    let ctx = '';

    if (kondisiItems.length > 0) {
        const text = kondisiItems.slice(0, 4).map(k => {
            const rel = (k.match_score > 8 || k.distance < 0.4) ? 'TINGGI'
                      : (k.match_score > 3 ? 'SEDANG' : 'REFERENSI');
            return `[Relevansi: ${rel}]\n${k.content}`;
        }).filter(Boolean).join('\n---\n');
        if (text) ctx += `=== REFERENSI KONDISI MEDIS ===\n${text}\n\n`;
    }

    if (obatItems.length > 0) {
        const text = obatItems.slice(0, 5).map(o => [
            `Informasi Obat: ${o.nama_obat}`,
            o.kategori     ? `Kategori: ${o.kategori}`          : '',
            o.indikasi     ? `Indikasi: ${o.indikasi}`          : '',
            o.komposisi    ? `Komposisi: ${o.komposisi}`        : '',
            o.dosis        ? `Dosis: ${o.dosis}`                : '',
            o.aturan_pakai ? `Aturan Pakai: ${o.aturan_pakai}` : '',
            o.efek_samping ? `Efek Samping: ${o.efek_samping}` : '',
            o.allergy_warning ? `⚠️ ${o.allergy_warning}`      : '',
        ].filter(Boolean).join('\n')).join('\n---\n');
        if (text) ctx += `=== REFERENSI OBAT & INTERAKSI ===\n${text}\n\n`;
    }
    return ctx;
};

/**
 * buildRagContext — 4-level fallback chain for chatbot.
 *
 * Level 1 — searchChroma(primaryQuery)  : dual-collection with soft scoring + chunk merge
 * Level 2 — searchChroma(rawMessage)   : retry with original user message
 * Level 3 — Direct parallel query      : no relevance filter, raw ChromaDB results
 * Level 4 — ''                         : controller falls back to SISTEM DARURAT mode
 *
 * @param {string[]} searchTerms        - Extracted keywords; [0] = primary query
 * @param {string}   routineMedications - Patient's routine meds (for drug query enrichment)
 * @param {object}   user               - User object (for patient profile lookup)
 * @param {object}   supabase           - Supabase client
 * @param {string}   targetPatientId    - Target patient ID
 * @param {string}   rawMessage         - Original user message (for L2 fallback)
 */
const buildRagContext = async (
    searchTerms, routineMedications,
    user = null, supabase = null, targetPatientId = null, rawMessage = ''
) => {
    const primaryQuery  = (searchTerms?.length > 0) ? searchTerms[0] : (rawMessage || '');
    const fallbackQuery = rawMessage || primaryQuery;

    // Level 1
    if (primaryQuery) {
        try {
            const result = await searchChroma(primaryQuery, user, supabase, targetPatientId);
            const ctx    = formatChromaResult(result);
            if (ctx) {
                console.log(`[RAG L1] OK: ${result.obat?.length} obat, ${result.kondisi?.length} kondisi`);
                return ctx;
            }
        } catch (e) { console.warn('[RAG L1] gagal:', e.message); }
    }

    // Level 2
    if (fallbackQuery && fallbackQuery !== primaryQuery) {
        try {
            console.log('[RAG L2] Retry dengan pesan asli...');
            const result2 = await searchChroma(fallbackQuery, user, supabase, targetPatientId);
            const ctx2    = formatChromaResult(result2);
            if (ctx2) { console.log('[RAG L2] Berhasil'); return ctx2; }
        } catch (e) { console.warn('[RAG L2] gagal:', e.message); }
    }

    // Level 3: Direct parallel query (no relevance filter)
    console.log('[RAG L3] Direct parallel query...');
    try {
        const [condCol, drugCol] = await Promise.all([
            getChromaCollection(process.env.CHROMA_DATABASE       || 'RAG-TemanPulih'),
            getChromaCollection(process.env.CHROMA_DATABASE_DRUGS || 'RAG-TemanPulih-Obat'),
        ]);

        const expandedTerms = buildQueryList(fallbackQuery || primaryQuery);
        const directQueries = [...new Set([...(searchTerms || []), ...expandedTerms])]
            .filter(Boolean).slice(0, 5);
        const obatQueries = [...directQueries];
        if (routineMedications?.length > 2) obatQueries.push(routineMedications);

        const [hasilKondisi, hasilObat] = await Promise.allSettled([
            condCol ? condCol.query({ queryTexts: directQueries, nResults: 4 }) : Promise.resolve(null),
            drugCol ? drugCol.query({ queryTexts: obatQueries,   nResults: 6 }) : Promise.resolve(null),
        ]);

        const extractDocs = (r) => {
            if (r.status !== 'fulfilled' || !r.value?.documents) return [];
            return [...new Set(r.value.documents.flat().filter(d => d))];
        };

        const docsPenyakit = extractDocs(hasilKondisi).slice(0, 3);
        const docsObat     = extractDocs(hasilObat).slice(0, 5);

        let ctx = '';
        if (docsPenyakit.length > 0) ctx += `=== REFERENSI KONDISI MEDIS ===\n${docsPenyakit.join('\n---\n')}\n\n`;
        if (docsObat.length > 0)     ctx += `=== REFERENSI OBAT & INTERAKSI ===\n${docsObat.join('\n---\n')}\n\n`;

        if (ctx) {
            console.log(`[RAG L3] OK: ${docsPenyakit.length} kondisi, ${docsObat.length} obat`);
            return ctx;
        }
    } catch (e) { console.error('[RAG L3] gagal:', e.message); }

    // Level 4: All levels exhausted
    console.warn('[RAG L4] Semua level RAG gagal. Chatbot merespon tanpa referensi.');
    return '';
};

module.exports = {
    searchChroma,
    buildRagContext,
    fetchDrugsForCondition,
    checkDrugAllergy,
    enrichDrugDetails,
    getPatientContextText,
    parseGeneralContentToDrug,
};
