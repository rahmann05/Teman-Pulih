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

        // 1. Ambil 10 pesan terakhir untuk memberikan context percakapan ke Gemini
        const { data: historyData, error: historyError } = await supabase
            .from('chat_history')
            .select('message, sender')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(10);

        if (historyError) throw historyError;

        // Balik urutannya menjadi kronologis (terlama ke terbaru)
        historyData.reverse();

        // 2. Format history untuk Gemini (role: 'user' & 'model')
        // Gemini API mewajibkan urutan yang selang-seling (user -> model -> user -> model)
        // Kita harus memastikan tidak ada role berturut-turut yang sama.
        let sanitizedHistory = [];
        let expectedRole = 'user';

        for (const msg of historyData) {
            const role = msg.sender === 'ai' ? 'model' : 'user';
            if (role === expectedRole) {
                sanitizedHistory.push({ role, parts: [{ text: msg.message }] });
                expectedRole = role === 'user' ? 'model' : 'user';
            }
        }

        // Gemini history tidak boleh diakhiri dengan 'user' sebelum kita memanggil sendMessage (yang otomatis adalah 'user')
        if (sanitizedHistory.length > 0 && sanitizedHistory[sanitizedHistory.length - 1].role === 'user') {
            sanitizedHistory.pop();
        }

        // 3. Simpan pesan User saat ini ke Supabase (sebelum request API)
        await supabase
            .from('chat_history')
            .insert([{ user_id: userId, message, sender: 'user' }]);

        // RAG Integration: Ambil konteks yang relevan dari ChromaDB
        let ragContext = "";
        try {
            // Pengambilan data Info Penyakit
            const penyakitCollection = await chromaClient.getCollection({ name: process.env.CHROMA_DATABASE || 'RAG-TemanPulih' });
            const queryPenyakit = await penyakitCollection.query({
                queryTexts: [message],
                nResults: 2 // Ambil 2 chunk dokumen teratas untuk penyakit
            });

            // Pengambilan data Info Obat
            const obatCollection = await chromaClient.getCollection({ name: process.env.CHROMA_DATABASE_DRUGS || 'RAG-TemanPulih-Obat' });
            const queryObat = await obatCollection.query({
                queryTexts: [message],
                nResults: 2 // Ambil 2 chunk dokumen teratas untuk informasi obat
            });

            const combinedDocs = [];
            if (queryPenyakit && queryPenyakit.documents && queryPenyakit.documents.length > 0) {
                combinedDocs.push("--- INFO PENYAKIT ---\n" + queryPenyakit.documents[0].join("\n\n"));
            }
            if (queryObat && queryObat.documents && queryObat.documents.length > 0) {
                combinedDocs.push("--- INFO OBAT ---\n" + queryObat.documents[0].join("\n\n"));
            }
            
            if (combinedDocs.length > 0) {
                ragContext = combinedDocs.join("\n\n");
            }
        } catch (chromaError) {
            console.error("ChromaDB Query Error:", chromaError.message);
            // Tetap lanjutkan meskipun ChromaDB error (fallback ke Gemini murni)
        }

        // 4. Inisialisasi model dan kirim pesan
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const chatSession = model.startChat({
            history: sanitizedHistory,
        });

        // Modifikasi Prompt untuk menyertakan RAG Context
        let systemPrompt = `Anda adalah asisten medis digital bernama Teman Pulih Chatbot. Anda membantu pasien pasca-rawat inap. Berikan jawaban yang empatik, profesional, mudah dipahami, dan berbahasa Indonesia. Jangan mendiagnosis secara medis secara pasti. `;
        
        let promptWithContext = `Pertanyaan Pengguna: "${message}"\n\n`;
        
        if (ragContext) {
            promptWithContext += `\nReferensi Informasi Medis (gunakan sebagai panduan primer jika relevan dengan pertanyaan):\n"""\n${ragContext}\n"""\n\nJawablah pertanyaan tersebut berdasarkan referensi medis di atas jika sesuai. Jika referensi tidak cukup menjawab, gunakan pengetahuan Anda dengan tetap mengedepankan keamanan pasien.`;
        }

        let finalMessage = message;
        if (historyData.length === 0) {
            finalMessage = `${systemPrompt}\n\n${promptWithContext}`;
        } else {
            // Jika sudah ada riwayat, tambahkan sedikit reminder konteks jika ada RAG data
            if (ragContext) {
                 finalMessage = `Konteks Medis Ekstra (gunakan jika relevan):\n${ragContext}\n\nPertanyaan: ${message}`;
            } else {
                 finalMessage = message;
            }
        }

        const result = await chatSession.sendMessage(finalMessage);
        const aiReply = result.response.text() || "Maaf, saya tidak dapat memproses permintaan Anda saat ini.";

        // 5. Simpan balasan AI ke Supabase
        const { data: savedReply, error: dbError } = await supabase
            .from('chat_history')
            .insert([{ user_id: userId, message: aiReply, sender: 'ai' }])
            .select()
            .single();

        if (dbError) throw dbError;

        // 6. Kembalikan hasil akhir ke Frontend
        res.status(200).json({ reply: savedReply });

    } catch (error) {
        console.error("Gemini API Error:", error.message);
        res.status(500).json({ error: 'Terjadi kesalahan saat memproses permintaan Chatbot AI.' });
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