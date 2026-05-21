/**
 * chromaHelper.js — ChromaDB I/O helper
 *
 * Responsibilities:
 * - Low-level ChromaDB collection access
 * - In-memory metadata cache (disease_name list, nama_obat list)
 * - Fuzzy name matching against cached lists
 * - Metadata-filtered document fetching + chunk merging
 */
const { chromaClient } = require('../config/chroma.js');

// ─── COLLECTION ACCESS ────────────────────────────────────────────────────────

/**
 * Safely get a ChromaDB collection by name.
 * Returns null instead of throwing if collection not found.
 */
const getChromaCollection = async (name) => {
    try {
        return await chromaClient.getCollection({ name });
    } catch (e) {
        console.warn(`[CHROMA] Collection "${name}" not found:`, e.message);
        return null;
    }
};

// ─── IN-MEMORY METADATA CACHE ─────────────────────────────────────────────────

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

const _cache = {
    diseaseNames: null,
    drugNames:    null,
    expiry:       0,
};

/**
 * Fetch all metadatas from a collection using 300-per-page pagination.
 * @param {object} collection - ChromaDB collection
 * @returns {object[]} Array of metadata objects
 */
const _fetchAllMetadatas = async (collection) => {
    const all = [];
    let offset = 0;
    while (true) {
        const res = await collection.get({ include: ['metadatas'], limit: 300, offset }).catch(() => null);
        if (!res?.metadatas?.length) break;
        all.push(...res.metadatas);
        offset += 300;
        if (offset > 6000) break; // safety cap
    }
    return all;
};

/**
 * Get all unique disease_name values from RAG-TemanPulih (cached 6h).
 * @returns {string[]}
 */
const getDiseaseNames = async () => {
    if (_cache.diseaseNames && Date.now() < _cache.expiry) return _cache.diseaseNames;
    try {
        const col = await getChromaCollection(process.env.CHROMA_DATABASE || 'RAG-TemanPulih');
        if (!col) return [];
        console.log('[CHROMA CACHE] Fetching disease metadata list...');
        const metas = await _fetchAllMetadatas(col);
        _cache.diseaseNames = [...new Set(metas.map(m => m?.disease_name).filter(Boolean))];
        _cache.expiry = Date.now() + CACHE_TTL_MS;
        console.log(`[CHROMA CACHE] Cached ${_cache.diseaseNames.length} unique disease names.`);
        return _cache.diseaseNames;
    } catch (e) {
        console.warn('[CHROMA CACHE] getDiseaseNames failed:', e.message);
        return _cache.diseaseNames || [];
    }
};

/**
 * Get all unique nama_obat values from RAG-TemanPulih-Obat (cached 6h).
 * @returns {string[]}
 */
const getDrugNames = async () => {
    if (_cache.drugNames && Date.now() < _cache.expiry) return _cache.drugNames;
    try {
        const col = await getChromaCollection(process.env.CHROMA_DATABASE_DRUGS || 'RAG-TemanPulih-Obat');
        if (!col) return [];
        console.log('[CHROMA CACHE] Fetching drug metadata list...');
        const metas = await _fetchAllMetadatas(col);
        _cache.drugNames = [...new Set(metas.map(m => m?.nama_obat).filter(Boolean))];
        // Share same TTL as disease names
        if (!_cache.expiry || _cache.expiry < Date.now() + CACHE_TTL_MS) {
            _cache.expiry = Date.now() + CACHE_TTL_MS;
        }
        console.log(`[CHROMA CACHE] Cached ${_cache.drugNames.length} unique drug names.`);
        return _cache.drugNames;
    } catch (e) {
        console.warn('[CHROMA CACHE] getDrugNames failed:', e.message);
        return _cache.drugNames || [];
    }
};

/** Invalidate the metadata cache (call after new data is indexed). */
const invalidateMetadataCache = () => {
    _cache.diseaseNames = null;
    _cache.drugNames    = null;
    _cache.expiry       = 0;
    console.log('[CHROMA CACHE] Metadata cache invalidated.');
};

// ─── FUZZY NAME MATCHING ─────────────────────────────────────────────────────

const _normalizeForMatch = (text) =>
    (text || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

const _levenshtein = (a, b) => {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            matrix[i][j] = b[i - 1] === a[j - 1]
                ? matrix[i - 1][j - 1]
                : Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
        }
    }
    return matrix[b.length][a.length];
};

const MEDICAL_STOPWORDS = new Set([
    'penyakit', 'obat', 'saya', 'mencari', 'resep', 'sakit', 'gejala',
    'dan', 'di', 'ke', 'dari', 'pada', 'atau', 'yang', 'adalah', 'untuk',
    'ingin', 'tahu', 'tentang', 'bagaimana', 'apa', 'apakah',
]);

/**
 * Fuzzy match a query against a list of canonical names.
 * Strategy: exact → substring → Levenshtein (whole) → Levenshtein (token-level)
 *
 * @param {string}   query    - User's search query
 * @param {string[]} nameList - Canonical names to match against
 * @param {number}   topN     - How many top matches to return (default 3)
 * @returns {{ name: string, score: number, type: string }[]}
 */
const fuzzyMatchName = (query, nameList, topN = 3) => {
    const normQuery = _normalizeForMatch(query);
    if (!normQuery || !nameList?.length) return [];

    const matches = new Map();

    const scoreCandidate = (normWord, isToken = false) => {
        if (!normWord || normWord.length < 3) return;
        if (isToken && MEDICAL_STOPWORDS.has(normWord)) return;

        for (const item of nameList) {
            const normItem = _normalizeForMatch(item);

            // 1. Exact
            if (normItem === normWord) {
                matches.set(item, { name: item, score: 100, type: 'exact' });
                continue;
            }

            // 2. Substring (item contains query or vice versa)
            if (normWord.length >= 4 && (normItem.includes(normWord) || normWord.includes(normItem))) {
                const score = 50 + normWord.length * 2;
                const prev = matches.get(item);
                if (!prev || prev.score < score) matches.set(item, { name: item, score, type: 'substring' });
                continue;
            }

            // 3. Whole-string Levenshtein
            const dist = _levenshtein(normWord, normItem);
            const maxLen = Math.max(normWord.length, normItem.length);
            if (maxLen >= 4 && dist <= 2 && dist / maxLen <= 0.3) {
                const score = 90 - dist * 15;
                const prev = matches.get(item);
                if (!prev || prev.score < score) matches.set(item, { name: item, score, type: 'fuzzy' });
            }
        }
    };

    // Check full query
    scoreCandidate(normQuery, false);

    // Check each token (with stopword filter)
    const tokens = normQuery.split(' ').filter(t => t.length >= 3);
    if (tokens.length > 1) {
        for (const token of tokens) scoreCandidate(token, true);
    }

    return Array.from(matches.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, topN);
};

// ─── DOCUMENT FETCHING + CHUNK MERGING ───────────────────────────────────────

/**
 * Fetch and merge ALL chunks of a condition document by disease_name.
 * Uses $eq filter on metadata — fast and deterministic.
 *
 * @param {object} condCol     - RAG-TemanPulih collection
 * @param {string} diseaseName - Exact disease_name to fetch
 * @returns {string} Merged full content, or ''
 */
const getDocsByDiseaseName = async (condCol, diseaseName) => {
    if (!condCol || !diseaseName) return '';
    try {
        const response = await condCol.get({
            where: { disease_name: { $eq: diseaseName } },
            include: ['documents', 'metadatas'],
        });
        if (!response?.documents?.length) return '';

        const indexed = response.documents.map((doc, i) => ({
            index: response.metadatas?.[i]?.chunk_index ?? 0,
            doc:   doc || '',
        }));
        indexed.sort((a, b) => a.index - b.index);
        return indexed.map(d => d.doc).filter(Boolean).join('\n');
    } catch (e) {
        console.warn(`[CHROMA] getDocsByDiseaseName error ("${diseaseName}"):`, e.message);
        return '';
    }
};

/**
 * Fetch and merge ALL chunks of a drug document by nama_obat.
 * Uses $eq filter on metadata — fast and deterministic.
 *
 * @param {object} drugCol  - RAG-TemanPulih-Obat collection
 * @param {string} drugName - Exact nama_obat to fetch
 * @returns {string} Merged full content, or ''
 */
const getDocsByDrugName = async (drugCol, drugName) => {
    if (!drugCol || !drugName) return '';
    try {
        const response = await drugCol.get({
            where: { nama_obat: { $eq: drugName } },
            include: ['documents', 'metadatas'],
        });
        if (!response?.documents?.length) return '';

        const indexed = response.documents.map((doc, i) => ({
            index: response.metadatas?.[i]?.chunk_index ?? 0,
            doc:   doc || '',
        }));
        indexed.sort((a, b) => a.index - b.index);
        return indexed.map(d => d.doc).filter(Boolean).join('\n');
    } catch (e) {
        console.warn(`[CHROMA] getDocsByDrugName error ("${drugName}"):`, e.message);
        return '';
    }
};

/**
 * Fetch and merge ALL chunks of a condition document by source_id.
 * Used as fallback when disease_name is not known but source_id is.
 */
const getFullConditionContent = async (collection, sourceId, initialDoc = '') => {
    if (!collection || !sourceId) return initialDoc;
    try {
        const response = await collection.get({ where: { source_id: sourceId } });
        if (!response?.documents?.length) return initialDoc;

        const indexedDocs = response.documents.map((doc, i) => ({
            index: response.metadatas?.[i]?.chunk_index ?? 0,
            doc:   doc || '',
        }));
        indexedDocs.sort((a, b) => a.index - b.index);
        return indexedDocs.map(d => d.doc).filter(Boolean).join('\n') || initialDoc;
    } catch (e) {
        console.warn(`[CHROMA] getFullConditionContent error (source_id=${sourceId}):`, e.message);
        return initialDoc;
    }
};

/**
 * Fetch and merge ALL chunks of a drug document by source_id.
 */
const getFullDrugContent = async (collection, sourceId, initialDoc = '') => {
    if (!collection || !sourceId) return initialDoc;
    try {
        const response = await collection.get({ where: { source_id: sourceId } });
        if (!response?.documents?.length) return initialDoc;

        const indexedDocs = response.documents.map((doc, i) => ({
            index: response.metadatas?.[i]?.chunk_index ?? 0,
            doc:   doc || '',
        }));
        indexedDocs.sort((a, b) => a.index - b.index);
        return indexedDocs.map(d => d.doc).filter(Boolean).join(' ') || initialDoc;
    } catch (e) {
        console.warn(`[CHROMA] getFullDrugContent error (source_id=${sourceId}):`, e.message);
        return initialDoc;
    }
};

module.exports = {
    getChromaCollection,
    getDiseaseNames,
    getDrugNames,
    invalidateMetadataCache,
    fuzzyMatchName,
    getDocsByDiseaseName,
    getDocsByDrugName,
    getFullConditionContent,
    getFullDrugContent,
};
