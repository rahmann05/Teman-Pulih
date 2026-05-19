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
    paracetamol: ['parasetamol', 'acetaminophen', 'panadol', 'sanmol', 'tempra'],
    parasetamol: ['paracetamol', 'acetaminophen', 'panadol', 'sanmol', 'tempra'],
    acetaminophen: ['paracetamol', 'parasetamol'],
    promag: ['antasida', 'antacid', 'maag', 'lambung'],
    antasida: ['promag', 'antacid', 'maag', 'lambung'],
    maag: ['dispepsia', 'gastritis', 'lambung', 'gerd', 'antasida'],
    gerd: ['maag', 'lambung', 'asam lambung', 'refluks'],
    lambung: ['maag', 'gerd', 'dispepsia', 'gastritis'],
    'obat cacing': ['cacing', 'albendazole', 'mebendazole', 'pirantel', 'pamoat', 'combantrin'],
    cacing: ['albendazole', 'mebendazole', 'pirantel', 'pamoat', 'combantrin'],
    demam: ['panas', 'febris', 'antipiretik'],
    'sakit kepala': ['cephalgia', 'migrain', 'pusing', 'sefalgia'],
    batuk: ['antitusif', 'ekspektoran', 'mukolitik'],
    flu: ['influenza', 'pilek', 'selesma'],
    diare: ['mencret', 'gastroenteritis'],
    amoxicillin: ['amoksisilin', 'amoxilin'],
    amoksisilin: ['amoxicillin', 'amoxilin'],
    ibuprofen: ['brufen', 'proris'],
    paramex: ['obat sakit kepala', 'analgesik'],
    epilepsi: ['antikonvulsan', 'kejang'],
};

const buildExpandedQueries = (queryText) => {
    const base = normalizeText(queryText);
    if (!base) return [];
    const expanded = new Set([base]);
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

    // Send real-time notification to caregivers if medication is successfully taken
    if (status === 'taken') {
        try {
            const patientName = user.name || 'Pasien';
            const { data: relations } = await supabase
                .from('family_relations')
                .select('caregiver_id')
                .eq('patient_id', medication.user_id)
                .eq('status', 'accepted');

            if (relations && relations.length > 0) {
                const todayStr = new Date().toLocaleDateString('en-CA');
                const notificationService = require('./notificationService');
                
                for (const rel of relations) {
                    const messageText = `${patientName} telah meminum obat ${medication.name} (${medication.dosage || ''}) untuk jadwal pukul ${time_slot || 'sekarang'}.`;
                    
                    await supabase
                        .from('notifications')
                        .insert([{
                            user_id: rel.caregiver_id,
                            title: `${patientName} Sudah Minum Obat`,
                            message: messageText,
                            type: 'caregiver_taken',
                            schedule_id: schedule_id || null,
                            time_slot: time_slot || null,
                            target_date: todayStr
                        }]);

                    // Send actual WhatsApp / Email
                    try {
                        const dbConfig = require('../config/db');
                        const contactRes = await dbConfig.query(`
                            SELECT u.name, u.email, p.phone 
                            FROM users u 
                            LEFT JOIN profiles p ON u.id = p.user_id 
                            WHERE u.id = $1
                        `, [rel.caregiver_id]);
                        
                        const caregiverContact = contactRes?.rows?.[0];
                        if (caregiverContact) {
                            if (caregiverContact.phone) {
                                await notificationService.sendWhatsApp(caregiverContact.phone, messageText);
                            } else if (caregiverContact.email) {
                                await notificationService.sendEmail(
                                    caregiverContact.email,
                                    `${patientName} Sudah Minum Obat`,
                                    `<h3>Kabar Kepatuhan Keluarga</h3><p>${messageText}</p>`,
                                    messageText
                                );
                            }
                        }
                    } catch (contactErr) {
                        console.error('[Notification Caregiver Contact Error]:', contactErr.message);
                    }
                }
            }
        } catch (notifErr) {
            console.error('[Notification Hook Error]: Failed to notify caregivers:', notifErr.message);
        }
    }

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

// Parse raw drug string from ChromaDB into structured fields (works for both collections)
const parseDrugContent = (content) => {
    if (!content) return {};
    
    const extractField = (text, fieldName) => {
        const regex = new RegExp(`${fieldName}:\\s*(.*?)(?=\\s*\\b(?:Kategori|Indikasi|Komposisi|Dosis|Aturan Pakai|Efek Samping|Peringatan|Obat Terkait):|$)`, 'is');
        const match = text.match(regex);
        return match ? match[1].trim() : '';
    };

    const namaObatMatch = content.match(/Informasi Obat:\s*(.*?)(?=\s*\b(?:Kategori|Indikasi|Komposisi|Dosis|Aturan Pakai|Efek Samping|Peringatan):|$)/is);
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

// Try to extract drug-like structured data from general RAG-TemanPulih content
const parseGeneralContentToDrug = (content, queryText) => {
    if (!content) return null;
    const parsed = parseDrugContent(content);
    if (parsed.nama_obat) return parsed;

    // Try extracting "Obat Terkait:" mentions
    const obatTerkaitMatch = content.match(/Obat Terkait:\s*([^\n.]+)/i);
    if (obatTerkaitMatch) {
        return { ...parsed, nama_obat: obatTerkaitMatch[1].trim() };
    }
    return null;
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

// ─── RELEVANCE VALIDATION GATES ──────────────────────────────────────────────
// These MUST pass before a result is included, preventing vector-only noise

const isDrugRelevant = (queryText, drug, expandedQueries = []) => {
    const query = normalizeText(queryText);
    const queryTokens = tokenize(query);
    const name = normalizeText(drug.nama_obat || '');
    const komposisi = normalizeText(drug.komposisi || '');
    const indikasi = normalizeText(drug.indikasi || '');
    const kategori = normalizeText(drug.kategori || '');
    const raw = normalizeText(drug.raw_content || '');

    // Gate 1: Bidirectional name match
    if (name && (name.includes(query) || query.includes(name))) return true;

    // Gate 2: Any significant query token in drug name
    for (const token of queryTokens) {
        if (token.length >= 3 && name.includes(token)) return true;
    }

    // Gate 3: Query in composition or indication
    if (query.length >= 3 && komposisi.includes(query)) return true;
    if (query.length >= 3 && indikasi.includes(query)) return true;

    // Gate 4: Synonym-expanded match against name/komposisi/indikasi/kategori
    for (const exp of expandedQueries) {
        const expNorm = normalizeText(exp);
        if (expNorm.length >= 3) {
            if (name.includes(expNorm)) return true;
            if (komposisi.includes(expNorm)) return true;
            if (indikasi.includes(expNorm)) return true;
            if (kategori.includes(expNorm)) return true;
        }
    }

    // Gate 5: Majority token overlap in raw content (weak but catches edge cases)
    let tokenHits = 0;
    for (const token of queryTokens) {
        if (token.length >= 3 && raw.includes(token)) tokenHits++;
    }
    if (queryTokens.length > 0 && tokenHits >= Math.ceil(queryTokens.length * 0.6)) return true;

    return false;
};

const isConditionRelevant = (queryText, condition, expandedQueries = []) => {
    const query = normalizeText(queryText);
    const queryTokens = tokenize(query);
    const content = normalizeText(condition.content || '');

    // Must have at least one lexical overlap
    if (content.includes(query)) return true;
    for (const token of queryTokens) {
        if (token.length >= 3 && content.includes(token)) return true;
    }
    for (const exp of expandedQueries) {
        const expNorm = normalizeText(exp);
        if (expNorm.length >= 3 && content.includes(expNorm)) return true;
    }
    return false;
};

// ─── SCORING (rewritten with stronger name weighting) ─────────────────────────

const scoreDrugMatch = (queryText, drug, patientContextText = '') => {
    const query = normalizeText(queryText);
    if (!query) return 0;
    const name = normalizeText(drug.nama_obat);
    const komposisi = normalizeText(drug.komposisi);
    const indikasi = normalizeText(drug.indikasi);
    const kategori = normalizeText(drug.kategori);
    const raw = normalizeText(drug.raw_content || '');

    let score = 0;

    // Exact name match is the strongest signal
    if (name === query) score += 15;
    else if (name.includes(query)) score += 10;
    else if (query.includes(name) && name.length >= 3) score += 8;

    // Composition / indication / category match
    if (komposisi.includes(query)) score += 5;
    if (indikasi.includes(query)) score += 5;
    if (kategori.includes(query)) score += 2;
    if (raw.includes(query)) score += 1;

    // Token-level matching
    const queryTokens = tokenize(query);
    for (const token of queryTokens) {
        if (token.length >= 3) {
            if (name.includes(token)) score += 3;
            if (komposisi.includes(token)) score += 1.5;
            if (indikasi.includes(token)) score += 1.5;
        }
    }

    // Vector distance as secondary signal (not primary)
    if (drug.distance !== null && drug.distance !== undefined) {
        score += Math.max(0, 1 - drug.distance) * 4;
    }

    // Patient context bonus (minor)
    if (patientContextText) {
        const patientText = normalizeText(patientContextText);
        for (const token of queryTokens) {
            if (token.length >= 3 && patientText.includes(token)) score += 0.5;
        }
    }

    return score;
};

const scoreConditionMatch = (queryText, condition, patientContextText = '', expandedQueries = []) => {
    const query = normalizeText(queryText);
    if (!query) return 0;
    const content = normalizeText(condition.content || '');

    let score = 0;
    // Full query match
    if (content.includes(query)) score += 5;

    // Token overlap
    const tokens = tokenize(query);
    for (const token of tokens) {
        if (token.length >= 3 && content.includes(token)) score += 1.5;
    }

    // Synonym expansion match
    for (const exp of expandedQueries) {
        const expNorm = normalizeText(exp);
        if (expNorm.length >= 3 && content.includes(expNorm)) score += 1.5;
    }

    // Patient context bonus
    if (patientContextText) {
        const patientText = normalizeText(patientContextText);
        for (const token of tokens) {
            if (token.length >= 3 && patientText.includes(token)) score += 0.5;
        }
    }

    // Distance as tiebreaker only
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
        kategori: drug.kategori || parsedFull.kategori,
        indikasi: drug.indikasi || parsedFull.indikasi,
        komposisi: drug.komposisi || parsedFull.komposisi,
        dosis: drug.dosis || parsedFull.dosis,
        aturan_pakai: drug.aturan_pakai || parsedFull.aturan_pakai,
        efek_samping: drug.efek_samping || parsedFull.efek_samping
    };
};

// ─── MAIN RAG SEARCH (overhauled dual-collection algorithm) ───────────────────
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

    // Load patient profile for allergy warnings & context
    let patientProfile = null;
    if (user && supabase && targetPatientId) {
        try {
            const { rows } = await db.query(
                'SELECT chronic_conditions, allergies, past_illnesses, last_illness, routine_medications FROM profiles WHERE user_id = $1',
                [targetPatientId]
            );
            patientProfile = rows[0];
        } catch (e) {
            console.error('[CHROMA] Failed to fetch patient profile:', e.message);
        }
    }

    // Build expanded query list with synonyms
    const expandedQueries = buildExpandedQueries(queryText);
    const dedupedQueries = Array.from(new Set([queryText, ...expandedQueries].map(q => q.trim()).filter(Boolean)));

    console.log(`[RAG] Query: "${queryText}" → Expanded: [${dedupedQueries.join(', ')}]`);

    // ═══ PHASE 1: Parallel search both collections ═══
    const [hasilObat, hasilKondisi] = await Promise.allSettled([
        drugCol ? drugCol.query({ queryTexts: dedupedQueries, nResults: 20 }) : Promise.resolve(null),
        condCol ? condCol.query({ queryTexts: dedupedQueries, nResults: 12 }) : Promise.resolve(null)
    ]);

    // ═══ PHASE 2: Process drug collection results with RELEVANCE GATE ═══
    const rawObatList = [];
    if (hasilObat.status === 'fulfilled' && hasilObat.value) {
        const r = hasilObat.value;
        for (let q = 0; q < r.ids.length; q++) {
            const ids = r.ids[q] || [];
            const docs = r.documents[q] || [];
            const metas = r.metadatas[q] || [];
            const dists = r.distances ? r.distances[q] : [];

            for (let i = 0; i < docs.length; i++) {
                const fullText = docs[i];
                const parsed = parseDrugContent(fullText);
                const nameToCompare = metas[i]?.nama_obat || parsed.nama_obat || '';
                if (!nameToCompare) continue;

                const alreadyAdded = rawObatList.some(o => normalizeText(o.nama_obat) === normalizeText(nameToCompare));
                if (alreadyAdded) continue;

                const drugCandidate = {
                    id: ids[i],
                    raw_content: fullText,
                    nama_obat: nameToCompare,
                    source_id: metas[i]?.source_id || null,
                    kategori: metas[i]?.kategori || parsed.kategori || '',
                    indikasi: parsed.indikasi || '',
                    komposisi: parsed.komposisi || '',
                    dosis: parsed.dosis || '',
                    aturan_pakai: parsed.aturan_pakai || '',
                    efek_samping: parsed.efek_samping || '',
                    distance: dists[i] !== undefined ? dists[i] : null
                };

                // ★ RELEVANCE GATE: Must have lexical connection to query
                if (!isDrugRelevant(queryText, drugCandidate, expandedQueries)) {
                    continue;
                }

                rawObatList.push(drugCandidate);
            }
        }
    }

    // Enrich drugs that lack structured fields (max 10)
    const obatList = [];
    let enrichCount = 0;
    for (const drug of rawObatList) {
        let enriched = drug;
        if (enrichCount < 10) {
            const needsEnrich = !(drug.kategori || drug.indikasi || drug.komposisi || drug.aturan_pakai || drug.dosis);
            if (needsEnrich && drug.source_id) {
                enriched = await enrichDrugDetails(drug, drugCol);
                enrichCount++;
            }
        }
        // Re-check relevance after enrichment (may have gained composition/indication)
        if (isDrugRelevant(queryText, enriched, expandedQueries)) {
            const allergyCheck = checkDrugAllergy(enriched, patientProfile);
            enriched.allergy_warning = allergyCheck.hasAllergy ? allergyCheck.details : null;
            obatList.push(enriched);
        }
    }

    console.log(`[RAG] Drug collection: ${rawObatList.length} candidates → ${obatList.length} after relevance gate`);

    // ═══ PHASE 3: Process condition collection results with RELEVANCE GATE ═══
    const rawKondisiList = [];
    if (hasilKondisi.status === 'fulfilled' && hasilKondisi.value) {
        const r = hasilKondisi.value;
        const seenIds = new Set();
        for (let q = 0; q < r.ids.length; q++) {
            const ids = r.ids[q] || [];
            const docs = r.documents[q] || [];
            const metas = r.metadatas[q] || [];
            const dists = r.distances ? r.distances[q] : [];

            for (let i = 0; i < docs.length; i++) {
                if (seenIds.has(ids[i])) continue;
                seenIds.add(ids[i]);

                const condCandidate = {
                    id: ids[i],
                    content: docs[i],
                    source: metas[i]?.source || '',
                    distance: dists[i] !== undefined ? dists[i] : null
                };

                // ★ RELEVANCE GATE: Must have lexical connection to query
                if (!isConditionRelevant(queryText, condCandidate, expandedQueries)) {
                    continue;
                }

                rawKondisiList.push(condCandidate);
            }
        }
    }

    console.log(`[RAG] Condition collection: ${rawKondisiList.length} results after relevance gate`);

    // ═══ PHASE 4: Extract drug names from conditions → cross-reference in drug collection ═══
    const extractedDrugNames = [];
    for (const k of rawKondisiList) {
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

    if (extractedDrugNames.length > 0 && drugCol) {
        const extraQueries = [];
        for (const drugName of extractedDrugNames) {
            const exists = obatList.some(o => normalizeText(o.nama_obat) === normalizeText(drugName));
            if (!exists) {
                extraQueries.push(
                    drugCol.query({ queryTexts: [drugName], nResults: 2 }).then(res => ({
                        drugName, res
                    })).catch(() => null)
                );
            }
        }

        if (extraQueries.length > 0) {
            const extraResults = await Promise.all(extraQueries);
            for (const item of extraResults) {
                if (!item?.res) continue;
                const r = item.res;
                const ids = r.ids[0] || [];
                const docs = r.documents[0] || [];
                const metas = r.metadatas[0] || [];
                const dists = r.distances ? r.distances[0] : [];

                for (let i = 0; i < docs.length; i++) {
                    const parsed = parseDrugContent(docs[i]);
                    const nameToCompare = metas[i]?.nama_obat || parsed.nama_obat || item.drugName;

                    // Strict name validation for cross-referenced drugs
                    const queryClean = normalizeText(item.drugName);
                    const matchedClean = normalizeText(nameToCompare);
                    if (!matchedClean.includes(queryClean) && !queryClean.includes(matchedClean)) {
                        continue;
                    }

                    const alreadyAdded = obatList.some(o => normalizeText(o.nama_obat) === normalizeText(nameToCompare));
                    if (alreadyAdded || !nameToCompare) continue;

                    const fullContent = await getFullDrugContent(drugCol, metas[i]?.source_id, docs[i]);
                    const parsedFull = parseDrugContent(fullContent);

                    const drugObj = {
                        id: ids[i],
                        raw_content: fullContent,
                        nama_obat: nameToCompare,
                        source_id: metas[i]?.source_id || null,
                        kategori: metas[i]?.kategori || parsedFull.kategori || 'Medis (Terkait Kondisi)',
                        indikasi: parsedFull.indikasi || '',
                        komposisi: parsedFull.komposisi || '',
                        dosis: parsedFull.dosis || '',
                        aturan_pakai: parsedFull.aturan_pakai || '',
                        efek_samping: parsedFull.efek_samping || '',
                        distance: dists[i] !== undefined ? dists[i] : null,
                        is_extracted_from_condition: true
                    };

                    const allergyCheck = checkDrugAllergy(drugObj, patientProfile);
                    drugObj.allergy_warning = allergyCheck.hasAllergy ? allergyCheck.details : null;
                    obatList.push(drugObj);
                }
            }
        }
    }

    // ═══ PHASE 5: Fallback — if drug collection gave < 2 results, try extracting ═══
    //     drug info from general collection (RAG-TemanPulih) content
    if (obatList.length < 2 && condCol) {
        console.log('[RAG] Drug results insufficient, attempting fallback to general collection...');
        for (const cond of rawKondisiList) {
            if (!cond.content) continue;
            const generalParsed = parseGeneralContentToDrug(cond.content, queryText);
            if (!generalParsed || !generalParsed.nama_obat) continue;

            const alreadyAdded = obatList.some(o => normalizeText(o.nama_obat) === normalizeText(generalParsed.nama_obat));
            if (alreadyAdded) continue;

            // Try to find this drug in the drug collection for full details
            if (drugCol) {
                try {
                    const lookupRes = await drugCol.query({ queryTexts: [generalParsed.nama_obat], nResults: 1 });
                    if (lookupRes?.documents?.[0]?.[0]) {
                        const lookupParsed = parseDrugContent(lookupRes.documents[0][0]);
                        const lookupName = lookupRes.metadatas[0]?.[0]?.nama_obat || lookupParsed.nama_obat || '';
                        const lookupClean = normalizeText(lookupName);
                        const queryClean = normalizeText(generalParsed.nama_obat);

                        if (lookupClean.includes(queryClean) || queryClean.includes(lookupClean)) {
                            const fullContent = await getFullDrugContent(drugCol, lookupRes.metadatas[0]?.[0]?.source_id, lookupRes.documents[0][0]);
                            const fullParsed = parseDrugContent(fullContent);
                            const drugObj = {
                                id: lookupRes.ids[0][0],
                                raw_content: fullContent,
                                nama_obat: lookupName || generalParsed.nama_obat,
                                source_id: lookupRes.metadatas[0]?.[0]?.source_id || null,
                                kategori: fullParsed.kategori || generalParsed.kategori || 'Medis',
                                indikasi: fullParsed.indikasi || generalParsed.indikasi || '',
                                komposisi: fullParsed.komposisi || generalParsed.komposisi || '',
                                dosis: fullParsed.dosis || generalParsed.dosis || '',
                                aturan_pakai: fullParsed.aturan_pakai || generalParsed.aturan_pakai || '',
                                efek_samping: fullParsed.efek_samping || generalParsed.efek_samping || '',
                                distance: lookupRes.distances?.[0]?.[0] ?? null,
                                is_fallback_from_general: true
                            };
                            const allergyCheck = checkDrugAllergy(drugObj, patientProfile);
                            drugObj.allergy_warning = allergyCheck.hasAllergy ? allergyCheck.details : null;
                            obatList.push(drugObj);
                            continue;
                        }
                    }
                } catch (e) {
                    console.warn(`[RAG] Fallback lookup failed for "${generalParsed.nama_obat}":`, e.message);
                }
            }

            // If drug collection lookup failed, use the general content as-is
            const drugObj = {
                id: cond.id,
                raw_content: cond.content,
                nama_obat: generalParsed.nama_obat,
                source_id: null,
                kategori: generalParsed.kategori || 'Medis',
                indikasi: generalParsed.indikasi || '',
                komposisi: generalParsed.komposisi || '',
                dosis: generalParsed.dosis || '',
                aturan_pakai: generalParsed.aturan_pakai || '',
                efek_samping: generalParsed.efek_samping || '',
                distance: cond.distance,
                is_fallback_from_general: true
            };
            const allergyCheck = checkDrugAllergy(drugObj, patientProfile);
            drugObj.allergy_warning = allergyCheck.hasAllergy ? allergyCheck.details : null;
            obatList.push(drugObj);
        }
        console.log(`[RAG] After fallback: ${obatList.length} total drug results`);
    }

    // ═══ PHASE 6: Score, rank, and return ═══
    const patientContextText = getPatientContextText(patientProfile);

    const rankedObat = obatList
        .map((drug) => ({ ...drug, match_score: scoreDrugMatch(queryText, drug, patientContextText) }))
        .filter((drug) => drug.match_score > 0)
        .sort((a, b) => b.match_score - a.match_score)
        .slice(0, 5);

    const rankedKondisi = rawKondisiList
        .map((cond) => ({
            ...cond,
            match_score: scoreConditionMatch(queryText, cond, patientContextText, dedupedQueries)
        }))
        .filter((cond) => cond.match_score >= 3)
        .sort((a, b) => b.match_score - a.match_score)
        .slice(0, 3);

    console.log(`[RAG] Final: ${rankedObat.length} obat (top: ${rankedObat[0]?.nama_obat || 'none'}), ${rankedKondisi.length} kondisi`);

    return {
        obat: rankedObat,
        kondisi: rankedKondisi
    };
};

module.exports = { getAll, create, update, remove, markTaken, getLogs, searchChroma };
