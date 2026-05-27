const chatbotService = require('../services/chatbotService');
const { buildChatbotContext, buildSymptomDifferentialContext } = require('../services/ragService');
const { getSupabaseClient } = require('../helpers/supabase');
const { expandQuery } = require('../helpers/ragUtils');

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
                    const gatekeeperPrompt = `Klasifikasikan pesan di dalam tag <pesan>.
Kategori yang harus Anda pilih (Pilih salah satu dari 3 kata berikut saja):
- LUAR_MEDIS: Jika pesan menanyakan hal selain kesehatan manusia, termasuk membuat kode program/coding/programming (seperti bahasa C, Python, JavaScript, Java, PHP, HTML, CSS, dll.), matematika, fisika, politik, hiburan, gosip, atau topik non-medis lainnya.
- SAPAAN: Jika pesan berupa salam (halo, selamat pagi, siang, sore, malam), perkenalan diri, ucapan terima kasih, atau salam penutup.
- MEDIS: Jika pesan berupa keluhan penyakit, gejala fisik/mental, pertanyaan tentang obat, resep dokter, cara menyembuhkan luka, atau topik medis manusia.

PENTING: Jika pesan mengandung kata 'kode', 'program', 'koding', 'bahasa C', 'fungsi', atau meminta menulis kode software, Anda WAJIB membalas dengan 'LUAR_MEDIS'. Jangan berasumsi 'C' di sini adalah Vitamin C jika ada kata 'bahasa C' atau 'kode'.

<pesan>${message}</pesan>
Balas HANYA dengan 1 kata pilihan Anda: MEDIS, SAPAAN, atau LUAR_MEDIS.`;

                    let gateResult;
                    try {
                        const gatekeeperModel = genAI.getGenerativeModel({ model: 'gemini-3.5-flash', generationConfig: { temperature: 0.0, maxOutputTokens: 10 } });
                        gateResult = await gatekeeperModel.generateContent({ contents: [{ role: 'user', parts: [{ text: gatekeeperPrompt }] }], signal: abortController.signal });
                    } catch (primaryGateErr) {
                        console.warn('[CHAT] Gatekeeper gemini-3.5-flash gagal. Mencoba fallback ke gemini-3.1-flash-lite...', primaryGateErr.message);
                        const gatekeeperModel = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite', generationConfig: { temperature: 0.0, maxOutputTokens: 10 } });
                        gateResult = await gatekeeperModel.generateContent({ contents: [{ role: 'user', parts: [{ text: gatekeeperPrompt }] }], signal: abortController.signal });
                    }

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

        // ── Step 1: Smart extraction — separate SYMPTOMS from DRUGS BEING TAKEN ──────
        let symptomKeywords = [];   // gejala yang dikeluhkan
        let drugsMentioned = [];   // obat yang sedang dikonsumsi user
        let expandedKeywords = [];
        let llmExtractionOk = false;

        try {
            const { genAI } = chatbotService;
            const expandPrompt = `Analisis pesan medis berikut dan ekstrak informasi dalam format JSON (tanpa markdown).

Pesan: "${message}"

Output JSON:
{"gejala":["gejala/keluhan yang dirasakan, max 3"],"obat_diminum":["obat yang disebutkan sedang dikonsumsi user, max 3"],"kata_kunci_medis":["kata kunci medis lain, max 3"]}

Contoh untuk "saya mual dan pusing, sedang minum amoxicillin":
{"gejala":["mual","pusing"],"obat_diminum":["amoxicillin"],"kata_kunci_medis":["mual","pusing","amoxicillin"]}`;

            let expandResult;
            try {
                const expansionModel = genAI.getGenerativeModel({
                    model: 'gemini-3.5-flash',
                    generationConfig: { temperature: 0.1, maxOutputTokens: 150 },
                });
                expandResult = await expansionModel.generateContent({
                    contents: [{ role: 'user', parts: [{ text: expandPrompt }] }],
                    signal: abortController.signal,
                });
            } catch (primaryExpandErr) {
                console.warn('[RAG] Query expansion gemini-3.5-flash gagal. Mencoba fallback ke gemini-3.1-flash-lite...', primaryExpandErr.message);
                const expansionModel = genAI.getGenerativeModel({
                    model: 'gemini-3.1-flash-lite',
                    generationConfig: { temperature: 0.1, maxOutputTokens: 150 },
                });
                expandResult = await expansionModel.generateContent({
                    contents: [{ role: 'user', parts: [{ text: expandPrompt }] }],
                    signal: abortController.signal,
                });
            }

            const rawText = expandResult.response.text().trim();
            const jsonMatch = rawText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                symptomKeywords = (parsed.gejala || []).map(s => s.trim()).filter(s => s.length >= 2);
                drugsMentioned = (parsed.obat_diminum || []).map(s => s.trim()).filter(s => s.length >= 2);
                expandedKeywords = (parsed.kata_kunci_medis || []).map(s => s.trim()).filter(s => s.length >= 2);
                llmExtractionOk = true;
                console.log('[RAG] Gejala terdeteksi:', symptomKeywords);
                if (drugsMentioned.length > 0) console.log('[RAG] Obat yang dikonsumsi:', drugsMentioned);
            }
        } catch (e) {
            console.warn('[RAG] Query Expansion gagal, menggunakan fallback lokal.');
        }

        // ── Local fallback: dictionary-based extraction when LLM is unavailable ──────
        if (!llmExtractionOk) {
            expandedKeywords = expandQuery(message).slice(0, 5);
            // Heuristic: detect drug names from routineMedicationsForSearch + message tokens
            const msgLower = message.toLowerCase();
            const DRUG_TRIGGER = ['mengonsumsi', 'minum', 'pakai', 'sedang minum', 'lagi minum', 'konsumsi'];
            if (DRUG_TRIGGER.some(t => msgLower.includes(t))) {
                // Extract candidate drug names: words after trigger keywords
                const tokens = msgLower.split(/[\s,]+/);
                const triggerIdx = tokens.findIndex(t => DRUG_TRIGGER.some(d => d.includes(t) || t.includes(d)));
                if (triggerIdx >= 0 && tokens[triggerIdx + 1]) {
                    drugsMentioned = [tokens[triggerIdx + 1]].filter(t => t.length >= 4);
                }
            }
            // Remaining keywords treated as symptoms
            symptomKeywords = expandedKeywords.filter(kw => !drugsMentioned.some(d => kw.toLowerCase().includes(d)));
        }

        // Guard: ensure we always have something to search
        if (symptomKeywords.length === 0 && drugsMentioned.length === 0 && expandedKeywords.length === 0) {
            symptomKeywords = [message];
        }

        // ── Step 2: RAG search — differential diagnosis from symptoms + drug side-effects ─
        let ragContextFormatted = '';
        try {
            // 2a. Multi-symptom differential diagnosis (preferred when symptoms detected)
            if (symptomKeywords.length > 0) {
                const diffCtx = await buildSymptomDifferentialContext(symptomKeywords);
                if (diffCtx) {
                    ragContextFormatted += diffCtx;
                } else {
                    // Fallback: single-keyword searches if multi-symptom returned nothing
                    for (const kw of [...new Set(symptomKeywords.slice(0, 2))]) {
                        if (ragContextFormatted.length > 1800) break;
                        const ctx = await buildChatbotContext('PENYAKIT', kw, null);
                        if (ctx) ragContextFormatted += ctx;
                    }
                }
            } else {
                // No explicit symptoms — search via expanded keywords
                for (const kw of [...new Set(expandedKeywords.slice(0, 2))]) {
                    if (ragContextFormatted.length > 1800) break;
                    const ctx = await buildChatbotContext('PENYAKIT', kw, null);
                    if (ctx) ragContextFormatted += ctx;
                }
            }

            // 2b. Fetch drug info for each drug user says they're taking (for side-effect check)
            if (drugsMentioned.length > 0) {
                let drugCtxParts = [];
                for (const drug of drugsMentioned.slice(0, 2)) {
                    const ctx = await buildChatbotContext('OBAT', drug, null);
                    if (ctx) drugCtxParts.push(ctx.trim());
                }
                if (drugCtxParts.length > 0) {
                    ragContextFormatted += `\n[INFORMASI OBAT YANG SEDANG DIKONSUMSI PASIEN]\n${drugCtxParts.join('\n')}\n`;
                    console.log(`[RAG] Drug side-effect context injected for: ${drugsMentioned.join(', ')}`);
                }
            }
        } catch (e) { console.error('[RAG] Error buildChatbotContext:', e.message); }

        const modelConfig = { temperature: 0.2 };
        const safetySettings = [
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' }
        ];

        let systemPrompt = `Kamu adalah "Asep", asisten kesehatan AI dari TemanPulih. Nada bicaramu ramah, empatik, santai tapi profesional. Gunakan bahasa Indonesia.

ATURAN KEAMANAN KLINIS (WAJIB):
0. BATASAN TOPIK KETAT (PENTING): Kamu adalah asisten virtual khusus kesehatan (TemanPulih) dan HANYA BISA menjawab topik seputar medis, kesehatan, penyakit, resep dokter, atau obat-obatan. Jika pengguna menanyakan hal lain di luar kesehatan (seperti menulis kode pemrograman/coding/bahasa C/Python/HTML/matematika/politik/dll.), kamu WAJIB menolak secara sangat sopan dan ingatkan pengguna bahwa kamu hanya bisa menjawab hal seputar medis dan kesehatan! DILARANG keras memberikan solusi coding atau non-medis.
1. MENJAWAB SESUAI KONTEKS & LARANGAN DIAGNOSIS PASTI: 
   - Jika user MENANYAKAN RESEP/OBAT/FUNGSI (atau pertanyaan umum kesehatan), jawablah langsung penjelasannya menggunakan pengetahuan medismu secara aman. JANGAN mendiagnosis penyakit jika user tidak mengeluhkan gejala apapun.
   - Jika user MENGELUHKAN GEJALA PENYAKIT, berikan edukasi kemungkinan kondisi secara SANGAT HATI-HATI. DILARANG KERAS memberikan diagnosis pasti. Selalu tegaskan bahwa kamu adalah AI. Gunakan frasa: "Sebagai asisten AI, saya tidak bisa mendiagnosis pasti, namun berdasarkan keluhanmu, beberapa kemungkinan kondisinya adalah..."
2. PRIORITAS REFERENSI & FALLBACK PENGETAHUAN: Kamu WAJIB memprioritaskan informasi penyakit dan obat yang tercantum di referensi [INFORMASI TAMBAHAN] (Chroma) terlebih dahulu. Jika informasi tentang obat atau penyakit yang ditanyakan tidak ditemukan dalam referensi atau referensi tersebut kosong, barulah kamu diperbolehkan menjawab dan menjelaskan menggunakan pengetahuan medis bawaanmu (Gemini) secara akurat, aman, dan edukatif. JANGAN mengarang obat keras baru di luar medis umum, dan JANGAN PERNAH menyebutkan dosis!
3. PROTOKOL KONTRAINDIKASI (PENTING): Cek [REKAM MEDIS]. Jika obat yang dibahas bertentangan dengan Alergi, Obat Rutin, atau Penyakit Terdahulu, BERI PERINGATAN KERAS dan larang konsumsi!
4. JANGAN ulangi keluhan user.
5. CEK EFEK SAMPING OBAT (KRITIS): Jika ada [INFORMASI OBAT YANG SEDANG DIKONSUMSI PASIEN], PERIKSA apakah gejala yang dilaporkan cocok dengan efek samping obat tersebut. Jika ya, sampaikan ini PERTAMA sebelum analisis lain.

FORMAT DAN GAYA PENULISAN CHAT (SANGAT PENTING):
- DILARANG menggunakan format markdown robotik/kaku seperti tanda pagar tiga kali (### 1.), list bersarang yang kompleks, atau cetak tebal ganda (**) secara berlebihan.
- Tulislah jawaban seperti pesan WhatsApp/chat dari dokter manusia sungguhan yang hangat, santai, dan rapi menggunakan penomoran normal (misalnya "1. Acyclovir 200mg:" atau "Pertama, Acyclovir...") dan pemisah baris baru biasa. 

STRUKTUR JAWABAN (FLEKSIBEL):
- Analisis empatik: Sesuaikan dengan pertanyaan. Jika user bertanya umum, jawablah dengan edukasi. Jika terkait keluhan, berikan disclaimer AI.
- Jika terkait keluhan/gejala: berikan kemungkinan kondisi (sangat hati-hati), perawatan non-farmakologi (alami), dan saran medis hanya jika relevan.
- Kapan harus ke dokter.`;

        const finalMessage = `${systemPrompt}\n\n${emrContext}\n${ragContextFormatted || '[TIDAK ADA REFERENSI]'}\n\nKELUHAN PASIEN:\n"${message}"`;

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const { genAI } = chatbotService;
        let result;
        let activeModelName = 'gemini-3.5-flash';
        try {
            console.log(`[AI] Menghasilkan respons dengan model utama: ${activeModelName}...`);
            const model = genAI.getGenerativeModel({ model: activeModelName, safetySettings, generationConfig: modelConfig });
            const chatSession = model.startChat({ history: chatHistoryFormat });
            result = await chatSession.sendMessageStream(finalMessage, { signal: abortController.signal });
        } catch (primaryChatErr) {
            activeModelName = 'gemini-3.1-flash-lite';
            console.warn(`[AI] Model utama gemini-3.5-flash gagal. Mencoba fallback ke model: ${activeModelName}...`, primaryChatErr.message);
            const model = genAI.getGenerativeModel({ model: activeModelName, safetySettings, generationConfig: modelConfig });
            const chatSession = model.startChat({ history: chatHistoryFormat });
            result = await chatSession.sendMessageStream(finalMessage, { signal: abortController.signal });
        }

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