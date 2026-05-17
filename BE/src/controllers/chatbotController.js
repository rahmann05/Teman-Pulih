const { GoogleGenerativeAI } = require('@google/generative-ai');
const { chromaClient } = require('../config/chroma.js');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'MISSING_API_KEY');

const getSupabaseClient = (req) => {
    if (!req.supabase) throw new Error('Supabase client is not initialized.');
    return req.supabase;
};

const sanitizeInput = (text) => text ? text.replace(/\s+/g, ' ').trim().substring(0, 700) : "";

// Normalisasi Riwayat Percakapan (Pencegah Error 400 Alternating Role)
const normalizeHistory = (pastChats) => {
    const validHistory = [];
    let expectedRole = 'user';

    for (const chat of pastChats) {
        const role = chat.sender === 'user' ? 'user' : 'model';
        if (role === expectedRole && chat.message.trim()) {
            validHistory.push({ role, parts: [{ text: chat.message }] });
            expectedRole = role === 'user' ? 'model' : 'user';
        }
    }
    if (validHistory.length > 0 && validHistory[validHistory.length - 1].role === 'user') {
        validHistory.pop();
    }
    return validHistory;
};

const sendMessage = async (req, res) => {
    let fullReply = "";
    const userId = req.user.id;
    const supabase = getSupabaseClient(req);

    // 1. Setup Abort Controller untuk mencegah kebocoran resource jika user disconnect
    const abortController = new AbortController();
    const onClientDisconnect = () => {
        console.log(`[SYSTEM] Client (User ID: ${userId}) disconnected. Aborting API request...`);
        abortController.abort();
    };
    req.on('close', onClientDisconnect);

    try {
        const rawMessage = req.body.message;
        if (!rawMessage) return res.status(400).json({ error: 'Message is required' });
        const message = sanitizeInput(rawMessage);

        console.log(`\n[CHAT] Request dari user ID: ${userId} | Pesan: "${message}"`);

        // Simpan pesan user (Fire and Forget)
        supabase.from('chat_history').insert([{ user_id: userId, message, sender: 'user' }]).then();

        // EKSEKUSI PARALEL: Memangkas latensi drastis
        const [emrDataResult, historyResult, gatekeeperTopic] = await Promise.all([
            supabase.from('profiles').select('*').eq('user_id', userId).single(),
            supabase.from('chat_history').select('message, sender').eq('user_id', userId).order('created_at', { ascending: false }).limit(6),
            (async () => {
                try {
                    // Update model gatekeeper ke versi terbaru (2.5-flash-lite)
                    const gatekeeperModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite", generationConfig: { temperature: 0.0, maxOutputTokens: 10 } });
                    const gatekeeperPrompt = `Klasifikasikan pesan di dalam tag <pesan>.
Kategori:
1. MEDIS: Penyakit, gejala, obat.
2. SAPAAN: "halo", "pagi", "terima kasih".
3. LUAR_MEDIS: Di luar ranah kesehatan.

<pesan>${message}</pesan>
Balas HANYA 1 kata (MEDIS, SAPAAN, atau LUAR_MEDIS).`;
                    const gateResult = await gatekeeperModel.generateContent({ contents: [{ role: 'user', parts: [{ text: gatekeeperPrompt }] }], signal: abortController.signal });
                    const text = gateResult.response.text().trim().toUpperCase();
                    if (text.includes("LUAR_MEDIS")) return "LUAR_MEDIS";
                    if (text.includes("SAPAAN")) return "SAPAAN";
                    return "MEDIS";
                } catch (e) {
                    return "MEDIS";
                }
            })()
        ]);

        // JIKA BUKAN TOPIK MEDIS (Gatekeeper Bypass)
        if (gatekeeperTopic === "LUAR_MEDIS" || gatekeeperTopic === "SAPAAN") {
            let fastReply = "";
            if (gatekeeperTopic === "LUAR_MEDIS") {
                fastReply = "Maaf ya, kenalkan saya Asep, asisten kesehatan virtual dari TemanPulih. Asep cuma difokuskan untuk ngebahas soal medis, konsultasi penyakit, atau obat-obatan nih. Kalau ada keluhan kesehatan, boleh langsung cerita ke Asep, ya!";
            } else {
                fastReply = "Halo! Kenalkan, saya Asep, asisten kesehatan virtual dari TemanPulih. Ada keluhan kesehatan yang sedang dirasakan hari ini?";
            }

            console.log("[AI] Fast-reply sent (Bypass RAG).");
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');

            res.write(`data: ${JSON.stringify({ text: fastReply })}\n\n`);
            res.write('data: [DONE]\n\n');

            fullReply = fastReply; // Disimpan di blok finally
            return;
        }

        // PARSING HASIL PARALEL
        let emrContext = "";
        let allergies = "";
        let routineMedications = "";

        if (emrDataResult.data) {
            const userProfile = emrDataResult.data;
            allergies = userProfile.allergies || "";
            routineMedications = userProfile.routine_medications || "";
            emrContext = `[REKAM MEDIS PASIEN]
- Alergi: ${allergies || 'Tidak ada'}
- Obat Rutin: ${routineMedications || 'Tidak ada'}
- Penyakit Kronis/Bawaan: ${userProfile.chronic_conditions || '-'}
- Kondisi Tensi/Fisik: ${userProfile.blood_pressure_range || '-'}, ${userProfile.weight || '-'}kg`;
        }

        let chatHistoryFormat = [];
        if (historyResult.data && historyResult.data.length > 0) {
            chatHistoryFormat = normalizeHistory(historyResult.data.reverse());
        }

        // FASE 2: QUERY EXPANSION
        let searchTerms = [message];
        try {
            console.log("[RAG] Memperluas query...");
            // Update model query expansion ke versi terbaru (2.5-flash-lite)
            const expansionModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite", generationConfig: { temperature: 0.1 } });
            const expandPrompt = `Ekstrak maksimal 3 kata kunci medis/gejala utama dari pesan ini: "${message}". Pisahkan dengan koma. (Contoh: dispepsia, mual). Jika tidak jelas, kosongkan.`;

            const expandResult = await expansionModel.generateContent({ contents: [{ role: 'user', parts: [{ text: expandPrompt }] }], signal: abortController.signal });
            const expandedKeywords = expandResult.response.text().split(',').map(s => s.trim()).filter(s => s);
            if (expandedKeywords.length > 0) {
                searchTerms = [message, ...expandedKeywords];
                console.log(`[RAG] Query Medis:`, searchTerms);
            }
        } catch (e) {
            console.warn("[RAG] Query Expansion gagal, menggunakan input asli.");
        }

        // FASE 3: MULTI-FACETED RETRIEVAL (ChromaDB)
        let ragContextFormatted = "";
        try {
            const [penyakitCol, obatCol] = await Promise.all([
                chromaClient.getCollection({ name: process.env.CHROMA_DATABASE || 'RAG-TemanPulih' }),
                chromaClient.getCollection({ name: process.env.CHROMA_DATABASE_DRUGS || 'RAG-TemanPulih-Obat' })
            ]);

            const obatQueries = [...searchTerms];
            if (routineMedications && routineMedications.length > 2) obatQueries.push(routineMedications);
            if (allergies && allergies.length > 2) obatQueries.push(allergies);

            // Menggunakan Promise.allSettled agar jika salah satu DB gagal, DB lain tetap menyuplai data referensi
            const [hasilPenyakit, hasilObat] = await Promise.allSettled([
                penyakitCol.query({ queryTexts: searchTerms, nResults: 2 }),
                obatCol.query({ queryTexts: obatQueries, nResults: 3 })
            ]);

            const extractDocs = (promiseResult) => {
                // Hanya ambil dokumen dari promise yang 'fulfilled' (berhasil)
                if (promiseResult.status !== 'fulfilled' || !promiseResult.value || !promiseResult.value.documents) return [];
                return [...new Set(promiseResult.value.documents.flat().filter(d => d))];
            };

            const docsPenyakit = extractDocs(hasilPenyakit).slice(0, 2);
            const docsObat = extractDocs(hasilObat).slice(0, 3);

            if (docsPenyakit.length > 0) ragContextFormatted += `=== REFERENSI KONDISI MEDIS ===\n${docsPenyakit.join("\n---\n")}\n\n`;
            if (docsObat.length > 0) ragContextFormatted += `=== REFERENSI OBAT & INTERAKSI ===\n${docsObat.join("\n---\n")}\n\n`;

            if (ragContextFormatted) {
                console.log(`[RAG] Referensi paralel berhasil: ${docsPenyakit.length} Penyakit, ${docsObat.length} Obat.`);
            }
        } catch (e) {
            console.error("[RAG] Error ChromaDB Initialization:", e.message);
        }

        // FASE 4: LLM GENERATION & STREAMING
        const modelConfig = { temperature: 0.2, maxOutputTokens: 2048 };
        const safetySettings = [{ category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }];

        let systemPrompt = `Kamu adalah "Asep", asisten kesehatan AI dari TemanPulih. Nada bicaramu ramah, empatik, santai tapi profesional. Gunakan bahasa Indonesia.

ATURAN KEAMANAN KLINIS (WAJIB):
1. NO DIAGNOSIS PASTI: Gunakan frasa "Kemungkinan ini adalah..."
2. ATURAN OBAT KETAT: Kamu HANYA BOLEH menyarankan obat bebas (OTC) yang TERCANTUM di [REFERENSI OBAT]. Jangan mengarang obat! 
3. PROTOKOL KONTRAINDIKASI (PENTING): Cek [REKAM MEDIS]. Jika obat saranmu bertentangan dengan Alergi atau Obat Rutin, BERI PERINGATAN KERAS dan larang konsumsi!
4. JANGAN ulangi keluhan user.

STRUKTUR JAWABAN:
- Analisis awal yang empatik.
- Saran perawatan (Non-farmakologi).
- Saran Obat (Farmakologi) BERDASARKAN REFERENSI (Sertakan peringatan jika ada kontraindikasi dengan EMR).
- Kapan harus ke dokter.`;

        if (!ragContextFormatted) {
            systemPrompt += `\n\n[SISTEM DARURAT]: TIDAK ADA referensi. DILARANG menyarankan nama obat medis (kimia). Berikan saran perawatan mandiri non-obat saja dan arahkan ke dokter.`;
        }

        const finalMessage = `${systemPrompt}\n\n${emrContext}\n${ragContextFormatted || '[TIDAK ADA REFERENSI]'}\n\nKELUHAN PASIEN:\n"${message}"`;

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // Update model AI Utama ke versi terbaru yang didukung (2.5-flash)
        const activeModelName = "gemini-2.5-flash";
        console.log(`[AI] Menghasilkan respons dengan model: ${activeModelName}...`);

        const model = genAI.getGenerativeModel({ model: activeModelName, safetySettings, generationConfig: modelConfig });
        const chatSession = model.startChat({ history: chatHistoryFormat });
        const result = await chatSession.sendMessageStream(finalMessage, { signal: abortController.signal });

        // Mengembalikan Loop Streaming yang hilang
        for await (const chunk of result.stream) {
            if (abortController.signal.aborted) break; // Berhenti jika user putus
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
            console.warn("\n[SYSTEM] Request dihentikan: koneksi client terputus.");
            return;
        }

        console.error("\n[SYSTEM] Chatbot Error:", error.message);
        if (!res.writableEnded) {
            const errorMsg = error.message === "RateLimit" ?
                'Asep minta maaf, sistem lagi sibuk banget nih. Tunggu sebentar lalu coba lagi ya.' :
                'Asep minta maaf, jaringan ke otak Asep lagi terputus. Coba tanya lagi nanti ya.';
            res.write(`data: ${JSON.stringify({ error: errorMsg })}\n\ndata: [DONE]\n\n`);
        }
    } finally {
        req.removeListener('close', onClientDisconnect); // Cleanup listener

        if (fullReply && fullReply.trim().length > 0) {
            try {
                await supabase.from('chat_history').insert([{ user_id: userId, message: fullReply.trim(), sender: 'ai' }]);
            } catch (dbError) {
                console.error("[DB] Gagal menyimpan histori:", dbError.message);
            }
        }
        if (!res.writableEnded) res.end();
    }
};

const getHistory = async (req, res) => {
    try {
        const { data, error } = await getSupabaseClient(req).from('chat_history').select('*').eq('user_id', req.user.id).order('created_at', { ascending: true });
        if (error) throw error;
        res.status(200).json(data);
    } catch (error) { res.status(500).json({ error: error.message }); }
};

const clearHistory = async (req, res) => {
    try {
        const { error } = await getSupabaseClient(req).from('chat_history').delete().eq('user_id', req.user.id);
        if (error) throw error;
        res.status(200).json({ message: 'Riwayat chat berhasil dihapus' });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

module.exports = { sendMessage, getHistory, clearHistory };