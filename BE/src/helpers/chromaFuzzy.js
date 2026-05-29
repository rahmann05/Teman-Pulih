/**
 * chromaFuzzy.js — Fuzzy name matching for medical terms
 *
 * Single responsibility: match user queries against canonical drug/disease name lists
 * using exact, substring, token-level, and Levenshtein strategies.
 */

const MEDICAL_STOPWORDS = new Set([
    'penyakit', 'obat', 'saya', 'mencari', 'resep', 'sakit', 'gejala',
    'dan', 'di', 'ke', 'dari', 'pada', 'atau', 'yang', 'adalah', 'untuk',
    'ingin', 'tahu', 'tentang', 'bagaimana', 'apa', 'apakah',
]);

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

/**
 * Fuzzy match a query against a list of canonical names.
 * Strategy: exact → substring → token-level substring → Levenshtein
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

            if (normItem === normWord) {
                matches.set(item, { name: item, score: 100, type: 'exact' });
                continue;
            }

            if (normWord.length >= 4 && (normItem.includes(normWord) || normWord.includes(normItem))) {
                const score = 70 + normWord.length * 2;
                const prev = matches.get(item);
                if (!prev || prev.score < score) matches.set(item, { name: item, score, type: 'substring' });
                continue;
            }

            const queryTokens = normWord.split(' ').filter(t => t.length >= 4);
            const itemTokens  = normItem.split(' ').filter(t => t.length >= 3);
            let tokenScore = 0;
            for (const qt of queryTokens) {
                if (MEDICAL_STOPWORDS.has(qt)) continue;
                for (const it of itemTokens) {
                    if (it === qt) { tokenScore = Math.max(tokenScore, 65); break; }
                    if (qt.length >= 5 && (it.includes(qt) || qt.includes(it))) {
                        tokenScore = Math.max(tokenScore, 55 + qt.length);
                        break;
                    }
                }
            }
            if (tokenScore > 0) {
                const prev = matches.get(item);
                if (!prev || prev.score < tokenScore) matches.set(item, { name: item, score: tokenScore, type: 'substring' });
                continue;
            }

            const dist = _levenshtein(normWord, normItem);
            const maxLen = Math.max(normWord.length, normItem.length);
            if (maxLen >= 4 && dist <= 2 && dist / maxLen <= 0.3) {
                const score = 90 - dist * 15;
                const prev = matches.get(item);
                if (!prev || prev.score < score) matches.set(item, { name: item, score, type: 'fuzzy' });
            }
        }
    };

    scoreCandidate(normQuery, false);
    const tokens = normQuery.split(' ').filter(t => t.length >= 3);
    if (tokens.length > 1) {
        for (const token of tokens) scoreCandidate(token, true);
    }

    return Array.from(matches.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, topN);
};

module.exports = { fuzzyMatchName };
