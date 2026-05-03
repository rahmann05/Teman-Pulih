const db = require('../config/db');
const axios = require('axios');

const askChatbot = async (req, res) => {
    const { message } = req.body;
    if (!message) return res.status(400).json({ message: 'Pesan tidak boleh kosong' });

    try {
        // 1. Integrasi ML API (MedGemma)
        // const mlRes = await axios.post(`${process.env.ML_API_URL}/chat`, { message });
        // const responseText = mlRes.data.response;
        
        const responseText = `(Mock ML Response) Anda bertanya: "${message}". Sebaiknya minum obat sesuai anjuran resep dan istirahat yang cukup.`;

        // 2. Simpan Chat History ke DB
        const result = await db.query(
            `INSERT INTO chatbot_logs (user_id, message, response) 
             VALUES ($1, $2, $3) RETURNING *`,
            [req.user.id, message, responseText]
        );

        res.json({ data: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error berinteraksi dengan chatbot' });
    }
};

const getChatHistory = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM chatbot_logs WHERE user_id = $1 ORDER BY created_at ASC', [req.user.id]);
        res.json({ data: result.rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error mengambil riwayat chat' });
    }
}

module.exports = { askChatbot, getChatHistory };