const chatbotService = require('../services/chatbotService');
const { buildChatbotContext } = require('../services/ragService');
const { getSupabaseClient } = require('../helpers/supabase');

const sendMessage = async (req, res) => {
    let fullReply = '';
    const userId = req.user.id;
    const supabase = getSupabaseClient(req);
    const abortController = new AbortController();
    const onClientDisconnect = () => {
        console.log(`[SYSTEM] Client (User ID: ${userId}) disconnected. Aborting API request...`);
        abortController.abort();
    };
    req.on('close', onClientDisconnect);

    try {
        const rawMessage = req.body.message;
        if (!rawMessage) return res.status(400).json({ error: 'Message is required' });
        const message = chatbotService.sanitizeInput(rawMessage);
        console.log(`\n[CHAT] Request dari user ID: ${userId} | Pesan: "${message}"`);

        supabase.from('chat_history').insert([{ user_id: userId, message, sender: 'user' }]).then();

        const [emrDataResult, historyResult, gatekeeperTopic] = await Promise.all([
            supabase.from('profiles').select('*').eq('user_id', userId).single(),
            supabase.from('chat_history').select('message, sender').eq('user_id', userId).order('created_at', { ascending: false }).limit(6),
            (async () => {
                try {
                    const { genAI } = chatbotService;
                    const gatekeeperModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite', generationConfig: { temperature: 0.0, maxOutputTokens: 10 } });
                    const gatekeeperPrompt = `Klasifikasikan pesan di dalam tag <pesan>.
Kategori:
1. MEDIS: Penyakit, gejala (demam, batuk, pusing, mual, dll), obat, kesehatan, keluhan fisik/mental, kondisi medis, terminologi medis.
2. SAPAAN: Salam, ucapan terima kasih, perkenalan, salam penutup.
3. LUAR_MEDIS: Topik di luar kesehatan sama sekali (politik, hiburan, olahraga non-kesehatan, dll).

PERHATIAN: Jika ada keraguan antara MEDIS dan LUAR_MEDIS, pilih MEDIS.

<pesan>${message}</pesan>
Balas HANYA 1 kata (MEDIS, SAPAAN, atau LUAR_MEDIS).`;
                    const gateResult = await gatekeeperModel.generateContent({ contents: [{ role: 'user', parts: [{ text: gatekeeperPrompt }] }], signal: abortController.signal });
                    const text = gateResult.response.text().trim().toUpperCase();
                    if (text.includes('LUAR_MEDIS')) return 'LUAR_MEDIS';
                    if (text.includes('SAPAAN')) return 'SAPAAN';
                    return 'MEDIS';
                } catch (e) { return 'MEDIS'; }
            })(),
        ]);

        if (gatekeeperTopic === 'LUAR_MEDIS' || gatekeeperTopic === 'SAPAAN') {
            const fastReply = gatekeeperTopic === 'LUAR_MEDIS'
                ? 'Maaf ya, kenalkan saya Asep, asisten kesehatan virtual dari TemanPulih. Asep cuma difokuskan untuk ngebahas soal medis, konsultasi penyakit, atau obat-obatan nih. Kalau ada keluhan kesehatan, boleh langsung cerita ke Asep, ya!'
                : 'Halo! Kenalkan, saya Asep, asisten kesehatan virtual dari TemanPulih. Ada keluhan kesehatan yang sedang dirasakan hari ini?';
            console.log('[AI] Fast-reply sent (Bypass RAG).');
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            res.write(`data: ${JSON.stringify({ text: fastReply })}\n\n`);
            res.write('data: [DONE]\n\n');
            fullReply = fastReply;
            return;
        }

        let emrContext = '', routineMedicationsForSearch = '', privateContext = '';
        let targetPatientId = null;
        try {
            const emrData = await chatbotService.getEmrContext(supabase, req.user);
            emrContext = emrData.emrContext;
            routineMedicationsForSearch = emrData.routineMedicationsForSearch;
            privateContext = emrData.privateContext;
            targetPatientId = emrData.targetPatientId || null;
        } catch (e) {
            console.error('[RAG] Gagal mengambil Private EMR Profile:', e.message);
        }

        let chatHistoryFormat = [];
        if (historyResult.data && historyResult.data.length > 0) {
            chatHistoryFormat = chatbotService.normalizeHistory(historyResult.data.reverse());
        }

        let searchTerms = [message];
        try {
            const { genAI } = chatbotService;
            const expansionModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite', generationConfig: { temperature: 0.1 } });
            // Minta keyword dalam 2 bahasa: Indonesia dan istilah medis (yang sering dalam bahasa Inggris/Latin)
            const expandPrompt = `Ekstrak maksimal 4 kata kunci medis dari pesan ini: "${message}".
Aturan:
- Sertakan istilah dalam Bahasa Indonesia DAN istilah medis/Inggrisnya jika berbeda (contoh: "demam" dan "febris", "maag" dan "dispepsia", "darah tinggi" dan "hipertensi")
- Pisahkan dengan koma
- Hanya kata kunci medis, tidak perlu kalimat
- Jika tidak ada istilah medis yang jelas, kosongkan
Contoh output: demam, febris, batuk, cough`;
            const expandResult = await expansionModel.generateContent({ contents: [{ role: 'user', parts: [{ text: expandPrompt }] }], signal: abortController.signal });
            const expandedKeywords = expandResult.response.text().split(',').map(s => s.trim()).filter(s => s && s.length >= 2);
            if (expandedKeywords.length > 0) {
                searchTerms = [message, ...expandedKeywords];
                console.log('[RAG] Query Medis (bilingual):', searchTerms);
            }
        } catch (e) { console.warn('[RAG] Query Expansion gagal, menggunakan input asli.'); }

        // Classify the primary keyword as OBAT or PENYAKIT
        let classification = 'PENYAKIT';
        const primaryKeyword = searchTerms[0] || message;
        try {
            const { genAI } = chatbotService;
            const classifyModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite', generationConfig: { temperature: 0.0, maxOutputTokens: 5 } });
            const classifyPrompt = `Dari kata kunci medis berikut: "${primaryKeyword}". Apakah ini tentang OBAT atau PENYAKIT/GEJALA? Balas HANYA satu kata: OBAT atau PENYAKIT.`;
            const classifyResult = await classifyModel.generateContent({ contents: [{ role: 'user', parts: [{ text: classifyPrompt }] }], signal: abortController.signal });
            const classifyText = classifyResult.response.text().trim().toUpperCase();
            if (classifyText.includes('OBAT')) classification = 'OBAT';
            console.log(`[RAG] Keyword "${primaryKeyword}" classified as: ${classification}`);
        } catch (e) { console.warn('[RAG] Classification gagal, default PENYAKIT.'); }

        let ragContextFormatted = '';
        try {
            ragContextFormatted = await buildChatbotContext(classification, primaryKeyword, null);
        } catch (e) { console.error('[RAG] Error buildChatbotContext:', e.message); }

        const modelConfig = { temperature: 0.2, maxOutputTokens: 2048 };
        const safetySettings = [{ category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }];

        let systemPrompt = `Kamu adalah "Asep", asisten kesehatan AI dari TemanPulih. Nada bicaramu ramah, empatik, santai tapi profesional. Gunakan bahasa Indonesia.

ATURAN KEAMANAN KLINIS (WAJIB):
1. NO DIAGNOSIS PASTI: Gunakan frasa "Kemungkinan ini adalah..."
2. ATURAN OBAT KETAT: Kamu BOLEH menyebutkan nama obat yang TERCANTUM di [REFERENSI OBAT]. Jangan mengarang obat! JANGAN PERNAH menyebutkan dosis, HANYA sebutkan namanya saja.
3. PROTOKOL KONTRAINDIKASI (PENTING): Cek [REKAM MEDIS] dan [PENYAKIT AKTIF SAAT INI]. Jika obat saranmu bertentangan dengan Alergi, Obat Rutin, atau Penyakit Terdahulu/Saat Ini, BERI PERINGATAN KERAS dan larang konsumsi!
4. JANGAN ulangi keluhan user.

STRUKTUR JAWABAN:
- Analisis awal yang empatik (termasuk mempertimbangkan [PENYAKIT AKTIF SAAT INI]).
- Saran perawatan (Non-farmakologi).
- Saran Obat (Farmakologi) BERDASARKAN REFERENSI (Hanya sebutkan nama, dilarang sebut dosis. Sertakan peringatan jika ada kontraindikasi dengan EMR/Penyakit).
- Kapan harus ke dokter.`;

        if (!ragContextFormatted) {
            systemPrompt += '\n\n[SISTEM DARURAT]: TIDAK ADA referensi. DILARANG menyarankan nama obat medis (kimia). Berikan saran perawatan mandiri non-obat saja dan arahkan ke dokter.';
        }

        const finalMessage = `${systemPrompt}\n\n${emrContext}\n${ragContextFormatted || '[TIDAK ADA REFERENSI]'}\n\nKELUHAN PASIEN:\n"${message}"`;

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const { genAI } = chatbotService;
        const activeModelName = 'gemini-2.5-flash';
        console.log(`[AI] Menghasilkan respons dengan model: ${activeModelName}...`);
        const model = genAI.getGenerativeModel({ model: activeModelName, safetySettings, generationConfig: modelConfig });
        const chatSession = model.startChat({ history: chatHistoryFormat });
        const result = await chatSession.sendMessageStream(finalMessage, { signal: abortController.signal });

        for await (const chunk of result.stream) {
            if (abortController.signal.aborted) break;
            const chunkText = chunk.text();
            if (chunkText) {
                fullReply += chunkText;
                res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
            }
        }

        if (!abortController.signal.aborted) {
            res.write('data: [DONE]\n\n');
        }
    } catch (error) {
        if (error.name === 'AbortError' || error.message.includes('abort')) {
            console.warn('\n[SYSTEM] Request dihentikan: koneksi client terputus.');
            return;
        }
        console.error('\n[SYSTEM] Chatbot Error:', error.message);
        if (!res.writableEnded) {
            const errorMsg = error.message === 'RateLimit'
                ? 'Asep minta maaf, sistem lagi sibuk banget nih. Tunggu sebentar lalu coba lagi ya.'
                : 'Asep minta maaf, jaringan ke otak Asep lagi terputus. Coba tanya lagi nanti ya.';
            res.write(`data: ${JSON.stringify({ error: errorMsg })}\n\ndata: [DONE]\n\n`);
        }
    } finally {
        req.removeListener('close', onClientDisconnect);
        if (fullReply && fullReply.trim().length > 0) {
            try {
                await supabase.from('chat_history').insert([{ user_id: userId, message: fullReply.trim(), sender: 'ai' }]);
            } catch (dbError) {
                console.error('[DB] Gagal menyimpan histori:', dbError.message);
            }
        }
        if (!res.writableEnded) res.end();
    }
};

const getHistory = async (req, res, next) => {
    try {
        const supabase = getSupabaseClient(req);
        const data = await chatbotService.getHistory(supabase, req.user.id);
        res.status(200).json(data);
    } catch (err) { next(err); }
};

const clearHistory = async (req, res, next) => {
    try {
        const supabase = getSupabaseClient(req);
        await chatbotService.clearHistory(supabase, req.user.id);
        res.status(200).json({ message: 'Riwayat chat berhasil dihapus' });
    } catch (err) { next(err); }
};

module.exports = { sendMessage, getHistory, clearHistory };