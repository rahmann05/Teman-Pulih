/**
 * chromaCache.js — Per-collection metadata name caches
 *
 * Single responsibility: cache unique metadata field values from each collection
 * with independent TTLs. Provides merged drug name lists across all 3 drug collections.
 */
const { getChromaCollection, COLLECTIONS } = require('./chromaCollections');

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const _nameCache = new Map();

/** Fetch all metadatas from a collection using 300-per-page pagination. */
const _fetchAllMetadatas = async (collection) => {
    const all = [];
    let offset = 0;
    while (true) {
        const res = await collection.get({ include: ['metadatas'], limit: 300, offset }).catch(() => null);
        if (!res?.metadatas?.length) break;
        all.push(...res.metadatas);
        offset += 300;
        if (offset > 6000) break;
    }
    return all;
};

/**
 * Get unique values for a metadata field from a collection (cached 6h).
 * @param {string} collectionName
 * @param {string} fieldName - e.g. 'disease_name', 'nama_obat'
 * @returns {string[]}
 */
const getCachedNames = async (collectionName, fieldName) => {
    const cacheKey = `${collectionName}:${fieldName}`;
    const cached = _nameCache.get(cacheKey);
    if (cached && Date.now() < cached.expiry) return cached.names;

    try {
        const col = await getChromaCollection(collectionName);
        if (!col) return _nameCache.get(cacheKey)?.names || [];
        console.log(`[CHROMA CACHE] Fetching ${fieldName} list from ${collectionName}...`);
        const metas = await _fetchAllMetadatas(col);
        const names = [...new Set(metas.map(m => m?.[fieldName]).filter(Boolean))];
        _nameCache.set(cacheKey, { names, expiry: Date.now() + CACHE_TTL_MS });
        console.log(`[CHROMA CACHE] Cached ${names.length} unique ${fieldName} from ${collectionName}.`);
        return names;
    } catch (e) {
        console.warn(`[CHROMA CACHE] getCachedNames(${collectionName}, ${fieldName}) failed:`, e.message);
        return _nameCache.get(cacheKey)?.names || [];
    }
};

const getDiseaseNames = () => getCachedNames(COLLECTIONS.DISEASE, 'disease_name');
const getDrugNamesDetail = () => getCachedNames(COLLECTIONS.DRUG_DETAIL, 'nama_obat');
const getDrugNamesPuskesmas = () => getCachedNames(COLLECTIONS.DRUG_PUSKESMAS, 'nama_obat');
const getDrugNamesRS = () => getCachedNames(COLLECTIONS.DRUG_RS, 'nama_obat');

/**
 * Merged flat list of unique drug names from all 3 collections.
 * Filters out 'Unknown' entries. Used for fuzzy matching.
 */
const getDrugNames = async () => {
    const cacheKey = '__merged_drug_names_flat';
    const cached = _nameCache.get(cacheKey);
    if (cached && Date.now() < cached.expiry) return cached.names;

    const [detail, puskesmas, rs] = await Promise.all([
        getDrugNamesDetail(), getDrugNamesPuskesmas(), getDrugNamesRS(),
    ]);

    const seen = new Set();
    const merged = [];
    for (const name of [...detail, ...puskesmas, ...rs]) {
        if (!name || name === 'Unknown') continue;
        const key = name.toLowerCase().trim();
        if (!seen.has(key)) { seen.add(key); merged.push(name); }
    }

    _nameCache.set(cacheKey, { names: merged, expiry: Date.now() + CACHE_TTL_MS });
    console.log(`[CHROMA CACHE] Merged ${merged.length} unique drug names across all collections.`);
    return merged;
};

/** Invalidate all metadata caches. */
const invalidateMetadataCache = () => {
    _nameCache.clear();
    console.log('[CHROMA CACHE] All metadata caches invalidated.');
};

module.exports = {
    getDiseaseNames,
    getDrugNames,
    getDrugNamesDetail,
    getDrugNamesPuskesmas,
    getDrugNamesRS,
    invalidateMetadataCache,
};
