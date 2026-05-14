const { GoogleGenerativeAI } = require('@google/generative-ai');
const { chromaClient } = require('../config/chroma.js');

// Inisialisasi Google Generative AI dengan API Key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'MISSING_API_KEY');

const getSupabaseClient = (req) => {
    if (!req.supabase) {
        throw new Error('Supabase client is not initialized for this request.');
    }
    return req.supabase;
};

const sendMessage = async (req, res) => {
    try {
        const userId = req.user.id;
        const { message } = req.body;
        const supabase = getSupabaseClient(req);

        if (!message) return res.status(400).json({ error: 'Message is required' });

        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({ error: 'GEMINI_API_KEY is missing in backend configuration.' });
        }

        // Riwayat percakapan tidak lagi diambil dari database atau dikirim ke AI.
        // Hal ini untuk memastikan penggunaan token API sangat hemat.

        // 3. Simpan pesan User saat ini ke Supabase (sebelum request API)
        console.log(`\n[CHAT] Request baru dari user ID: ${userId}`);
        await supabase
            .from('chat_history')
            .insert([{ user_id: userId, message, sender: 'user' }]);

        // Step 0: Fetch EMR Profile (Rekam Medis)
        let emrContext = "";
        let routineMedicationsForSearch = "";
        try {
            const { data: userProfile } = await supabase
                .from('profiles')
                .select('*')
                .eq('user_id', userId)
                .single();
            
            if (userProfile) {
                routineMedicationsForSearch = userProfile.routine_medications || "";
                emrContext = `[REKAM MEDIS PASIEN]
- Gol. Darah: ${userProfile.blood_type || '-'}
- Tensi Normal: ${userProfile.blood_pressure_range || '-'}
- Tinggi/Berat: ${userProfile.height || '-'}cm / ${userProfile.weight || '-'}kg
- Alergi: ${userProfile.allergies || '-'}
- Penyakit Kronis: ${userProfile.chronic_conditions || '-'}
- Penyakit Terdahulu: ${userProfile.past_illnesses || '-'}
- Penyakit Terakhir: ${userProfile.last_illness || '-'}
- Riwayat Operasi: ${userProfile.surgeries_history || '-'}
- OBAT RUTIN: ${routineMedicationsForSearch || '-'}
`;
            }
        } catch (e) {
            console.error("[RAG] Gagal mengambil EMR Profile:", e.message);
        }

        // Step 1: Keyword Extraction untuk pencarian RAG yang lebih akurat
        let searchKeywords = message;
        try {
            const extractionModel = genAI.getGenerativeModel({ 
                model: "gemini-flash-lite-latest", 
                generationConfig: { maxOutputTokens: 30, temperature: 0.1 }
            });
            const extractionResult = await extractionModel.generateContent(
                `Identifikasi semua gejala medis, nama penyakit, atau nama obat dalam pesan ini: "${message}". Balas HANYA dengan daftar kata kunci tersebut yang dipisahkan spasi (maksimal 5 kata).`
            );
            const extracted = extractionResult.response.text().trim();
            if (extracted) {
                searchKeywords = extracted;
            }
        } catch (e) {
            console.warn("Keyword Extraction skipped (Quota/Error). Using raw message.");
        }

        // Tambahkan obat rutin pasien ke dalam keyword pencarian agar Chroma mencari dokumen tentang obat tersebut (untuk cek kontraindikasi)
        const finalRAGQuery = `${searchKeywords} ${routineMedicationsForSearch}`.trim();
        console.log(`[RAG] Query ke ChromaDB: "${finalRAGQuery}"`);

        // RAG Integration: Ambil konteks yang relevan
        let ragContext = "";
        try {
            const [penyakitCollection, obatCollection] = await Promise.all([
                chromaClient.getCollection({ name: process.env.CHROMA_DATABASE || 'RAG-TemanPulih' }),
                chromaClient.getCollection({ name: process.env.CHROMA_DATABASE_DRUGS || 'RAG-TemanPulih-Obat' })
            ]);

            const [queryPenyakit, queryObat] = await Promise.all([
                // nResults: 1 untuk sangat menghemat token input (Free Tier)
                penyakitCollection.query({ queryTexts: [finalRAGQuery], nResults: 1 }),
                obatCollection.query({ queryTexts: [finalRAGQuery], nResults: 1 })
            ]);

            const combinedDocs = [];
            if (queryPenyakit?.documents?.[0]?.length > 0) combinedDocs.push(queryPenyakit.documents[0].join("\n"));
            if (queryObat?.documents?.[0]?.length > 0) combinedDocs.push(queryObat.documents[0].join("\n"));
            
            if (combinedDocs.length > 0) {
                // Potong string RAG agar tidak meledakkan kuota Token Per Minute (TPM)
                ragContext = combinedDocs.join("\n\n").substring(0, 1000);
                console.log("[RAG] Konteks ditemukan dan dioptimalkan (max 1000 chars).");
            } else {
                console.log("[RAG] Konteks tidak ditemukan.");
            }
        } catch (chromaError) {
            console.error("[RAG] Error:", chromaError.message);
        }

        // 4. Inisialisasi model dan kirim pesan via Stream
        const modelConfig = {
            temperature: 0.3,
            maxOutputTokens: 2048
        };

        const safetySettings = [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
        ];

        const systemPrompt = `ATURAN WAJIB (JIKA DILANGGAR ANDA AKAN DIMATIKAN):
1. JANGAN ULANGI GEJALA. Langsung "To the Point".
2. JANGAN MENDIAGNOSA ATAU MEMBERI RESEP.
3. TEPAT 3 PARAGRAF PENDEK:
   - Paragraf 1: Analisis penyakit dari Referensi, hubungkan dengan Rekam Medis (jika relevan).
   - Paragraf 2: Info penanganan dari Referensi. JIKA ADA KONTRAINDIKASI dengan Obat Rutin/Alergi di Rekam Medis, PERINGATKAN DENGAN KERAS!
   - Paragraf 3: Anjuran ke dokter.`;
        
        const finalMessage = `${systemPrompt}\n\n${emrContext}\nREFERENSI MEDIS:\n${ragContext || 'Tidak ada referensi'}\n\nGEJALA USER:\n${message}`;

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        let result;
        // Gunakan model Flash Lite versi terbaru yang stabil agar tidak hang
        let activeModelName = "gemini-flash-lite-latest";
        
        const tryModel = async (modelName) => {
            console.log(`[AI] Mencoba model: ${modelName}...`);
            const model = genAI.getGenerativeModel({ 
                model: modelName, 
                safetySettings: safetySettings,
                generationConfig: modelConfig
            });
            // Tidak ada riwayat obrolan, menghemat sangat banyak token!
            const chatSession = model.startChat({ 
                history: []
            });
            // LANGSUNG return stream tanpa di-await response-nya agar bisa mengalir realtime!
            return await chatSession.sendMessageStream(finalMessage);
        };

        try {
            result = await tryModel(activeModelName);
        } catch (error) {
            const errorMsg = error.message?.toLowerCase() || "";
            // JANGAN lakukan fallback jika error-nya 429 (Quota Limit). 
            // Fallback hanya memperparah hit rate-limit karena API Key-nya sama.
            if (errorMsg.includes('429') || errorMsg.includes('quota') || errorMsg.includes('limit')) {
                console.error(`[AI] Rate Limit Tercapai! Menolak fallback untuk mencegah spam API.`);
                throw new Error("RateLimit");
            }
            
            // Fallback HANYA untuk error server (503/500/404) di mana model utama sedang down
            if (errorMsg.includes('503') || errorMsg.includes('500') || errorMsg.includes('not found')) {
                console.warn(`Gemini ${activeModelName} failed. Trying fallback chain...`);
                
                try {
                    activeModelName = "gemini-3-flash";
                    result = await tryModel(activeModelName);
                } catch (err2) {
                    const err2Msg = err2.message?.toLowerCase() || "";
                    if (err2Msg.includes('429') || err2Msg.includes('quota')) throw new Error("RateLimit");
                    
                    console.warn("Gemini 3 Flash also failed. Trying 2.5 Flash...");
                    activeModelName = "gemini-2.5-flash";
                    result = await tryModel(activeModelName);
                }
            } else {
                throw error;
            }
        }

        console.log("[AI] Streaming dimulai...");
        let fullReply = "";
        let failureReason = "";
        try {
            for await (const chunk of result.stream) {
                const chunkText = chunk.text ? chunk.text() : "";
                if (chunkText) {
                    fullReply += chunkText;
                    process.stdout.write(chunkText); 
                    res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
                }
                
                // Cek alasan berhenti jika AI berhenti tiba-tiba
                if (chunk.candidates && chunk.candidates[0] && chunk.candidates[0].finishReason) {
                    const reason = chunk.candidates[0].finishReason;
                    if (reason !== 'STOP') {
                        failureReason = reason;
                        console.error(`\n[AI] STREAMING TERHENTI (Reason: ${reason})`);
                        throw new Error(`AI dihentikan paksa (${reason})`);
                    }
                }
            }
            console.log("\n[AI] Streaming selesai normal.");
            
            if (!fullReply.trim()) {
                throw new Error("AI memberikan respon kosong (Empty Response)");
            }
            
            await supabase
                .from('chat_history')
                .insert([{ user_id: userId, message: fullReply, sender: 'ai' }]);
            
            res.write('data: [DONE]\n\n');
        } catch (streamError) {
            console.error("\n[AI] Error saat streaming:", streamError.message);
            if (failureReason) console.error(`[AI] Detail kegagalan: ${failureReason}`);
            
            // Pesan ramah untuk user (tanpa teknis)
            const politeApology = 'Asep minta maaf, Asep lagi nggak bisa jawab sekarang. Tolong coba tanya lagi beberapa saat lagi ya.';
            res.write(`data: ${JSON.stringify({ error: politeApology })}\n\n`);
        }
        
        res.end();

    } catch (error) {
        console.error("Chatbot Error:", error.message);
        if (!res.writableEnded) {
            if (error.message === "RateLimit") {
                res.write(`data: ${JSON.stringify({ error: 'Asep minta maaf, kuota sistem Asep sedang penuh (terlalu banyak interaksi). Mohon tunggu sekitar 30 detik lalu coba lagi ya.' })}\n\n`);
            } else {
                // Kirim pesan error ramah sebagai chunk terakhir jika gagal total
                res.write(`data: ${JSON.stringify({ error: 'Asep minta maaf, Asep lagi nggak bisa diakses nih. Tolong coba lagi beberapa saat ya.' })}\n\n`);
            }
            res.end();
        }
    }
};

const getHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const supabase = getSupabaseClient(req);

        const { data, error } = await supabase
            .from('chat_history')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: true });

        if (error) throw error;

        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const clearHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const supabase = getSupabaseClient(req);

        const { error } = await supabase
            .from('chat_history')
            .delete()
            .eq('user_id', userId);

        if (error) throw error;

        res.status(200).json({ message: 'Riwayat chat berhasil dihapus' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { sendMessage, getHistory, clearHistory };