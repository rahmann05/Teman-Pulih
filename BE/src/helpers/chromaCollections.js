/**
 * chromaCollections.js — ChromaDB collection access layer
 *
 * Single responsibility: safe collection retrieval with caching + timeout utility
 */
const { chromaClient, COLLECTIONS } = require('../config/chroma.js');

const QUERY_TIMEOUT_MS = 6000;

/** Wrap a promise with a timeout. Rejects with a clear message if exceeded. */
const withTimeout = (promise, ms = QUERY_TIMEOUT_MS, label = 'Chroma query') => {
    let timer;
    const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`[TIMEOUT] ${label} exceeded ${ms}ms`)), ms);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
};

const _collectionCache = new Map();
const COLLECTION_CACHE_TTL = 30 * 60 * 1000;

/**
 * Safely get a ChromaDB collection by name.
 * Caches the collection object for 30min to avoid repeated round-trips.
 * Returns null instead of throwing if collection not found.
 */
const getChromaCollection = async (name) => {
    const cached = _collectionCache.get(name);
    if (cached && Date.now() < cached.expiry) return cached.col;
    try {
        const col = await withTimeout(
            chromaClient.getCollection({ name }),
            5000,
            `getCollection(${name})`
        );
        _collectionCache.set(name, { col, expiry: Date.now() + COLLECTION_CACHE_TTL });
        return col;
    } catch (e) {
        console.warn(`[CHROMA] Collection "${name}" not found:`, e.message);
        return null;
    }
};

/** Get all 3 drug collections concurrently. Any that fail will be null. */
const getDrugCollections = async () => {
    const [detail, puskesmas, rs] = await Promise.all([
        getChromaCollection(COLLECTIONS.DRUG_DETAIL),
        getChromaCollection(COLLECTIONS.DRUG_PUSKESMAS),
        getChromaCollection(COLLECTIONS.DRUG_RS),
    ]);
    return { detail, puskesmas, rs };
};

module.exports = {
    getChromaCollection,
    getDrugCollections,
    withTimeout,
    QUERY_TIMEOUT_MS,
    COLLECTIONS,
};
