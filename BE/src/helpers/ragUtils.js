/**
 * ragUtils.js — Centralized RAG utilities for TemanPulih
 *
 * Handles:
 * - Medical synonym expansion (Indonesian ↔ English ↔ Latin/medical terms)
 * - Robust text normalization
 * - Multi-strategy illness name extraction (handles both structured & free-form docs)
 * - Field extraction tolerant of varied formatting
 * - Drug & illness content parsing
 */

// ─── MEDICAL SYNONYM MAP ──────────────────────────────────────────────────────
// Bidirectional: Indonesian ↔ English ↔ Medical Latin
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
    diare:          ['diarrhea', 'mencret', 'gastroenteritis'],
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
    diabetes:            ['kencing manis', 'dm', 'diabetes mellitus', 'hiperglikemia', 'hyperglycemia', 'gula darah'],
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
    kolesterol:   ['cholesterol', 'dislipidemia', 'dyslipidemia', 'lemak darah'],
    cholesterol:  ['kolesterol', 'dislipidemia', 'lemak darah'],
    dislipidemia: ['dyslipidemia', 'kolesterol', 'lemak darah'],

    // Ginjal / Kidney
    ginjal:        ['kidney', 'renal', 'nefritis', 'nephritis', 'batu ginjal'],
    'batu ginjal': ['kidney stone', 'urolitiasis', 'nephrolithiasis', 'ginjal'],
    'kidney stone':['batu ginjal', 'urolitiasis'],
    nefritis:      ['nephritis', 'ginjal', 'radang ginjal'],
    nephritis:     ['nefritis', 'ginjal'],

    // Kulit / Skin
    alergi:     ['allergy', 'urtikaria', 'gatal', 'ruam', 'rash', 'dermatitis'],
    allergy:    ['alergi', 'urtikaria', 'gatal'],
    dermatitis: ['alergi', 'eksim', 'eczema', 'ruam'],
    eczema:     ['eksim', 'dermatitis', 'alergi'],
    eksim:      ['eczema', 'dermatitis', 'alergi'],
    psoriasis:  ['ruam', 'kulit', 'dermatitis'],
    xerosis:    ['kulit kering', 'dry skin'],
    'kulit kering': ['xerosis', 'dry skin'],

    // Infeksi / Infection
    infeksi:     ['infection', 'bakteri', 'virus', 'antibiotik', 'antibiotic'],
    antibiotik:  ['antibiotic', 'amoxicillin', 'ampisilin'],
    antibiotic:  ['antibiotik', 'infeksi'],

    // Nyeri / Pain
    nyeri:       ['pain', 'sakit', 'analgesik', 'analgesic', 'nsaid'],
    analgesik:   ['analgesic', 'pain', 'nyeri', 'parasetamol', 'ibuprofen'],
    analgesic:   ['analgesik', 'pain', 'nyeri'],
    ibuprofen:   ['analgesik', 'nsaid', 'anti inflamasi'],
    parasetamol: ['paracetamol', 'acetaminophen', 'analgesik', 'demam'],
    paracetamol: ['parasetamol', 'acetaminophen', 'analgesik', 'demam'],

    // Mental Health
    depresi:       ['depression', 'kesedihan', 'antidepresan'],
    depression:    ['depresi', 'kesedihan'],
    anxietas:      ['anxiety', 'kecemasan', 'panik'],
    anxiety:       ['anxietas', 'kecemasan'],
    insomnia:      ['susah tidur', 'gangguan tidur', 'sleep disorder'],
    'susah tidur': ['insomnia', 'gangguan tidur'],

    // Pernapasan / Respiratory
    pneumonia: ['radang paru', 'paru-paru', 'lung infection'],
    tbc:       ['tuberculosis', 'tb', 'batuk darah', 'paru-paru'],
    tuberculosis: ['tbc', 'tb', 'batuk darah'],

    // Obat-obatan umum
    antasida:     ['antacid', 'maag', 'lambung', 'gerd'],
    antihistamin: ['antihistamine', 'alergi', 'gatal'],
    antihistamine:['antihistamin', 'alergi', 'gatal'],
    cetirizine:   ['cetirizin', 'antihistamin', 'zyrtec', 'alergi'],
    cetirizin:    ['cetirizine', 'antihistamin', 'alergi'],
    metformin:    ['glucophage', 'diabetes', 'antidiabetik'],
    amlodipine:   ['amlodipin', 'norvasc', 'hipertensi', 'antihipertensi'],
    amlodipin:    ['amlodipine', 'norvasc', 'hipertensi'],
    omeprazole:   ['omeprazol', 'nexium', 'lansoprazole', 'maag', 'gerd'],
    omeprazol:    ['omeprazole', 'nexium', 'maag', 'gerd'],
    simvastatin:  ['zocor', 'kolesterol', 'statin'],
    salbutamol:   ['albuterol', 'ventolin', 'asma', 'bronkodilator'],
    albuterol:    ['salbutamol', 'ventolin', 'asma'],

    // Obat batuk-pilek kombinasi populer Indonesia
    paratusin:    ['batuk', 'pilek', 'flu', 'demam', 'dekongestan', 'obat flu'],
    paratusin_forte: ['paratusin', 'batuk', 'pilek', 'flu'],
    obh:          ['batuk', 'pilek', 'flu', 'ekspektoran'],
    vicks:        ['batuk', 'pilek', 'flu', 'demam'],
    panadol:      ['parasetamol', 'paracetamol', 'demam', 'nyeri'],
    bodrex:       ['parasetamol', 'demam', 'nyeri', 'sakit kepala'],
    feminax:      ['nyeri haid', 'dismenore', 'parasetamol'],
    promag:       ['maag', 'antasida', 'lambung'],
    mylanta:      ['maag', 'antasida', 'lambung', 'gerd'],
    norit:        ['diare', 'keracunan', 'karbon aktif'],
    antimo:       ['mual', 'mabuk perjalanan', 'antihistamin'],
    diapet:       ['diare', 'sakit perut'],
    entrostop:    ['diare', 'sakit perut'],
    combivent:    ['asma', 'salbutamol', 'ipratropium', 'bronkodilator'],
    ventolin:     ['salbutamol', 'asma', 'bronkodilator'],
    proris:       ['ibuprofen', 'nyeri', 'demam', 'anti inflamasi'],
    ponstan:      ['mefenamat', 'nyeri', 'anti inflamasi', 'nyeri haid'],
    celebrex:     ['celecoxib', 'nsaid', 'nyeri', 'anti inflamasi'],
    voltaren:     ['diklofenak', 'diclofenac', 'nyeri', 'anti inflamasi'],
    neurobion:    ['vitamin b', 'neurologi', 'saraf'],
    sanaflu:      ['flu', 'pilek', 'batuk', 'demam'],
    decolgen:     ['flu', 'pilek', 'batuk', 'dekongestan'],
    actifed:      ['flu', 'pilek', 'antihistamin', 'dekongestan'],
    rhinos:       ['flu', 'pilek', 'antihistamin'],
    siladex:      ['batuk', 'pilek', 'dekongestan', 'ekspektoran'],
    woods:        ['batuk', 'ekspektoran', 'mukolitik'],
};

// ─── TEXT NORMALIZATION ───────────────────────────────────────────────────────

/**
 * Normalize text: lowercase, strip extra whitespace, keep alphanumeric + spaces + hyphens
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

// ─── LEVENSHTEIN FUZZY MATCH ──────────────────────────────────────────────────

/**
 * Calculate the Levenshtein distance between two strings
 */
const getLevenshteinDistance = (a, b) => {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            matrix[i][j] = b.charAt(i - 1) === a.charAt(j - 1)
                ? matrix[i - 1][j - 1]
                : Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
        }
    }
    return matrix[b.length][a.length];
};

/**
 * Robust exact, substring, and token fuzzy matching between query and disease name
 */
const checkFuzzyMatch = (a, b) => {
    const normA = (a || '').toLowerCase().trim();
    const normB = (b || '').toLowerCase().trim();
    if (!normA || !normB) return { match: false };

    const cleanA = normA.replace(/[^a-z0-9]/g, '');
    const cleanB = normB.replace(/[^a-z0-9]/g, '');
    if (cleanA === cleanB) return { match: true, type: 'exact' };
    if (cleanA.includes(cleanB) || cleanB.includes(cleanA)) {
        return { match: true, type: 'substring' };
    }

    const wholeDist = getLevenshteinDistance(cleanA, cleanB);
    const maxLen = Math.max(cleanA.length, cleanB.length);
    if (maxLen >= 4 && wholeDist <= 2 && wholeDist / maxLen <= 0.3) {
        return { match: true, type: 'fuzzy', distance: wholeDist };
    }

    // Token-level comparison
    const tokensA = normA.split(/[^a-z0-9]+/).filter(t => t.length >= 3);
    const tokensB = normB.split(/[^a-z0-9]+/).filter(t => t.length >= 3);

    let bestTokenType = null;
    let minTokenDist = 999;

    for (const tA of tokensA) {
        for (const tB of tokensB) {
            if (tA === tB) { bestTokenType = 'exact'; break; }
            if (tA.includes(tB) || tB.includes(tA)) {
                bestTokenType = bestTokenType === 'exact' ? 'exact' : 'substring';
                continue;
            }
            const tokenDist = getLevenshteinDistance(tA, tB);
            const maxTokenLen = Math.max(tA.length, tB.length);
            if (maxTokenLen >= 4 && tokenDist <= 1 && tokenDist / maxTokenLen <= 0.25) {
                if (tokenDist < minTokenDist) { minTokenDist = tokenDist; bestTokenType = 'fuzzy'; }
            }
        }
    }

    if (bestTokenType) {
        return {
            match: true,
            type: bestTokenType === 'exact' ? 'substring' : bestTokenType,
            distance: minTokenDist === 999 ? 0 : minTokenDist,
        };
    }

    return { match: false };
};

// ─── QUERY EXPANSION ─────────────────────────────────────────────────────────

/**
 * Expand a query with all known medical synonyms (bidirectional, deduped)
 */
const expandQuery = (queryText) => {
    if (!queryText) return [];
    const base = normalizeText(queryText);
    if (!base) return [];

    const expanded = new Set([queryText.trim(), base]);
    const tokens = tokenize(base);

    for (const token of tokens) {
        const syns = MEDICAL_SYNONYMS[token];
        if (syns) syns.forEach(s => expanded.add(s));
    }

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
 * Build a deduped, unique array of queries for ChromaDB vector search
 * (used only in chatbot fallback — primary search uses metadata filtering)
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

const ALL_FIELD_KEYS = [
    'Nama Obat', 'Obat', 'Nama', 'Drug Name', 'Informasi Obat',
    'Kategori', 'Golongan', 'Kelas', 'Category',
    'Indikasi', 'Kegunaan', 'Fungsi', 'Indication', 'Digunakan untuk',
    'Komposisi', 'Kandungan', 'Bahan Aktif', 'Composition',
    'Dosis', 'Takaran', 'Dosage', 'Dosis Umum',
    'Aturan Pakai', 'Cara Pakai', 'Cara Penggunaan', 'Cara Minum',
    'Efek Samping', 'Side Effects', 'Reaksi',
    'Peringatan', 'Perhatian', 'Kontraindikasi', 'Warning', 'Contraindication',
    'Gejala', 'Tanda', 'Gejala Umum', 'Symptoms', 'Signs',
    'Penanganan', 'Pengobatan', 'Terapi', 'Tatalaksana', 'Treatment', 'Manajemen',
    'Obat Terkait', 'Farmakologi', 'Medication', 'Drug'
];

const extractField = (text, keys, maxLen = 300) => {
    if (!text) return null;
    const normalizedText = text.replace(/\r\n/g, '\n');

    for (const key of keys) {
        const regex = new RegExp(`(?:^|\\n|\\.|;|\\s)(${key})\\s*[:\\-–—]\\s*`, 'i');
        const match = normalizedText.match(regex);
        if (!match) continue;

        const startIndex = match.index + match[0].length;
        let value = normalizedText.substring(startIndex);

        let minNextKeyIndex = value.length;
        for (const otherKey of ALL_FIELD_KEYS) {
            if (keys.some(k => k.toLowerCase() === otherKey.toLowerCase())) continue;
            const nextKeyRegex = new RegExp(`(?:^|\\n|\\.|;|\\s)(${otherKey})\\s*[:\\-–—]`, 'i');
            const nextKeyMatch = value.match(nextKeyRegex);
            if (nextKeyMatch && nextKeyMatch.index < minNextKeyIndex) {
                minNextKeyIndex = nextKeyMatch.index;
            }
        }

        const newlineIndex = value.indexOf('\n');
        if (newlineIndex !== -1 && newlineIndex < minNextKeyIndex) {
            const lineContent = value.substring(0, newlineIndex).trim();
            if (lineContent.length >= 3) {
                minNextKeyIndex = newlineIndex;
            }
        }

        value = value.substring(0, minNextKeyIndex).trim();
        value = value.replace(/[.,;:\-\s]+$/, '').trim();

        if (value.length >= 3) {
            return value.substring(0, maxLen);
        }
    }
    return null;
};

// ─── ILLNESS NAME EXTRACTION ──────────────────────────────────────────────────

/**
 * Extract illness/condition name from a ChromaDB document.
 * Tries multiple strategies in order of confidence.
 */
const extractIllnessName = (doc) => {
    if (!doc) return null;

    const s1 = doc.match(/(?:Kondisi|Penyakit|Nama Penyakit|Nama Kondisi|Diagnosis)[\s:]+([^\n:.]{3,80})/i);
    if (s1 && s1[1]?.trim().length >= 3) {
        return s1[1].trim().replace(/[:.]+$/, '').trim();
    }

    const FIELD_HEADER_RE = /^(?:gejala|penanganan|pengobatan|obat|dosis|kategori|indikasi|komposisi|peringatan|efek|aturan|informasi obat|definisi|tanda|terapi)\s*[:\-]/i;
    const lines = doc.split('\n').map(l => l.trim()).filter(l => l.length >= 3);
    for (const line of lines.slice(0, 3)) {
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

// ─── CONTENT PARSERS ─────────────────────────────────────────────────────────

/**
 * Parse drug info from ChromaDB doc.
 */
const parseDrugContent = (content) => {
    if (!content) return {};
    return {
        nama_obat:      extractField(content, ['Nama Obat', 'Obat', 'Nama', 'Drug Name', 'Informasi Obat'], 80),
        kategori:       extractField(content, ['Kategori', 'Golongan', 'Kelas', 'Category'], 80),
        indikasi:       extractField(content, ['Indikasi', 'Kegunaan', 'Fungsi', 'Indication', 'Digunakan untuk'], 300),
        komposisi:      extractField(content, ['Komposisi', 'Kandungan', 'Bahan Aktif', 'Composition'], 200),
        dosis:          extractField(content, ['Dosis', 'Takaran', 'Dosage', 'Dosis Umum'], 200),
        aturan_pakai:   extractField(content, ['Aturan Pakai', 'Cara Pakai', 'Cara Penggunaan', 'Cara Minum'], 200),
        efek_samping:   extractField(content, ['Efek Samping', 'Side Effects', 'Reaksi'], 200),
        kontraindikasi: extractField(content, ['Kontraindikasi', 'Contraindication'], 200),
        peringatan:     extractField(content, ['Peringatan', 'Perhatian', 'Warning'], 200),
    };
};

/**
 * Parse illness/condition info from ChromaDB doc.
 */
const parseIllnessContent = (content) => {
    if (!content) return {};
    return {
        indikasi:     extractField(content, ['Indikasi', 'Definisi', 'Pengertian', 'Deskripsi', 'Description'], 300),
        gejala_umum:  extractField(content, ['Gejala', 'Tanda', 'Gejala Umum', 'Symptoms', 'Signs'], 300),
        penanganan:   extractField(content, ['Penanganan', 'Pengobatan', 'Terapi', 'Tatalaksana', 'Treatment', 'Manajemen'], 300),
        obat_terkait: extractField(content, ['Obat Terkait', 'Obat', 'Farmakologi', 'Medication', 'Drug'], 200),
        peringatan:   extractField(content, ['Peringatan', 'Perhatian', 'Kontraindikasi', 'Warning', 'Contraindication'], 200),
    };
};

module.exports = {
    MEDICAL_SYNONYMS,
    normalizeText,
    tokenize,
    getLevenshteinDistance,
    checkFuzzyMatch,
    expandQuery,
    buildQueryList,
    extractField,
    extractIllnessName,
    parseDrugContent,
    parseIllnessContent,
};
