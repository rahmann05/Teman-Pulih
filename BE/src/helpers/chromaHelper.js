/**
 * chromaHelper.js — Barrel re-export for backward compatibility
 *
 * All logic has been split into focused modules:
 * - chromaCollections.js  → Collection access + timeout
 * - chromaCache.js        → Metadata name caches
 * - chromaQuery.js        → Vector query + chunk merging
 * - chromaFuzzy.js        → Fuzzy name matching
 * - chromaDrugSearch.js   → Multi-collection drug search
 *
 * This file re-exports everything so existing `require('./chromaHelper')` calls still work.
 */

const { getChromaCollection, getDrugCollections, withTimeout, COLLECTIONS } = require('./chromaCollections');
const { getDiseaseNames, getDrugNames, getDrugNamesDetail, getDrugNamesPuskesmas, getDrugNamesRS, invalidateMetadataCache } = require('./chromaCache');
const { getDocsByDiseaseName, getDocsByDrugName, getDocsByMetadataField, vectorQuery, queryDiseasesBySymptoms, getFullConditionContent, getFullDrugContent } = require('./chromaQuery');
const { fuzzyMatchName } = require('./chromaFuzzy');
const { searchAllDrugCollections, checkDrugAvailability } = require('./chromaDrugSearch');

module.exports = {
    // Collections
    getChromaCollection,
    getDrugCollections,
    COLLECTIONS,

    // Caches
    getDiseaseNames,
    getDrugNames,
    getDrugNamesDetail,
    getDrugNamesPuskesmas,
    getDrugNamesRS,
    invalidateMetadataCache,

    // Queries
    getDocsByDiseaseName,
    getDocsByDrugName,
    getDocsByMetadataField,
    vectorQuery,
    queryDiseasesBySymptoms,
    getFullConditionContent,
    getFullDrugContent,

    // Fuzzy
    fuzzyMatchName,

    // Multi-collection search
    searchAllDrugCollections,
    checkDrugAvailability,

    // Utilities
    withTimeout,
};
