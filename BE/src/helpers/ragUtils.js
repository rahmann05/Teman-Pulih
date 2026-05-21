/**
 * ragUtils.js — Centralized RAG utilities for TemanPulih
 *
 * Handles:
 * - Medical synonym expansion (Indonesian ↔ English ↔ Latin/medical terms)
 * - Robust text normalization
 * - Soft relevance scoring (vector-first, lexical as boost)
 * - Multi-strategy illness name extraction (handles both structured & free-form docs)
 * - Field extraction tolerant of varied formatting
 */

// ─── MEDICAL SYNONYM MAP ──────────────────────────────────────────────────────
// Bidirectional: Indonesian ↔ English ↔ Medical Latin
// Each key maps to an array of equivalent terms
const MEDICAL_SYNONYMS = {
    // Demam / Fever
    demam:          ['fever', 'febris', 'panas', 'hipertermia', 'hyperthermia', 'antipiretik'],
    fever:          ['demam', 'febris', 'panas'],
    febris:         ['demam', 'fever', 'panas'],
    panas:          ['demam', 'fever', 'febris'],

    // Sakit Kepala / Headache
    'sakit kepala': ['headache', 'cephalgia', 'sefalgia', 'migrain', 'migraine', 'pusing'],
    headache:       ['sakit kepala', 'cephalgia', 'sefalgia', 'migrain'],
    migrain:        ['migraine', 'sakit kepala', 'headache', 'cephalgia'],
    migraine:       ['migrain', 'sakit kepala', 'headache'],
    cephalgia:      ['sakit kepala', 'headache', 'sefalgia'],
    sefalgia:       ['sakit kepala', 'headache', 'cephalgia'],
    pusing:         ['vertigo', 'dizziness', 'sakit kepala'],
    vertigo:        ['pusing', 'dizziness'],

    // Batuk / Cough
    batuk:          ['cough', 'antitusif', 'ekspektoran', 'mukolitik', 'tbc', 'tuberculosis'],
    cough:          ['batuk', 'antitusif'],

    // Pilek / Flu
    flu:            ['influenza', 'pilek', 'selesma', 'rhinitis', 'common cold', 'rhinorrhea'],
    influenza:      ['flu', 'pilek', 'selesma'],
    pilek:          ['flu', 'influenza', 'rhinitis', 'selesma'],
    rhinitis:       ['pilek', 'flu', 'alergi hidung'],

    // Sesak Napas / Dyspnea
    'sesak napas':  ['dyspnea', 'dispnea', 'asma', 'asthma', 'bronkitis', 'bronchitis'],
    asma:           ['asthma', 'sesak napas', 'bronkospasme'],
    asthma:         ['asma', 'sesak napas'],
    bronkitis:      ['bronchitis', 'batuk', 'sesak napas'],
    bronchitis:     ['bronkitis', 'batuk', 'sesak napas'],

    // Perut / Gastrointestinal
    maag:           ['gastritis', 'dispepsia', 'dyspepsia', 'lambung', 'gerd', 'antasida', 'ulkus'],
    gastritis:      ['maag', 'dispepsia', 'lambung', 'radang lambung'],
    dispepsia:      ['dyspepsia', 'maag', 'gastritis', 'lambung'],
    dyspepsia:      ['dispepsia', 'maag', 'gastritis'],
    gerd:           ['maag', 'lambung', 'asam lambung', 'refluks', 'reflux'],
    lambung:        ['maag', 'gerd', 'gastritis', 'dispepsia'],
    'asam lambung': ['gerd', 'refluks', 'reflux', 'heartburn'],
    diare:          ['diarrhea', 'mencret', 'gastroenteritis', 'loe'],
    diarrhea:       ['diare', 'mencret', 'gastroenteritis'],
    sembelit:       ['constipation', 'konstipasi'],
    constipation:   ['sembelit', 'konstipasi'],
    mual:           ['nausea', 'muntah', 'vomiting'],
    nausea:         ['mual', 'muntah'],
    muntah:         ['vomiting', 'mual', 'nausea'],
    vomiting:       ['muntah', 'mual'],

    // Tekanan Darah / Blood Pressure
    hipertensi:     ['hypertension', 'darah tinggi', 'tekanan darah tinggi', 'htn'],
    hypertension:   ['hipertensi', 'darah tinggi', 'tekanan darah tinggi'],
    'darah tinggi': ['hipertensi', 'hypertension', 'htn'],
    hipotensi:      ['hypotension', 'darah rendah', 'tekanan darah rendah'],
    hypotension:    ['hipotensi', 'darah rendah'],

    // Diabetes
    diabetes:           ['kencing manis', 'dm', 'diabetes mellitus', 'hiperglikemia', 'hyperglycemia', 'gula darah'],
    'diabetes mellitus': ['diabetes', 'kencing manis', 'dm', 'hiperglikemia'],
    'kencing manis':     ['diabetes', 'diabetes mellitus', 'dm'],
    hiperglikemia:       ['hyperglycemia', 'diabetes', 'gula darah tinggi'],
    hyperglycemia:       ['hiperglikemia', 'diabetes'],

    // Jantung / Cardiac
    'sakit jantung':    ['heart disease', 'penyakit jantung', 'kardiovaskular', 'jantung'],
    'penyakit jantung': ['heart disease', 'sakit jantung', 'kardiovaskular'],
    'heart disease':    ['sakit jantung', 'penyakit jantung', 'kardiovaskular'],
    aritmia:            ['arrhythmia', 'detak jantung tidak teratur'],
    arrhythmia:         ['aritmia', 'detak jantung tidak teratur'],

    // Kolesterol
    kolesterol:     ['cholesterol', 'dislipidemia', 'dyslipidemia', 'lemak darah'],
    cholesterol:    ['kolesterol', 'dislipidemia', 'lemak darah'],
    dislipidemia:   ['dyslipidemia', 'kolesterol', 'lemak darah'],

    // Ginjal / Kidney
    ginjal:         ['kidney', 'renal', 'nefritis', 'nephritis', 'batu ginjal'],
    'batu ginjal':  ['kidney stone', 'urolitiasis', 'nephrolithiasis', 'ginjal'],
    'kidney stone': ['batu ginjal', 'urolitiasis'],
    nefritis:       ['nephritis', 'ginjal', 'radang ginjal'],
    nephritis:      ['nefritis', 'ginjal'],

    // Kulit / Skin
    alergi:         ['allergy', 'urtikaria', 'gatal', 'ruam', 'rash', 'dermatitis'],
    allergy:        ['alergi', 'urtikaria', 'gatal', 'ruam'],
    urtikaria:      ['urticaria', 'biduran', 'gatal', 'alergi'],
    urticaria:      ['urtikaria', 'biduran', 'gatal'],
    dermatitis:     ['radang kulit', 'eksim', 'eczema', 'alergi kulit'],
    eksim:          ['eczema', 'dermatitis', 'kulit kering'],
    eczema:         ['eksim', 'dermatitis'],
    jerawat:        ['acne', 'akne'],
    acne:           ['jerawat', 'akne'],

    // Tulang & Sendi / Bone & Joint
    rematik:        ['rheumatoid', 'arthritis', 'sendi', 'nyeri sendi'],
    arthritis:      ['rematik', 'radang sendi', 'nyeri sendi'],
    osteoporosis:   ['keropos tulang', 'pengeroposan tulang'],
    asam_urat:      ['gout', 'hiperurisemia', 'hyperuricemia', 'asam urat'],
    gout:           ['asam urat', 'hiperurisemia', 'radang sendi'],
    'nyeri sendi':  ['joint pain', 'arthralgia', 'rematik', 'sendi'],

    // Infeksi / Infection
    infeksi:        ['infection', 'bakteri', 'virus', 'jamur', 'fungal'],
    'infeksi saluran kemih': ['isk', 'uti', 'urinary tract infection', 'sistitis'],
    isk:            ['uti', 'infeksi saluran kemih', 'urinary tract infection'],
    uti:            ['isk', 'infeksi saluran kemih'],
    tbc:            ['tuberculosis', 'tb', 'flek paru', 'tuberkulosis'],
    tuberculosis:   ['tbc', 'tb', 'tuberkulosis'],
    tuberkulosis:   ['tuberculosis', 'tbc', 'tb'],

    // Syaraf / Neurological
    stroke:         ['cerebrovascular', 'serangan otak', 'lumpuh', 'paralisis'],
    epilepsi:       ['epilepsy', 'kejang', 'seizure', 'antikonvulsan'],
    epilepsy:       ['epilepsi', 'kejang', 'seizure'],
    kejang:         ['seizure', 'epilepsi', 'konvulsi'],
    seizure:        ['kejang', 'epilepsi', 'konvulsi'],

    // Tiroid / Thyroid
    tiroid:         ['thyroid', 'hipotiroid', 'hipertiroid', 'gondok'],
    hipotiroid:     ['hypothyroid', 'tiroid', 'gondok'],
    hypothyroid:    ['hipotiroid', 'tiroid'],
    hipertiroid:    ['hyperthyroid', 'tiroid', 'gondok'],

    // Obat-obatan Umum (nama brand ↔ generic)
    paracetamol:    ['parasetamol', 'acetaminophen', 'panadol', 'sanmol', 'tempra', 'pamol'],
    parasetamol:    ['paracetamol', 'acetaminophen', 'panadol', 'sanmol', 'tempra'],
    acetaminophen:  ['paracetamol', 'parasetamol'],
    ibuprofen:      ['brufen', 'proris', 'advil', 'motrin', 'nurofen'],
    amoxicillin:    ['amoksisilin', 'amoxilin', 'amoxil', 'trimox'],
    amoksisilin:    ['amoxicillin', 'amoxilin'],
    antasida:       ['antacid', 'promag', 'mylanta', 'maag'],
    promag:         ['antasida', 'antacid', 'maag', 'lambung'],
    'obat cacing':  ['albendazole', 'mebendazole', 'pirantel', 'pamoat', 'combantrin'],
    albendazole:    ['mebendazole', 'pirantel', 'obat cacing'],
    paramex:        ['analgesik', 'obat sakit kepala'],
    cetirizine:     ['cetirizin', 'antihistamin', 'zyrtec', 'alergi'],
    cetirizin:      ['cetirizine', 'antihistamin', 'alergi'],
    metformin:      ['glucophage', 'diabetes', 'antidiabetik'],
    amlodipine:     ['amlodipin', 'norvasc', 'hipertensi', 'antihipertensi'],
    amlodipin:      ['amlodipine', 'norvasc', 'hipertensi'],
    omeprazole:     ['omeprazol', 'nexium', 'lansoprazole', 'maag', 'gerd'],
    omeprazol:      ['omeprazole', 'nexium', 'maag', 'gerd'],
    simvastatin:    ['zocor', 'kolesterol', 'statin'],
    salbutamol:     ['albuterol', 'ventolin', 'asma', 'bronkodilator'],
    albuterol:      ['salbutamol', 'ventolin', 'asma'],
};

// ─── TEXT NORMALIZATION ───────────────────────────────────────────────────────

/**
 * Normalize text: lowercase, strip extra whitespace, keep alphanumeric + spaces
 * Keeps hyphens in compound words (e.g., "non-farmakologi")
 */
const normalizeText = (text) =>
    (text || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s\-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

/**
 * Tokenize normalized text into meaningful tokens (min 2 chars)
 */
const tokenize = (text) =>
    normalizeText(text)
        .split(' ')
        .filter(t => t.length >= 2);

// ─── QUERY EXPANSION ─────────────────────────────────────────────────────────

/**
 * Expand a query with all known medical synonyms (bidirectional, deduped)
 * Returns array of expanded terms including the original
 */
const expandQuery = (queryText) => {
    if (!queryText) return [];
    const base = normalizeText(queryText);
    if (!base) return [];

    const expanded = new Set([queryText.trim(), base]);
    const tokens = tokenize(base);

    // Single-token synonym lookup
    for (const token of tokens) {
        const syns = MEDICAL_SYNONYMS[token];
        if (syns) syns.forEach(s => expanded.add(s));
    }

    // Multi-token phrase lookup (e.g., "sakit kepala", "darah tinggi")
    for (const phrase of Object.keys(MEDICAL_SYNONYMS)) {
        if (base.includes(phrase) || phrase.includes(base)) {
            const syns = MEDICAL_SYNONYMS[phrase];
            if (syns) syns.forEach(s => expanded.add(s));
            expanded.add(phrase);
        }
    }

    return Array.from(expanded).filter(Boolean);
};

/**
 * Build a deduped, unique array of queries for ChromaDB
 * (expanded + original, normalized, no empty strings)
 */
const buildQueryList = (queryText, extraTerms = []) => {
    const all = [queryText, ...extraTerms, ...expandQuery(queryText)];
    const seen = new Set();
    return all
        .map(q => (q || '').trim())
        .filter(q => q.length >= 2)
        .filter(q => {
            const n = normalizeText(q);
            if (seen.has(n)) return false;
            seen.add(n);
            return true;
        });
};

// ─── FIELD EXTRACTION (tolerant of mixed format docs) ────────────────────────

/**
 * Extract a field value from text, supporting multiple key aliases and formats:
 * - "Key: Value"
 * - "Key\nValue"
 * - "Key — Value"
 * - Free-form sentence containing the key
 *
 * @param {string} text   - Full document text
 * @param {string[]} keys - Field name aliases to try
 * @param {number} maxLen - Max chars to return (default 300)
 */
const extractField = (text, keys, maxLen = 300) => {
    if (!text) return null;

    for (const key of keys) {
        // Pattern 1: "Key: value..." (stops at next field or newline)
        const p1 = new RegExp(
            `${key}[\\s]*[:\\-–—][\\s]*([^\\n]{3,${maxLen}})`,
            'i'
        );
        const m1 = text.match(p1);
        if (m1 && m1[1]?.trim().length >= 3) {
            return m1[1].trim().substring(0, maxLen);
        }

        // Pattern 2: "Key\n value" (key alone on a line, value on next)
        const p2 = new RegExp(`${key}\\s*\\n+([^\\n]{3,${maxLen}})`, 'i');
        const m2 = text.match(p2);
        if (m2 && m2[1]?.trim().length >= 3) {
            return m2[1].trim().substring(0, maxLen);
        }
    }
    return null;
};

// ─── ILLNESS NAME EXTRACTION (multi-strategy, robust) ────────────────────────

/**
 * Extract illness/condition name from a ChromaDB document.
 * Tries multiple strategies in order of confidence:
 *   1. Structured field: "Kondisi: X", "Penyakit: X", "Nama: X"
 *   2. First line that looks like a title (uppercase start, short, no "adalah")
 *   3. "X adalah penyakit/kondisi..." pattern
 *   4. First non-empty line as last resort (truncated)
 *
 * Never returns null — always has a fallback.
 */
const extractIllnessName = (doc) => {
    if (!doc) return null;

    // Strategy 1: Explicit structured field — paling reliable
    const s1 = doc.match(/(?:Kondisi|Penyakit|Nama Penyakit|Nama Kondisi|Diagnosis)[:\s]+([^\n:.]{3,80})/i);
    if (s1 && s1[1]?.trim().length >= 3) {
        return s1[1].trim().replace(/[:.]+$/, '').trim();
    }

    // Strategy 2: First line yang terlihat seperti judul/heading
    // Skip baris yang merupakan field header (Gejala:, Obat:, dll) — itu bukan nama penyakit
    const FIELD_HEADER_RE = /^(?:gejala|penanganan|pengobatan|obat|dosis|kategori|indikasi|komposisi|peringatan|efek|aturan|informasi obat|definisi|tanda|terapi)\s*[:\-]/i;
    const lines = doc.split('\n').map(l => l.trim()).filter(l => l.length >= 3);
    for (const line of lines.slice(0, 3)) {  // cek 3 baris pertama untuk judul
        const clean = line.replace(/^[*\-•→\s]+/, '').trim();
        if (
            clean.length >= 3 &&
            clean.length <= 70 &&
            !FIELD_HEADER_RE.test(clean) &&
            !clean.toLowerCase().includes(' adalah ') &&
            !clean.toLowerCase().startsWith('informasi obat:')
        ) {
            return clean.substring(0, 70);
        }
    }

    return null;
};

// ─── SOFT RELEVANCE SCORING ───────────────────────────────────────────────────

/**
 * Compute a soft relevance score between a query and a text blob.
 * Used as the primary sorting mechanism — does NOT hard-reject results.
 *
 * Score composition:
 *  - Full phrase match in text: +6
 *  - Each matching token (>=3 chars): +2
 *  - Each matching synonym: +1.5
 *  - Vector distance bonus (lower distance = higher bonus): 0–4
 *
 * @param {string}   queryText        - Original user query
 * @param {string}   text             - Document text to score against
 * @param {number}   distance         - ChromaDB cosine distance (optional)
 * @param {string[]} expandedQueries  - Pre-expanded synonyms
 * @returns {number} score (higher = more relevant)
 */
const softScore = (queryText, text, distance = null, expandedQueries = []) => {
    if (!queryText || !text) return 0;
    const q = normalizeText(queryText);
    const t = normalizeText(text);
    const tokens = tokenize(q);

    let score = 0;

    // Full phrase match
    if (t.includes(q)) score += 6;

    // Token-level matching
    for (const token of tokens) {
        if (token.length >= 3 && t.includes(token)) score += 2;
    }

    // Synonym expansion matching
    for (const exp of expandedQueries) {
        const en = normalizeText(exp);
        if (en.length >= 3 && t.includes(en)) score += 1.5;
    }

    // Vector distance bonus (cosine: 0=identical, 2=opposite)
    // distance < 0.4 → very semantically close → big bonus
    if (distance !== null && distance !== undefined) {
        if (distance < 0.4) score += 4;
        else if (distance < 0.6) score += 2.5;
        else if (distance < 0.8) score += 1;
        else if (distance < 1.0) score += 0.3;
        // distance >= 1.0 → no bonus, but still not rejected
    }

    return score;
};

/**
 * Determines if a result should be soft-rejected (truly irrelevant).
 * Only rejects if: score == 0 AND distance >= 1.2 (very far semantically)
 * This is much more permissive than the previous hard lexical gate.
 *
 * @param {number} score    - softScore result
 * @param {number} distance - ChromaDB cosine distance
 * @returns {boolean} true if should be kept, false if truly irrelevant
 */
const isSoftRelevant = (score, distance) => {
    if (score > 0) return true;                  // Any lexical match → keep
    if (distance !== null && distance < 0.75) return true;  // Semantically close → keep
    return false;                                 // No signal at all → drop
};

// ─── DRUG & CONDITION SCORING (pure functions) ───────────────────────────────

/**
 * Score obat berdasarkan query — mengutamakan name match, lalu komposisi/indikasi,
 * kemudian vector distance sebagai sinyal kuat (bukan tiebreaker).
 *
 * @param {string} queryText         - Query text
 * @param {object} drug              - Drug object with nama_obat, komposisi, indikasi, kategori, distance
 * @param {string} patientContextText - Optional patient context for bonus scoring
 * @returns {number} score
 */
const scoreDrugMatch = (queryText, drug, patientContextText = '') => {
    const query = normalizeText(queryText);
    if (!query) return 0;
    const name      = normalizeText(drug.nama_obat  || '');
    const komposisi = normalizeText(drug.komposisi  || '');
    const indikasi  = normalizeText(drug.indikasi   || '');
    const kategori  = normalizeText(drug.kategori   || '');

    let score = 0;
    if (name === query) score += 15;
    else if (name.includes(query)) score += 10;
    else if (query.includes(name) && name.length >= 3) score += 8;
    if (komposisi.includes(query)) score += 5;
    if (indikasi.includes(query))  score += 5;
    if (kategori.includes(query))  score += 2;

    const queryTokens = tokenize(query);
    for (const token of queryTokens) {
        if (token.length >= 3) {
            if (name.includes(token))      score += 3;
            if (komposisi.includes(token)) score += 1.5;
            if (indikasi.includes(token))  score += 1.5;
        }
    }
    if (drug.distance !== null && drug.distance !== undefined) {
        if (drug.distance < 0.4)       score += 6;
        else if (drug.distance < 0.6)  score += 4;
        else if (drug.distance < 0.8)  score += 2;
        else if (drug.distance < 1.0)  score += 0.5;
    }
    if (patientContextText) {
        const patientText = normalizeText(patientContextText);
        for (const token of queryTokens) {
            if (token.length >= 3 && patientText.includes(token)) score += 0.5;
        }
    }
    return score;
};

/**
 * Score kondisi — soft scoring menggunakan softScore sebagai base,
 * dengan opsional bonus dari patient context.
 *
 * @param {string}   queryText         - Original query
 * @param {object}   condition         - { content, distance }
 * @param {string}   patientContextText - Optional patient context for bonus
 * @param {string[]} expandedQueries   - Pre-expanded synonym queries
 * @returns {number} score
 */
const scoreConditionMatch = (queryText, condition, patientContextText = '', expandedQueries = []) => {
    let score = softScore(queryText, condition.content || '', condition.distance, expandedQueries);
    if (patientContextText && score > 0) {
        const patientText = normalizeText(patientContextText);
        const tokens = tokenize(normalizeText(queryText));
        for (const token of tokens) {
            if (token.length >= 3 && patientText.includes(token)) score += 0.5;
        }
    }
    return score;
};


// ─── DRUG CONTENT PARSING ────────────────────────────────────────────────────

/**
 * Parse structured drug content from ChromaDB doc.
 * Handles both "Informasi Obat: X\nKategori: Y" style
 * and free-form text with partial fields.
 */
const parseDrugContent = (content) => {
    if (!content) return {};

    const namaMatch = content.match(/Informasi Obat:\s*(.*?)(?=\s*\b(?:Kategori|Indikasi|Komposisi|Dosis|Aturan Pakai|Efek Samping|Peringatan):|$)/is);
    const namaObat = namaMatch ? namaMatch[1].trim() : '';

    const extractF = (text, fieldName) => {
        const regex = new RegExp(
            `${fieldName}[:\\s]+(.*?)(?=\\s*\\b(?:Kategori|Indikasi|Komposisi|Dosis|Aturan Pakai|Efek Samping|Peringatan|Obat Terkait|Informasi Obat):|$)`,
            'is'
        );
        const m = text.match(regex);
        return m ? m[1].trim() : '';
    };

    return {
        nama_obat:   namaObat,
        kategori:    extractF(content, 'Kategori'),
        indikasi:    extractF(content, 'Indikasi'),
        komposisi:   extractF(content, 'Komposisi'),
        dosis:       extractF(content, 'Dosis'),
        aturan_pakai: extractF(content, 'Aturan Pakai'),
        efek_samping: extractF(content, 'Efek Samping'),
    };
};

/**
 * Parse illness/condition info from ChromaDB doc.
 * Handles both structured and free-form formats.
 */
const parseIllnessContent = (content) => {
    if (!content) return {};
    return {
        indikasi:    extractField(content, ['Indikasi', 'Definisi', 'Pengertian', 'Deskripsi', 'Description'], 300),
        gejala_umum: extractField(content, ['Gejala', 'Tanda', 'Gejala Umum', 'Symptoms', 'Signs'], 300),
        penanganan:  extractField(content, ['Penanganan', 'Pengobatan', 'Terapi', 'Tatalaksana', 'Treatment', 'Manajemen'], 300),
        obat_terkait: extractField(content, ['Obat Terkait', 'Obat', 'Farmakologi', 'Medication', 'Drug'], 200),
        peringatan:  extractField(content, ['Peringatan', 'Perhatian', 'Kontraindikasi', 'Warning', 'Contraindication'], 200),
    };
};

module.exports = {
    MEDICAL_SYNONYMS,
    normalizeText, tokenize,
    expandQuery, buildQueryList,
    extractField, extractIllnessName,
    softScore, isSoftRelevant,
    scoreDrugMatch, scoreConditionMatch,
    parseDrugContent, parseIllnessContent,
};
