const { supabase } = require('../config/db');
const axios = require('axios');

// URL dari Backend Machine Learning (misal Python FastAPI/Flask)
const ML_BACKEND_URL = process.env.ML_API_URL || 'http://localhost:8000';

const sendMessage = async (req, res) => {
    try {
        const userId = req.user.id; // Didapat dari authMiddleware
        const { message } = req.body;

        if (!message) return res.status(400).json({ error: 'Message is required' });

        // 1. GATEWAY -> DATABASE: Simpan pesan User ke Supabase
        await supabase
            .from('chat_history')
            .insert([{ user_id: userId, message, sender: 'user' }]);

        // 2. GATEWAY -> BE (ML): Teruskan pesan ke Machine Learning Model
        // (Asumsi ML Backend memiliki endpoint POST /api/predict_chat)
        const mlResponse = await axios.post(`${ML_BACKEND_URL}/api/predict_chat`, {
            prompt: message
        });
        
        const aiReply = mlResponse.data.reply || "Maaf, MedGemma sedang tidak bisa merespon saat ini.";

        // 3. GATEWAY -> DATABASE: Simpan balasan AI ke Supabase
        const { data: savedReply, error: dbError } = await supabase
            .from('chat_history')
            .insert([{ user_id: userId, message: aiReply, sender: 'ai' }])
            .select()
            .single();

        if (dbError) throw dbError;

        // 4. GATEWAY -> FE: Kembalikan hasil akhir ke Frontend
        res.status(200).json({ reply: savedReply });

    } catch (error) {
        console.error("Gateway ML Error:", error.message);
        res.status(500).json({ error: 'Terjadi kesalahan saat menghubungi layanan MedGemma.' });
    }
};

const getHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // GATEWAY -> DATABASE: Ambil Riwayat Chat
        const { data, error } = await supabase
            .from('chat_history')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: true });

        if (error) throw error;
        
        // GATEWAY -> FE: Kirim Riwayat
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { sendMessage, getHistory };