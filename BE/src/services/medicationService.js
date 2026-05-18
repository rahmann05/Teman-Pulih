const db = require('../config/db');
const { resolveTargetPatientId } = require('../helpers/patientAccess');
const { cacheGet, cacheSet, cacheDel } = require('../helpers/cache');
const { chromaClient } = require('../config/chroma.js');

const normalizeText = (text) => (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const tokenize = (text) => normalizeText(text).split(' ').filter(Boolean);

const SYNONYM_MAP = {
    paracetamol: ['parasetamol', 'acetaminophen'],
    parasetamol: ['paracetamol', 'acetaminophen'],
    promag: ['antasida', 'antacid', 'maag', 'lambung'],
    antasida: ['promag', 'antacid', 'maag', 'lambung'],
    maag: ['dispepsia', 'gastritis', 'lambung', 'gerd'],
    gerd: ['maag', 'lambung', 'asam lambung'],
    'obat cacing': ['cacing', 'albendazole', 'mebendazole', 'pirantel', 'pamoat'],
    cacing: ['obat cacing', 'albendazole', 'mebendazole', 'pirantel', 'pamoat']
};

const buildExpandedQueries = (queryText) => {
    const base = normalizeText(queryText);
    const expanded = new Set();
    if (!base) return [];

    expanded.add(base);
    const tokens = tokenize(base);
    for (const token of tokens) {
        const synonyms = SYNONYM_MAP[token];
        if (synonyms) {
            for (const syn of synonyms) expanded.add(syn);
        }
    }

    const joined = tokens.join(' ');
    if (SYNONYM_MAP[joined]) {
        for (const syn of SYNONYM_MAP[joined]) expanded.add(syn);
    }

    return Array.from(expanded).filter(Boolean);
};

// Ambil daftar obat beserta jadwalnya
const getAll = async (user, candidatePatientId) => {
    const { patientId, error } = await resolveTargetPatientId(user, candidatePatientId);
    if (error) throw Object.assign(new Error(error), { statusCode: 403 });

    const cacheKey = `medications:${patientId}`;
    const cached = await cacheGet(cacheKey);
    if (cached) {
        console.log(`[REDIS] Daftar Obat & Jadwal ditarik dari Cache - User ID: ${patientId}`);
        return cached;
    }

    const query = `
        SELECT 
            m.*,
            COALESCE(
                json_agg(
                    json_build_object(
                        'id', ms.id,
                        'frequency', ms.frequency,
                        'time_slots', ms.time_slots,
                        'start_date', ms.start_date,
                        'end_date', ms.end_date
                    )
                ) FILTER (WHERE ms.id IS NOT NULL),
                '[]'
            ) as medication_schedules
        FROM medications m
        LEFT JOIN medication_schedules ms ON m.id = ms.medication_id
        WHERE m.user_id = $1
        GROUP BY m.id
        ORDER BY m.created_at DESC
    `;
    const { rows } = await db.query(query, [patientId]);
    await cacheSet(cacheKey, rows);
    return rows;
};

// Tambah Obat dan Jadwalnya
const create = async (user, supabase, data) => {
    const { patient_id, name, dosage, instructions, schedules } = data;
    let medicinal_insight = data.medicinal_insight || null;
    const { patientId, error } = await resolveTargetPatientId(user, patient_id);
    if (error) throw Object.assign(new Error(error), { statusCode: 403 });
    if (!name) throw Object.assign(new Error('Nama obat wajib diisi'), { statusCode: 400 });

    const hasInsightFields = medicinal_insight && typeof medicinal_insight === 'object'
        ? Object.values(medicinal_insight).some((v) => v !== null && v !== '')
        : false;

    if (!medicinal_insight || !hasInsightFields) {
        try {
            const chromaResult = await searchChroma(name, user, supabase, patientId);
            if (chromaResult?.obat?.length > 0) {
                medicinal_insight = chromaResult.obat[0];
            }
        } catch (e) {
            console.warn('[CHROMA] Fallback medicinal insight gagal:', e.message);
        }
    }

    const { data: medData, error: medError } = await supabase
        .from('medications')
        .insert([{ user_id: patientId, name, dosage, instructions, medicinal_insight }])
        .select()
        .single();
    if (medError) throw medError;

    let createdSchedules = [];
    if (schedules && schedules.length > 0) {
        const schedulesToInsert = schedules.map(s => ({
            medication_id: medData.id,
            frequency: s.frequency,
            time_slots: s.time_slots,
            start_date: s.start_date,
            end_date: s.end_date,
        }));
        const { data: schedData, error: schedError } = await supabase
            .from('medication_schedules')
            .insert(schedulesToInsert)
            .select();
        if (schedError) throw schedError;
        createdSchedules = schedData;
    }

    await cacheDel(`medications:${patientId}`, `emr_profile:patient_${patientId}`);
    return { ...medData, medication_schedules: createdSchedules };
};

// Update Data Obat
const update = async (user, supabase, medicationId, data) => {
    const { name, dosage, instructions } = data;
    const { rows: meds } = await db.query('SELECT id, user_id FROM medications WHERE id = $1', [medicationId]);
    const medication = meds[0];
    if (!medication) throw Object.assign(new Error('Obat tidak ditemukan'), { statusCode: 404 });

    const { error: accessError } = await resolveTargetPatientId(user, medication.user_id);
    if (accessError) throw Object.assign(new Error(accessError), { statusCode: 403 });

    const { data: updated, error } = await supabase
        .from('medications')
        .update({ name, dosage, instructions })
        .eq('id', medication.id)
        .select()
        .single();
    if (error) throw error;

    await cacheDel(`medications:${medication.user_id}`, `emr_profile:patient_${medication.user_id}`);
    return updated;
};

// Hapus Obat
const remove = async (user, supabase, medicationId) => {
    const { rows: meds } = await db.query('SELECT id, user_id FROM medications WHERE id = $1', [medicationId]);
    const medication = meds[0];
    if (!medication) throw Object.assign(new Error('Obat tidak ditemukan'), { statusCode: 404 });

    const { error: accessError } = await resolveTargetPatientId(user, medication.user_id);
    if (accessError) throw Object.assign(new Error(accessError), { statusCode: 403 });

    const { error } = await supabase.from('medications').delete().eq('id', medication.id);
    if (error) throw error;

    await cacheDel(`medications:${medication.user_id}`, `emr_profile:patient_${medication.user_id}`);
};

// Log minum obat
const markTaken = async (user, supabase, medicationId, data) => {
    const { schedule_id, status, time_slot } = data;
    if (!status) throw Object.assign(new Error('Status wajib diisi (taken/missed/skipped)'), { statusCode: 400 });

    const { rows: meds } = await db.query('SELECT id, user_id FROM medications WHERE id = $1', [medicationId]);
    const medication = meds[0];
    if (!medication) throw Object.assign(new Error('Obat tidak ditemukan'), { statusCode: 404 });

    const { error: accessError } = await resolveTargetPatientId(user, medication.user_id);
    if (accessError) throw Object.assign(new Error(accessError), { statusCode: 403 });

    if (time_slot) {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const { data: existingLogs, error: checkError } = await supabase
            .from('medication_logs')
            .select('id')
            .eq('medication_id', medication.id)
            .eq('time_slot', time_slot)
            .gte('taken_at', todayStart.toISOString())
            .lte('taken_at', todayEnd.toISOString());
        if (checkError) throw checkError;
        if (existingLogs && existingLogs.length > 0) {
            throw Object.assign(new Error('Jadwal ini sudah dicatat hari ini.'), { statusCode: 409 });
        }
    }

    const { data: logData, error } = await supabase
        .from('medication_logs')
        .insert([{
            medication_id: medication.id,
            schedule_id: schedule_id || null,
            time_slot: time_slot || null,
            status,
            taken_at: new Date().toISOString(),
        }])
        .select()
        .single();
    if (error) throw error;

    await cacheDel(`medications:${medication.user_id}`, `emr_profile:patient_${medication.user_id}`);
    return logData;
};

// Ambil riwayat / log obat pasien
const getLogs = async (user, candidatePatientId) => {
    const { patientId, error } = await resolveTargetPatientId(user, candidatePatientId);
    if (error) throw Object.assign(new Error(error), { statusCode: 403 });

    const query = `
        SELECT 
            ml.*,
            json_build_object(
                'name', m.name,
                'dosage', m.dosage,
                'user_id', m.user_id
            ) as medications
        FROM medication_logs ml
        JOIN medications m ON ml.medication_id = m.id
        WHERE m.user_id = $1
        ORDER BY ml.taken_at DESC
    `;
    const { rows } = await db.query(query, [patientId]);
    return rows;
};

// Parse raw unstructured drug string from ChromaDB into structured fields
const parseDrugContent = (content) => {
    if (!content) return {};
    
    const extractField = (text, fieldName) => {
        const regex = new RegExp(`${fieldName}:\\s*(.*?)(?=\\s*\\b(?:Kategori|Indikasi|Komposisi|Dosis|Aturan Pakai|Efek Samping|Peringatan):|$)`, 'i');
        const match = text.match(regex);
        return match ? match[1].trim() : '';
    };

    const namaObatMatch = content.match(/Informasi Obat:\s*(.*?)(?=\s*\b(?:Kategori|Indikasi|Komposisi|Dosis|Aturan Pakai|Efek Samping|Peringatan):|$)/i);
    const namaObat = namaObatMatch ? namaObatMatch[1].trim() : '';

    return {
        nama_obat: namaObat,
        kategori: extractField(content, 'Kategori'),
        indikasi: extractField(content, 'Indikasi'),
        komposisi: extractField(content, 'Komposisi'),
        dosis: extractField(content, 'Dosis'),
        aturan_pakai: extractField(content, 'Aturan Pakai'),
        efek_samping: extractField(content, 'Efek Samping')
    };
};

// Retrieve and merge all chunks of a drug document from ChromaDB using its metadata source_id
const getFullDrugContent = async (collection, sourceId, initialDoc) => {
    if (!collection || !sourceId) {
        return initialDoc || '';
    }
    try {
        const response = await collection.get({
            where: { "source_id": sourceId }
        });
        if (response && response.documents && response.documents.length > 0) {
            const indexedDocs = [];
            for (let i = 0; i < response.documents.length; i++) {
                const doc = response.documents[i];
                const meta = response.metadatas[i];
                const index = meta && meta.chunk_index !== undefined ? meta.chunk_index : 0;
                indexedDocs.push({ index, doc });
            }
            indexedDocs.sort((a, b) => a.index - b.index);
            return indexedDocs.map(item => item.doc).join(' ');
        }
    } catch (e) {
        console.error(`[CHROMA] Error fetching full content for source_id ${sourceId}:`, e.message);
    }
    return initialDoc || '';
};

const getPatientContextText = (profile) => {
    if (!profile) return '';
    return [
        profile.chronic_conditions,
        profile.past_illnesses,
        profile.last_illness,
        profile.routine_medications
    ].filter(Boolean).join(' ');
};

const checkDrugAllergy = (drug, patientProfile) => {
    if (!patientProfile || !patientProfile.allergies) return { hasAllergy: false, details: '' };
    const allergies = patientProfile.allergies.toLowerCase().split(/,\s*/);
    const drugText = `${drug.nama_obat} ${drug.komposisi} ${drug.raw_content || ''}`.toLowerCase();
    
    for (const allergen of allergies) {
        const trimmedAllergen = allergen.trim();
        if (trimmedAllergen && drugText.includes(trimmedAllergen)) {
            return {
                hasAllergy: true,
                details: `Peringatan Medis: Mengandung bahan "${trimmedAllergen}" yang tidak cocok dengan riwayat alergi pasien!`
            };
        }
    }
    return { hasAllergy: false, details: '' };
};

const scoreDrugMatch = (queryText, drug, patientContextText = '') => {
    const query = normalizeText(queryText);
    if (!query) return 0;
    const name = normalizeText(drug.nama_obat);
    const komposisi = normalizeText(drug.komposisi);
    const indikasi = normalizeText(drug.indikasi);
    const kategori = normalizeText(drug.kategori);
    const raw = normalizeText(drug.raw_content || '');
    const patientText = normalizeText(patientContextText);

    let score = 0;
    if (name === query) score += 8;
    if (name.includes(query)) score += 6;
    if (komposisi.includes(query)) score += 4;
    if (indikasi.includes(query)) score += 4;
    if (kategori.includes(query)) score += 2;
    if (raw.includes(query)) score += 1;

    const queryTokens = tokenize(query);
    for (const token of queryTokens) {
        if (name.includes(token)) score += 2;
        if (komposisi.includes(token)) score += 1;
        if (indikasi.includes(token)) score += 1;
    }

    if (drug.distance !== null && drug.distance !== undefined) {
        score += Math.max(0, 1 - drug.distance) * 3;
    }

    if (patientText) {
        const queryTokens = tokenize(queryText);
        for (const token of queryTokens) {
            if (patientText.includes(token)) score += 1;
        }
    }

    return score;
};

const scoreConditionMatch = (queryText, condition, patientContextText = '', expandedQueries = []) => {
    const query = normalizeText(queryText);
    if (!query) return 0;
    const content = normalizeText(condition.content || '');
    const patientText = normalizeText(patientContextText);

    let score = 0;
    if (content.includes(query)) score += 4;
    const tokens = tokenize(query);
    for (const token of tokens) {
        if (content.includes(token)) score += 1;
        if (patientText && patientText.includes(token)) score += 0.5;
    }
    if (expandedQueries.length > 0) {
        for (const exp of expandedQueries) {
            const expNorm = normalizeText(exp);
            if (expNorm && content.includes(expNorm)) score += 1;
        }
    }
    if (condition.distance !== null && condition.distance !== undefined) {
        score += Math.max(0, 1 - condition.distance) * 2;
    }
    return score;
};

const enrichDrugDetails = async (drug, drugCol) => {
    if (!drugCol || !drug?.source_id) return drug;
    const hasDetails = Boolean(drug.kategori || drug.indikasi || drug.komposisi || drug.dosis || drug.aturan_pakai);
    if (hasDetails) return drug;

    const fullContent = await getFullDrugContent(drugCol, drug.source_id, drug.raw_content);
    const parsedFull = parseDrugContent(fullContent);
    return {
        ...drug,
        raw_content: fullContent,
        kategori: drug.kategori || parsedFull.kategori || drug.kategori,
        indikasi: drug.indikasi || parsedFull.indikasi || drug.indikasi,
        komposisi: drug.komposisi || parsedFull.komposisi || drug.komposisi,
        dosis: drug.dosis || parsedFull.dosis || drug.dosis,
        aturan_pakai: drug.aturan_pakai || parsedFull.aturan_pakai || drug.aturan_pakai,
        efek_samping: drug.efek_samping || parsedFull.efek_samping || drug.efek_samping
    };
};

// Dual-collection search across medications and conditions/symptoms
const searchChroma = async (queryText, user = null, supabase = null, targetPatientId = null) => {
    if (!queryText || queryText.trim() === '') {
        return { obat: [], kondisi: [] };
    }

    const drugCollectionName = process.env.CHROMA_DATABASE_DRUGS || 'RAG-TemanPulih-Obat';
    const conditionCollectionName = process.env.CHROMA_DATABASE || 'RAG-TemanPulih';

    let drugCol, condCol;
    try {
        [drugCol, condCol] = await Promise.all([
            chromaClient.getCollection({ name: drugCollectionName }).catch(e => {
                console.error('[CHROMA] Error getting drug collection:', e.message);
                return null;
            }),
            chromaClient.getCollection({ name: conditionCollectionName }).catch(e => {
                console.error('[CHROMA] Error getting condition collection:', e.message);
                return null;
            })
        ]);
    } catch (err) {
        console.error('[CHROMA] Initialization failed:', err.message);
        return { obat: [], kondisi: [] };
    }

    // Load Patient profile for safety warnings & co-morbidity relevance tuning
    let patientProfile = null;
    if (user && supabase && targetPatientId) {
        try {
            const { rows } = await db.query(
                'SELECT chronic_conditions, allergies, past_illnesses, last_illness, routine_medications FROM profiles WHERE user_id = $1',
                [targetPatientId]
            );
            patientProfile = rows[0];
        } catch (e) {
            console.error('[CHROMA] Failed to fetch patient profile for EMR context:', e.message);
        }
    }

    // Hybrid Search: Define search list and perform Query Expansion if category keyword triggers
    const searchQueries = Array.from(new Set([queryText, ...buildExpandedQueries(queryText)]));
    const dedupedQueries = Array.from(new Set(searchQueries.map(q => q.trim()).filter(Boolean)));

    // Increase nResults pool size so that we retrieve all candidate options before strict context matching
    const [hasilObat, hasilKondisi] = await Promise.allSettled([
        drugCol ? drugCol.query({ queryTexts: dedupedQueries, nResults: 24 }) : Promise.resolve(null),
        condCol ? condCol.query({ queryTexts: dedupedQueries, nResults: 10 }) : Promise.resolve(null)
    ]);

    const rawObatList = [];
    if (hasilObat.status === 'fulfilled' && hasilObat.value) {
        const r = hasilObat.value;
        const queryCount = r.ids.length;
        
        // Traverse over the candidate pool of both base and expanded query results
        for (let q = 0; q < queryCount; q++) {
            const ids = r.ids[q] || [];
            const docs = r.documents[q] || [];
            const metas = r.metadatas[q] || [];
            const dists = r.distances ? r.distances[q] : [];

            for (let i = 0; i < docs.length; i++) {
                const fullText = docs[i];
                const parsed = parseDrugContent(fullText);
                
                const nameToCompare = metas[i]?.nama_obat || parsed.nama_obat || '';
                const alreadyAdded = rawObatList.some(o => o.nama_obat.toLowerCase() === nameToCompare.toLowerCase());
                if (!alreadyAdded && nameToCompare) {
                    rawObatList.push({
                        id: ids[i],
                        raw_content: fullText,
                        nama_obat: nameToCompare,
                        source_id: metas[i]?.source_id || null,
                        kategori: metas[i]?.kategori || parsed.kategori || 'Medis',
                        indikasi: parsed.indikasi || '',
                        komposisi: parsed.komposisi || '',
                        dosis: parsed.dosis || '',
                        aturan_pakai: parsed.aturan_pakai || '',
                        efek_samping: parsed.efek_samping || '',
                        distance: dists[i] !== undefined ? dists[i] : null
                    });
                }
            }
        }
    }

    const enrichedRawObatList = [];
    let enrichCount = 0;
    for (const drug of rawObatList) {
        if (enrichCount < 12) {
            const needsEnrich = !(drug.kategori || drug.indikasi || drug.komposisi || drug.aturan_pakai || drug.dosis);
            if (needsEnrich && drug.source_id) {
                enrichedRawObatList.push(await enrichDrugDetails(drug, drugCol));
                enrichCount++;
                continue;
            }
        }
        enrichedRawObatList.push(drug);
    }

    // Resolve primary search category intent
    const patientContextText = getPatientContextText(patientProfile);

    // Apply strict filtering on the retrieved drugs to purge irrelevant category cross-matches
    const obatList = [];
    for (const drug of enrichedRawObatList) {
        const distance = drug.distance;
        
        // Distance filtering only if the name has no lexical overlap with query
        if (distance !== null && distance > 0.75) {
            const queryClean = normalizeText(queryText);
            const drugLower = normalizeText(drug.nama_obat);
            if (queryClean && !drugLower.includes(queryClean)) {
                continue;
            }
        }

        // 3. Perform Allergy Verification
        const allergyCheck = checkDrugAllergy(drug, patientProfile);
        drug.allergy_warning = allergyCheck.hasAllergy ? allergyCheck.details : null;

        obatList.push(drug);
    }

    const rawKondisiList = [];
    if (hasilKondisi.status === 'fulfilled' && hasilKondisi.value) {
        const r = hasilKondisi.value;
        const queryCount = r.ids.length;

        for (let q = 0; q < queryCount; q++) {
            const ids = r.ids[q] || [];
            const docs = r.documents[q] || [];
            const metas = r.metadatas[q] || [];
            const dists = r.distances ? r.distances[q] : [];

            for (let i = 0; i < docs.length; i++) {
                rawKondisiList.push({
                    id: ids[i],
                    content: docs[i],
                    source: metas[i]?.source || '',
                    distance: dists[i] !== undefined ? dists[i] : null
                });
            }
        }
    }

    // Apply strict filtering on the condition/symptom matches
    const kondisiList = [];
    for (const cond of rawKondisiList) {
        // Skip low-similarity chunks if they also lack lexical overlap with query
        if (cond.distance !== null && cond.distance > 0.78) {
            const queryClean = normalizeText(queryText);
            const contentClean = normalizeText(cond.content);
            if (queryClean && !contentClean.includes(queryClean)) {
                continue;
            }
        }
        kondisiList.push(cond);
    }

    // Comprehensive check: Extract related drug names mentioned inside disease/condition RAG chunks
    const extractedDrugNames = [];
    for (const k of kondisiList) {
        if (k.content) {
            const regex = /Obat Terkait:\s*([^.\n]+)/gi;
            let match;
            while ((match = regex.exec(k.content)) !== null) {
                if (match[1]) {
                    const drugName = match[1].replace(/\.$/, '').trim();
                    if (drugName && !extractedDrugNames.includes(drugName)) {
                        extractedDrugNames.push(drugName);
                    }
                }
            }
        }
    }

    // Query ChromaDB for structural details of the extracted drugs if not already in obatList
    if (extractedDrugNames.length > 0 && drugCol) {
        const extraQueries = [];
        for (const drugName of extractedDrugNames) {
            const exists = obatList.some(o => o.nama_obat.toLowerCase() === drugName.toLowerCase());
            if (!exists) {
                extraQueries.push(
                    drugCol.query({ queryTexts: [drugName], nResults: 1 }).then(res => ({
                        drugName,
                        res
                    })).catch(e => {
                        console.error(`[CHROMA] Failed to query extracted drug "${drugName}":`, e.message);
                        return null;
                    })
                );
            }
        }

        if (extraQueries.length > 0) {
            const extraResults = await Promise.all(extraQueries);
            
            for (const item of extraResults) {
                if (item && item.res) {
                    const r = item.res;
                    const ids = r.ids[0] || [];
                    const docs = r.documents[0] || [];
                    const metas = r.metadatas[0] || [];
                    const dists = r.distances ? r.distances[0] : [];

                    for (let i = 0; i < docs.length; i++) {
                        const fullContent = await getFullDrugContent(drugCol, metas[i]?.source_id, docs[i]);
                        const parsed = parseDrugContent(fullContent);
                        const nameToCompare = metas[i]?.nama_obat || parsed.nama_obat || item.drugName;
                        
                        // 1. Strict name validation: ensure the retrieved drug is actually a match for the extracted query
                        const queryClean = item.drugName.toLowerCase().trim();
                        const matchedClean = nameToCompare.toLowerCase();
                        if (!matchedClean.includes(queryClean) && !queryClean.includes(matchedClean)) {
                            continue; // Skip mismatching background vector noise
                        }

                        const alreadyAdded = obatList.some(o => o.nama_obat.toLowerCase() === nameToCompare.toLowerCase());
                        if (!alreadyAdded && nameToCompare) {
                            const drugObj = {
                                id: ids[i],
                                raw_content: fullContent,
                                nama_obat: nameToCompare,
                                source_id: metas[i]?.source_id || null,
                                kategori: metas[i]?.kategori || parsed.kategori || 'Medis (Terkait Kondisi)',
                                indikasi: parsed.indikasi || '',
                                komposisi: parsed.komposisi || '',
                                dosis: parsed.dosis || '',
                                aturan_pakai: parsed.aturan_pakai || '',
                                efek_samping: parsed.efek_samping || '',
                                distance: dists[i] !== undefined ? dists[i] : null,
                                is_extracted_from_condition: true
                            };

                            // Perform allergy check on extracted drug
                            const allergyCheck = checkDrugAllergy(drugObj, patientProfile);
                            drugObj.allergy_warning = allergyCheck.hasAllergy ? allergyCheck.details : null;
                            
                            obatList.push(drugObj);
                        }
                    }
                }
            }
        }
    }

    const rankedObat = obatList
        .map((drug) => ({ ...drug, match_score: scoreDrugMatch(queryText, drug, patientContextText) }))
        .sort((a, b) => b.match_score - a.match_score)
        .slice(0, 5);

    const rankedKondisi = kondisiList
        .map((cond) => ({
            ...cond,
            match_score: scoreConditionMatch(queryText, cond, patientContextText, dedupedQueries)
        }))
        .sort((a, b) => b.match_score - a.match_score)
        .filter((cond) => cond.match_score >= 2)
        .slice(0, 3);

    return {
        obat: rankedObat,
        kondisi: rankedKondisi
    };
};

module.exports = { getAll, create, update, remove, markTaken, getLogs, searchChroma };
