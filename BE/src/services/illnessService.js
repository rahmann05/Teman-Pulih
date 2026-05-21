const { cacheGet, cacheSet, cacheDel } = require('../helpers/cache');
const { resolveTargetPatientId } = require('../helpers/patientAccess');
const { chromaClient } = require('../config/chroma.js');
const {
    buildQueryList,
    extractIllnessName,
    parseIllnessContent,
    parseDrugContent,
    softScore,
    isSoftRelevant,
    normalizeText,
    getFullConditionContent,
    getFullDrugContent,
} = require('../helpers/ragUtils');

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

    // Jika illness_info tidak diberikan, coba ambil dari Chroma (dengan chunk merging)
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
 * Ambil obat-obatan relevan dari RAG-TemanPulih-Obat untuk suatu penyakit.
 *
 * Strategi dua lapis:
 * 1. Semantic search dengan nama penyakit → temukan obat yang indikasinya relevan
 * 2. Lookup nama obat yang disebutkan eksplisit di konten kondisi ("Obat Terkait:")
 *
 * @param {object} drugCol     - ChromaDB drug collection
 * @param {string} illnessName - Nama penyakit sebagai query semantik
 * @param {string} condContent - Konten kondisi (untuk extract "Obat Terkait:")
 * @returns {{ nama_obat, indikasi, dosis, aturan_pakai, efek_samping }[]}
 */
const fetchDrugsForCondition = async (drugCol, illnessName, condContent = '') => {
    if (!drugCol) return [];
    const drugs = [];
    const seenDrugs = new Set();

    try {
        // Layer 1: Semantic search — nama penyakit ke drug collection
        // Drug docs punya field "Indikasi" yang menyebut penyakit → vector search akan match
        const queries = buildQueryList(illnessName).slice(0, 4);
        const semResult = await drugCol.query({ queryTexts: queries, nResults: 6 });
        const semDocs  = semResult?.documents?.flat().filter(Boolean) || [];
        const semMetas = semResult?.metadatas?.flat() || [];
        const semDists = semResult?.distances?.flat() || [];

        for (let i = 0; i < semDocs.length; i++) {
            const doc  = semDocs[i];
            const meta = semMetas[i] || {};
            const dist = semDists[i] ?? null;

            const parsed = parseDrugContent(doc);
            const nameToUse = meta.nama_obat || parsed.nama_obat;
            if (!nameToUse) continue;

            const key = normalizeText(nameToUse);
            if (seenDrugs.has(key)) continue;

            // Soft relevance: pastikan setidaknya ada kaitan semantik
            const score = softScore(illnessName, doc, dist, queries);
            if (!isSoftRelevant(score, dist)) continue;

            seenDrugs.add(key);

            // Fetch semua chunk obat ini untuk info lengkap
            let fullContent = doc;
            if (meta.source_id) {
                fullContent = await getFullDrugContent(drugCol, meta.source_id, doc);
            }
            const fullParsed = parseDrugContent(fullContent);

            drugs.push({
                nama_obat:   meta.nama_obat || fullParsed.nama_obat || nameToUse,
                kategori:    meta.kategori  || fullParsed.kategori  || '',
                indikasi:    fullParsed.indikasi    || parsed.indikasi    || '',
                komposisi:   fullParsed.komposisi   || parsed.komposisi   || '',
                dosis:       fullParsed.dosis       || parsed.dosis       || '',
                aturan_pakai: fullParsed.aturan_pakai || parsed.aturan_pakai || '',
                efek_samping: fullParsed.efek_samping || parsed.efek_samping || '',
                distance: dist,
            });

            if (drugs.length >= 5) break;
        }

        // Layer 2: Explicit "Obat Terkait:" mentions in condition content
        if (condContent) {
            const obatMentions = [...condContent.matchAll(/Obat Terkait[:\s]+([^\n.]+)/gi)];
            for (const match of obatMentions) {
                const drugName = match[1]?.trim();
                if (!drugName) continue;
                const key = normalizeText(drugName);
                if (seenDrugs.has(key)) continue;

                // Lookup langsung di drug collection
                try {
                    const lookupRes = await drugCol.query({ queryTexts: [drugName], nResults: 2 });
                    const lookupDocs  = lookupRes?.documents?.[0] || [];
                    const lookupMetas = lookupRes?.metadatas?.[0]  || [];
                    const lookupDists = lookupRes?.distances?.[0]  || [];

                    for (let j = 0; j < lookupDocs.length; j++) {
                        if (!lookupDocs[j]) continue;
                        const lParsed = parseDrugContent(lookupDocs[j]);
                        const lName   = lookupMetas[j]?.nama_obat || lParsed.nama_obat || drugName;
                        const lKey    = normalizeText(lName);
                        if (seenDrugs.has(lKey)) continue;

                        // Pastikan nama cocok (bukan random result dari vector search)
                        const nameMatch = lKey.includes(key) || key.includes(lKey);
                        if (!nameMatch && (lookupDists[j] ?? 1) > 0.6) continue;

                        seenDrugs.add(lKey);
                        let fullContent = lookupDocs[j];
                        if (lookupMetas[j]?.source_id) {
                            fullContent = await getFullDrugContent(drugCol, lookupMetas[j].source_id, lookupDocs[j]);
                        }
                        const fullParsed = parseDrugContent(fullContent);
                        drugs.push({
                            nama_obat:    lName,
                            kategori:     lookupMetas[j]?.kategori || fullParsed.kategori || '',
                            indikasi:     fullParsed.indikasi     || lParsed.indikasi     || '',
                            komposisi:    fullParsed.komposisi    || lParsed.komposisi    || '',
                            dosis:        fullParsed.dosis        || lParsed.dosis        || '',
                            aturan_pakai: fullParsed.aturan_pakai || lParsed.aturan_pakai || '',
                            efek_samping: fullParsed.efek_samping || lParsed.efek_samping || '',
                            distance: lookupDists[j] ?? null,
                            is_from_explicit_mention: true,
                        });
                        break; // ambil satu match terbaik per drugName
                    }
                } catch (_) { /* abaikan */ }
            }
        }
    } catch (e) {
        console.warn(`[CHROMA] fetchDrugsForCondition error for "${illnessName}":`, e.message);
    }

    return drugs;
};

/**
 * Ambil info kondisi penyakit dari Chroma RAG — dengan chunk merging.
 *
 * Flow:
 * 1. Query RAG-TemanPulih dengan nama penyakit + sinonim
 * 2. Untuk setiap hit, fetch SEMUA chunk (chunk_index 0,1,2,...) via source_id
 * 3. Merge semua chunk → parse info lengkap
 * 4. Cross-reference ke RAG-TemanPulih-Obat untuk obat terkait
 */
const fetchIllnessInfoFromChroma = async (illnessName) => {
    try {
        const condColName = process.env.CHROMA_DATABASE       || 'RAG-TemanPulih';
        const drugColName = process.env.CHROMA_DATABASE_DRUGS || 'RAG-TemanPulih-Obat';

        const [condColResult, drugColResult] = await Promise.allSettled([
            chromaClient.getCollection({ name: condColName }),
            chromaClient.getCollection({ name: drugColName }),
        ]);

        const condCol = condColResult.status === 'fulfilled' ? condColResult.value : null;
        const drugCol = drugColResult.status === 'fulfilled' ? drugColResult.value : null;

        let fullMergedContent = '';
        let parsedInfo = {};

        if (condCol) {
            const queries = buildQueryList(illnessName);
            // Minta lebih banyak hasil agar mendapat semua chunk yang relevan
            const result = await condCol.query({ queryTexts: queries.slice(0, 5), nResults: 8 });

            const metas = result?.metadatas?.flat() || [];
            const docs  = result?.documents?.flat().filter(Boolean) || [];

            // Kumpulkan semua source_id unik yang relevan
            const seenSourceIds = new Set();
            const mergedDocs = [];

            for (let i = 0; i < docs.length; i++) {
                const sourceId = metas[i]?.source_id;
                if (sourceId && !seenSourceIds.has(sourceId)) {
                    seenSourceIds.add(sourceId);
                    // Fetch SEMUA chunk untuk source_id ini (termasuk chunk_index 1, 2, dst)
                    const fullContent = await getFullConditionContent(condCol, sourceId, docs[i]);
                    mergedDocs.push(fullContent);
                } else if (!sourceId) {
                    // Tidak ada source_id — gunakan doc apa adanya
                    mergedDocs.push(docs[i]);
                }
                // Batasi ke 3 source yang paling relevan
                if (seenSourceIds.size >= 3) break;
            }

            fullMergedContent = mergedDocs.join('\n\n---\n\n');
            if (fullMergedContent) {
                parsedInfo = parseIllnessContent(fullMergedContent);
            }
        }

        // Cross-reference ke RAG-TemanPulih-Obat
        // Strategi dua lapis: semantic search + explicit "Obat Terkait" lookup
        const drugResults = await fetchDrugsForCondition(drugCol, illnessName, fullMergedContent);

        if (drugResults.length > 0 && !parsedInfo.obat_terkait) {
            // Format obat_terkait sebagai list nama obat
            parsedInfo.obat_terkait = drugResults
                .slice(0, 3)
                .map(d => d.nama_obat)
                .filter(Boolean)
                .join(', ');
        }

        // Tambahkan drug details ke parsedInfo jika ada
        if (drugResults.length > 0) {
            parsedInfo.drug_details = drugResults.slice(0, 3);
        }

        const hasAnyInfo = Object.values(parsedInfo).some(v => v && (typeof v === 'string' ? v.length > 0 : true));
        return hasAnyInfo ? parsedInfo : null;
    } catch (e) {
        console.warn('[CHROMA] fetchIllnessInfoFromChroma error:', e.message);
        return null;
    }
};

/**
 * Cari penyakit berdasarkan gejala atau nama penyakit (via Chroma RAG)
 *
 * Alur baru:
 * 1. Query expansion dengan sinonim medis (id ↔ en ↔ latin)
 * 2. Ambil banyak kandidat (nResults=15)
 * 3. Group by source_id → fetch SEMUA chunk per penyakit
 * 4. Parse info dari konten lengkap (bukan hanya satu chunk)
 * 5. Cross-reference ke RAG-TemanPulih-Obat untuk obat terkait
 * 6. Soft gate: tidak hard-reject — hanya buang jika benar-benar tidak relevan
 */
const searchIllness = async (query) => {
    if (!query || query.trim().length < 2) return [];

    try {
        const condColName = process.env.CHROMA_DATABASE       || 'RAG-TemanPulih';
        const drugColName = process.env.CHROMA_DATABASE_DRUGS || 'RAG-TemanPulih-Obat';

        const [condCol, drugCol] = await Promise.all([
            chromaClient.getCollection({ name: condColName }).catch(() => null),
            chromaClient.getCollection({ name: drugColName }).catch(() => null),
        ]);

        if (!condCol) return [];

        // Expand query dengan sinonim medis
        const queries = buildQueryList(query.trim());
        console.log(`[ILLNESS SEARCH] Query: "${query}" → Expanded: [${queries.slice(0, 4).join(', ')}...]`);

        const result = await condCol.query({ queryTexts: queries.slice(0, 6), nResults: 15 });
        if (!result?.documents) return [];

        // ── Step 1: Flatten & sort semua kandidat by distance ──
        const candidates = [];
        for (let q = 0; q < result.documents.length; q++) {
            const docs  = result.documents[q] || [];
            const dists = result.distances?.[q]  || [];
            const metas = result.metadatas?.[q]   || [];
            for (let i = 0; i < docs.length; i++) {
                if (!docs[i]) continue;
                candidates.push({
                    doc:      docs[i],
                    distance: dists[i] ?? null,
                    meta:     metas[i] || {},
                });
            }
        }
        candidates.sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999));

        // ── Step 2: Group by source_id, ambil yang paling relevan per disease ──
        const seenSourceIds = new Set();   // dedup per penyakit (by source_id)
        const seenNames     = new Set();   // dedup by extracted name (fallback)
        const suggestions   = [];

        for (const { doc, distance, meta } of candidates) {
            // Soft relevance check
            const score = softScore(query, doc, distance, queries);
            if (!isSoftRelevant(score, distance)) continue;

            // Tentukan identity penyakit ini (prioritas: source_id → nama)
            const sourceId = meta?.source_id || null;

            // Jika kita sudah punya penyakit dari source_id ini, skip
            if (sourceId && seenSourceIds.has(sourceId)) continue;

            // ── Step 3: Fetch SEMUA chunk untuk penyakit ini ──
            let fullContent = doc;
            if (sourceId) {
                fullContent = await getFullConditionContent(condCol, sourceId, doc);
                seenSourceIds.add(sourceId);
            }

            // Ekstrak nama dari konten lengkap (semua chunk)
            const name = extractIllnessName(fullContent) || extractIllnessName(doc);
            if (!name) continue;

            const nameLower = normalizeText(name);
            if (seenNames.has(nameLower)) continue;
            seenNames.add(nameLower);

            // ── Step 4: Parse info dari konten lengkap ──
            const info = parseIllnessContent(fullContent);

            // ── Step 5: Cross-reference ke RAG-TemanPulih-Obat ──
            const drugResults = await fetchDrugsForCondition(drugCol, name, fullContent);
            if (drugResults.length > 0 && !info.obat_terkait) {
                info.obat_terkait = drugResults.map(d => d.nama_obat).filter(Boolean).join(', ');
            }

            suggestions.push({
                name,
                illness_info: {
                    indikasi:     info.indikasi,
                    gejala_umum:  info.gejala_umum,
                    penanganan:   info.penanganan,
                    obat_terkait: info.obat_terkait,
                    peringatan:   info.peringatan,
                    drug_details: drugResults.length > 0 ? drugResults.slice(0, 3) : undefined,
                },
                distance,
                relevance_score: score,
                chunks_merged: !!sourceId,
            });

            if (suggestions.length >= 6) break;
        }

        console.log(`[ILLNESS SEARCH] Returned ${suggestions.length} results for "${query}" (with chunk merging)`);
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
