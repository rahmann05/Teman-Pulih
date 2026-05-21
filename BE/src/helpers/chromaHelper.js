/**
 * chromaHelper.js — ChromaDB I/O helper
 * Single responsibility: low-level ChromaDB operations
 * (collection access, chunk fetching and merging)
 */
const { chromaClient } = require('../config/chroma.js');

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

/**
 * Fetch dan merge SEMUA chunk dari condition collection berdasarkan source_id.
 * Penting untuk penyakit seperti Xerosis yang punya chunk_index 0,1,2
 * berisi informasi berbeda yang harus digabung.
 */
const getFullConditionContent = async (collection, sourceId, initialDoc = '') => {
    if (!collection || !sourceId) return initialDoc;
    try {
        const response = await collection.get({ where: { source_id: sourceId } });
        if (!response?.documents?.length) return initialDoc;

        const indexedDocs = response.documents.map((doc, i) => ({
            index: response.metadatas?.[i]?.chunk_index ?? 0,
            doc: doc || '',
        }));
        indexedDocs.sort((a, b) => a.index - b.index);
        const merged = indexedDocs.map(d => d.doc).filter(Boolean).join('\n');
        return merged || initialDoc;
    } catch (e) {
        console.warn(`[CHROMA] getFullConditionContent error (source_id=${sourceId}):`, e.message);
        return initialDoc;
    }
};

/**
 * Fetch dan merge SEMUA chunk dari drug collection berdasarkan source_id.
 */
const getFullDrugContent = async (collection, sourceId, initialDoc = '') => {
    if (!collection || !sourceId) return initialDoc;
    try {
        const response = await collection.get({ where: { source_id: sourceId } });
        if (!response?.documents?.length) return initialDoc;

        const indexedDocs = response.documents.map((doc, i) => ({
            index: response.metadatas?.[i]?.chunk_index ?? 0,
            doc: doc || '',
        }));
        indexedDocs.sort((a, b) => a.index - b.index);
        const merged = indexedDocs.map(d => d.doc).filter(Boolean).join(' ');
        return merged || initialDoc;
    } catch (e) {
        console.warn(`[CHROMA] getFullDrugContent error (source_id=${sourceId}):`, e.message);
        return initialDoc;
    }
};

module.exports = { getChromaCollection, getFullConditionContent, getFullDrugContent };
