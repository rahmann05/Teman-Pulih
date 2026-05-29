/**
 * chromaDrugSearch.js — Multi-collection drug search + availability
 *
 * Single responsibility: search across all 3 drug collections concurrently,
 * merge results, cross-enrich formulary entries with clinical detail data.
 */
const { getChromaCollection, getDrugCollections, withTimeout, COLLECTIONS } = require('./chromaCollections');
const { vectorQuery, getDocsByDrugName } = require('./chromaQuery');

/**
 * Search a single drug collection by vector query.
 * Returns deduplicated drug names with their metadata.
 */
const _searchSingleCollection = async (col, query, sourceName, nResults = 8) => {
    if (!col) return [];
    const { docs, metas } = await vectorQuery(col, query, nResults);
    const seen = new Set();
    const results = [];
    for (let i = 0; i < docs.length; i++) {
        const name = metas[i]?.nama_obat;
        if (!name || name === 'Unknown' || seen.has(name.toLowerCase())) continue;
        seen.add(name.toLowerCase());
        results.push({ name, meta: metas[i], doc: docs[i], source: sourceName });
    }
    return results;
};

/**
 * Search ALL 3 drug collections concurrently for a query.
 * Merges results, deduplicates by normalized drug name,
 * and enriches Puskesmas/RS matches with clinical detail from detail collection.
 *
 * @param {string} query    - User drug search query
 * @param {number} nResults - Max results per collection
 * @returns {{ name, meta, doc, sources, detailDoc }[]}
 */
const searchAllDrugCollections = async (query, nResults = 8) => {
    const { detail, puskesmas, rs } = await getDrugCollections();

    const [detailRes, puskesmasRes, rsRes] = await Promise.allSettled([
        _searchSingleCollection(detail, query, 'detail', nResults),
        _searchSingleCollection(puskesmas, query, 'puskesmas', nResults),
        _searchSingleCollection(rs, query, 'rs', nResults),
    ]);

    const allHits = [
        ...(detailRes.status === 'fulfilled' ? detailRes.value : []),
        ...(puskesmasRes.status === 'fulfilled' ? puskesmasRes.value : []),
        ...(rsRes.status === 'fulfilled' ? rsRes.value : []),
    ];

    // Merge by normalized name
    const merged = new Map();
    for (const hit of allHits) {
        const key = hit.name.toLowerCase().trim();
        if (merged.has(key)) {
            const existing = merged.get(key);
            if (!existing.sources.includes(hit.source)) existing.sources.push(hit.source);
            if (hit.source === 'detail' && !existing.detailDoc) {
                existing.detailDoc = hit.doc;
                existing.meta = { ...existing.meta, ...hit.meta };
            }
        } else {
            merged.set(key, {
                name: hit.name, meta: hit.meta, doc: hit.doc,
                sources: [hit.source],
                detailDoc: hit.source === 'detail' ? hit.doc : '',
            });
        }
    }

    // Enrich Puskesmas/RS-only entries with clinical detail
    if (detail) {
        const enrichPromises = [];
        for (const entry of merged.values()) {
            if (!entry.detailDoc && entry.sources.some(s => s !== 'detail')) {
                enrichPromises.push(
                    getDocsByDrugName(detail, entry.name)
                        .then(doc => { if (doc) entry.detailDoc = doc; })
                        .catch(() => {})
                );
            }
        }
        if (enrichPromises.length > 0) await Promise.allSettled(enrichPromises);
    }

    return Array.from(merged.values());
};

/**
 * Check if a drug is available in Puskesmas and/or RS formularies.
 * @param {string} genericName
 * @returns {{ puskesmas: object[]|null, rs: object[]|null }}
 */
const checkDrugAvailability = async (genericName) => {
    if (!genericName) return { puskesmas: null, rs: null };

    const [puskesmasCol, rsCol] = await Promise.all([
        getChromaCollection(COLLECTIONS.DRUG_PUSKESMAS),
        getChromaCollection(COLLECTIONS.DRUG_RS),
    ]);

    const [puskesmasRes, rsRes] = await Promise.allSettled([
        puskesmasCol ? withTimeout(
            puskesmasCol.get({ where: { nama_obat: { $eq: genericName } }, include: ['documents', 'metadatas'] }),
            4000, `availability-puskesmas(${genericName})`
        ) : Promise.resolve(null),
        rsCol ? withTimeout(
            rsCol.get({ where: { nama_obat: { $eq: genericName } }, include: ['documents', 'metadatas'] }),
            4000, `availability-rs(${genericName})`
        ) : Promise.resolve(null),
    ]);

    return {
        puskesmas: puskesmasRes.status === 'fulfilled' && puskesmasRes.value?.documents?.length
            ? puskesmasRes.value.metadatas : null,
        rs: rsRes.status === 'fulfilled' && rsRes.value?.documents?.length
            ? rsRes.value.metadatas : null,
    };
};

module.exports = { searchAllDrugCollections, checkDrugAvailability };
