/**
 * ragService.js — RAG orchestration layer + re-exports
 *
 * Single responsibility: buildChatbotContext, allergy checks, patient context,
 * drug enrichment. Re-exports search functions from focused service modules.
 *
 * Split modules:
 * - drugSearchService.js    → searchDrug, searchDrugsList
 * - diseaseSearchService.js → searchDisease, searchDiseaseBySymptoms, buildSymptomDifferentialContext
 */

const { searchDrug, searchDrugsList } = require('./drugSearchService');
const { searchDisease, searchDiseaseBySymptoms, buildSymptomDifferentialContext } = require('./diseaseSearchService');
const { getChromaCollection, COLLECTIONS, vectorQuery, getFullDrugContent } = require('../helpers/chromaHelper');
const { parseDrugContent } = require('../helpers/ragUtils');

// ─── PATIENT CONTEXT ──────────────────────────────────────────────────────────

const getPatientContextText = (profile) => {
    if (!profile) return '';
    return [
        profile.chronic_conditions,
        profile.past_illnesses,
        profile.last_illness,
        profile.routine_medications,
    ].filter(Boolean).join(' ');
};

// ─── ALLERGY CHECK ────────────────────────────────────────────────────────────

const checkDrugAllergy = (drug, patientProfile) => {
    if (!patientProfile?.allergies) return { hasAllergy: false, details: '' };
    const allergies = patientProfile.allergies.toLowerCase().split(/,\s*/);
    const drugText = `${drug.nama_obat || ''} ${drug.komposisi || ''} ${drug.raw_content || ''}`.toLowerCase();
    for (const allergen of allergies) {
        const trimmed = allergen.trim();
        if (trimmed && drugText.includes(trimmed)) {
            return {
                hasAllergy: true,
                details: `Peringatan Medis: Mengandung "${trimmed}" yang tidak cocok dengan riwayat alergi pasien!`,
            };
        }
    }
    return { hasAllergy: false, details: '' };
};

// ─── DRUG ENRICHMENT ──────────────────────────────────────────────────────────

const enrichDrugDetails = async (drug, drugCol) => {
    if (!drugCol || !drug?.source_id) return drug;
    const hasDetails = Boolean(
        drug.kategori || drug.indikasi || drug.komposisi || drug.dosis || drug.aturan_pakai
    );
    if (hasDetails) return drug;

    const fullContent = await getFullDrugContent(drugCol, drug.source_id, drug.raw_content);
    const parsedFull = parseDrugContent(fullContent);
    return {
        ...drug,
        raw_content:  fullContent,
        kategori:     drug.kategori     || parsedFull.kategori     || '',
        indikasi:     drug.indikasi     || parsedFull.indikasi     || '',
        komposisi:    drug.komposisi    || parsedFull.komposisi    || '',
        dosis:        drug.dosis        || parsedFull.dosis        || '',
        aturan_pakai: drug.aturan_pakai || parsedFull.aturan_pakai || '',
        efek_samping: drug.efek_samping || parsedFull.efek_samping || '',
    };
};

// ─── CHATBOT CONTEXT BUILDER ──────────────────────────────────────────────────

const buildChatbotContext = async (classification, keyword, patientProfile = null) => {
    if (!keyword?.trim()) return '';

    try {
        if (classification === 'OBAT') {
            const drug = await searchDrug(keyword);
            if (!drug) return await _buildDrugFallbackFromCondition(keyword);

            const allergyCheck = patientProfile ? checkDrugAllergy(drug, patientProfile) : { hasAllergy: false };
            const lines = [
                `Informasi Obat: ${drug.nama_obat}`,
                drug.kategori     ? `Kategori: ${drug.kategori}` : '',
                drug.indikasi     ? `Indikasi: ${drug.indikasi}` : '',
                drug.komposisi    ? `Komposisi: ${drug.komposisi}` : '',
                drug.dosis        ? `Dosis: ${drug.dosis}` : '',
                drug.aturan_pakai ? `Aturan Pakai: ${drug.aturan_pakai}` : '',
                drug.efek_samping ? `Efek Samping: ${drug.efek_samping}` : '',
                drug.peringatan   ? `Peringatan: ${drug.peringatan}` : '',
                drug.tersedia_di  ? `Tersedia di: ${drug.tersedia_di}` : '',
                allergyCheck.hasAllergy ? `⚠️ ${allergyCheck.details}` : '',
            ].filter(Boolean).join('\n');

            console.log(`[RAG CHATBOT] OBAT context built for "${drug.nama_obat}"`);
            return `=== REFERENSI OBAT ===\n${lines}\n\n`;
        } else {
            const disease = await searchDisease(keyword);
            if (!disease) return '';

            const lines = [
                `Kondisi: ${disease.name}`,
                disease.indikasi     ? `Definisi: ${disease.indikasi}` : '',
                disease.gejala_umum  ? `Gejala: ${disease.gejala_umum}` : '',
                disease.penanganan   ? `Penanganan: ${disease.penanganan}` : '',
                disease.obat_terkait ? `Obat Terkait: ${disease.obat_terkait}` : '',
                disease.peringatan   ? `Peringatan: ${disease.peringatan}` : '',
            ].filter(Boolean).join('\n');

            console.log(`[RAG CHATBOT] PENYAKIT context built for "${disease.name}"`);
            return `=== REFERENSI KONDISI MEDIS ===\n${lines}\n\n`;
        }
    } catch (e) {
        console.error('[RAG CHATBOT] buildChatbotContext error:', e.message);
        return '';
    }
};

const _buildDrugFallbackFromCondition = async (keyword) => {
    try {
        const condCol = await getChromaCollection(COLLECTIONS.DISEASE);
        if (!condCol) return '';
        const { docs } = await vectorQuery(condCol, keyword, 5, { has_drugs: { $eq: true } });
        if (!docs.length) return '';
        const combined = docs.slice(0, 3).join('\n---\n');
        return `=== REFERENSI OBAT (dari kondisi medis) ===\n${combined}\n\n`;
    } catch (e) {
        console.warn(`[RAG CHATBOT] Drug fallback from condition failed:`, e.message);
        return '';
    }
};

module.exports = {
    // Re-exports from focused modules
    searchDrug,
    searchDrugsList,
    searchDisease,
    searchDiseaseBySymptoms,
    buildSymptomDifferentialContext,
    // Own responsibilities
    buildChatbotContext,
    checkDrugAllergy,
    enrichDrugDetails,
    getPatientContextText,
};
