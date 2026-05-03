const db = require('../config/db');
const axios = require('axios');

const processOcr = async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'Silakan unggah foto resep' });

    try {
        // 1. Simpan path/URL gambar
        const imageUrl = `/uploads/${req.file.filename}`;
        
        // 2. Kirim ke ML API (FastAPI) untuk diproses OCR
        // (Mock Integrasi)
        // const form = new FormData();
        // form.append('file', req.file.buffer, req.file.originalname);
        // const mlRes = await axios.post(`${process.env.ML_API_URL}/predict-ocr`, form);
        // const { raw_text, processed_text } = mlRes.data;
        
        const raw_text = "MOCK_OCR_RAW: Parasetamol 3x1"; // Mock response
        const processed_text = "Paracetamol 500mg, 3 kali sehari setelah makan."; // Mock response

        // 3. Simpan ke Database
        const result = await db.query(
            `INSERT INTO ocr_logs (patient_id, image_url, raw_ocr_text, processed_text) 
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [req.user.id, imageUrl, raw_text, processed_text]
        );

        res.json({ message: 'OCR berhasil diproses', data: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error memproses gambar OCR' });
    }
};

const getOcrLogs = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM ocr_logs WHERE patient_id = $1 ORDER BY created_at DESC', [req.user.id]);
        res.json({ data: result.rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error mengambil riwayat OCR' });
    }
}

module.exports = { processOcr, getOcrLogs };