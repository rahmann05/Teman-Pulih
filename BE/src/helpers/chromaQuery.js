/**
 * chromaQuery.js — ChromaDB query + chunk-merging utilities
 *
 * Single responsibility: vector queries with timeout and document chunk assembly.
 */
const { withTimeout, QUERY_TIMEOUT_MS } = require('./chromaCollections');

/**
 * Fetch and merge ALL chunks of a document by a metadata field + value.
 * @param {object} collection
 * @param {string} field  - e.g. 'disease_name', 'nama_obat'
 * @param {string} value  - exact metadata value
 * @returns {string} merged content, or ''
 */
const getDocsByMetadataField = async (collection, field, value) => {
    if (!collection || !value) return '';
    try {
        const response = await withTimeout(
            collection.get({
                where: { [field]: { $eq: value } },
                include: ['documents', 'metadatas'],
            }),
            QUERY_TIMEOUT_MS,
            `get(${field}=${value})`
        );
        if (!response?.documents?.length) return '';

        const indexed = response.documents.map((doc, i) => ({
            index: response.metadatas?.[i]?.chunk_index ?? 0,
            doc: doc || '',
        }));
        indexed.sort((a, b) => a.index - b.index);
        return indexed.map(d => d.doc).filter(Boolean).join('\n');
    } catch (e) {
        console.warn(`[CHROMA] getDocsByMetadataField error (${field}="${value}"):`, e.message);
        return '';
    }
};

const getDocsByDiseaseName = (col, name) => getDocsByMetadataField(col, 'disease_name', name);
const getDocsByDrugName    = (col, name) => getDocsByMetadataField(col, 'nama_obat', name);

/**
 * Perform a vector similarity search on a collection.
 * Single queryText — Chroma Cloud embeddings handle semantics.
 * @returns {{ docs: string[], metas: object[], distances: number[] }}
 */
const vectorQuery = async (collection, queryText, nResults = 10, where = undefined) => {
    if (!collection || !queryText) return { docs: [], metas: [], distances: [] };
    try {
        const params = {
            queryTexts: [queryText], nResults,
            include: ['documents', 'metadatas', 'distances'],
        };
        if (where) params.where = where;

        const result = await withTimeout(
            collection.query(params),
            QUERY_TIMEOUT_MS,
            `vectorQuery(${queryText.substring(0, 40)})`
        );
        const rawDocs  = result?.documents?.flat() || [];
        const rawMetas = result?.metadatas?.flat() || [];
        const rawDists = result?.distances?.flat() || [];
        const docs = [], metas = [], distances = [];
        for (let i = 0; i < rawDocs.length; i++) {
            if (rawDocs[i] && rawMetas[i]) {
                docs.push(rawDocs[i]);
                metas.push(rawMetas[i]);
                distances.push(rawDists[i] ?? 1.0);
            }
        }
        return { docs, metas, distances };
    } catch (e) {
        console.warn(`[CHROMA] vectorQuery failed:`, e.message);
        return { docs: [], metas: [], distances: [] };
    }
};

/** Backward compat: query disease collection with combined symptoms string. */
const queryDiseasesBySymptoms = (collection, symptoms, nResults = 12) => {
    if (!collection || !symptoms?.length) return Promise.resolve({ docs: [], metas: [], distances: [] });
    return vectorQuery(collection, symptoms.join(' '), nResults);
};

/** Fetch all chunks by source_id, merge in order. */
const getFullContentBySourceId = async (collection, sourceId, initialDoc = '', joinChar = '\n') => {
    if (!collection || !sourceId) return initialDoc;
    try {
        const response = await withTimeout(
            collection.get({ where: { source_id: sourceId }, include: ['documents', 'metadatas'] }),
            QUERY_TIMEOUT_MS,
            `getFullContent(${sourceId})`
        );
        if (!response?.documents?.length) return initialDoc;
        const indexed = response.documents.map((doc, i) => ({
            index: response.metadatas?.[i]?.chunk_index ?? 0,
            doc: doc || '',
        }));
        indexed.sort((a, b) => a.index - b.index);
        return indexed.map(d => d.doc).filter(Boolean).join(joinChar) || initialDoc;
    } catch (e) {
        console.warn(`[CHROMA] getFullContent error (source_id=${sourceId}):`, e.message);
        return initialDoc;
    }
};

const getFullConditionContent = (col, sourceId, init = '') => getFullContentBySourceId(col, sourceId, init, '\n');
const getFullDrugContent      = (col, sourceId, init = '') => getFullContentBySourceId(col, sourceId, init, ' ');

module.exports = {
    getDocsByMetadataField,
    getDocsByDiseaseName,
    getDocsByDrugName,
    vectorQuery,
    queryDiseasesBySymptoms,
    getFullConditionContent,
    getFullDrugContent,
};
