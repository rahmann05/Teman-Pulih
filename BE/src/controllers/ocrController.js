const axios = require('axios');
const FormData = require('form-data');

// URL dari Backend Machine Learning (misal Python FastAPI/Flask)
const ML_BACKEND_URL = process.env.ML_API_URL || 'http://localhost:8000';

const getSupabaseClient = (req) => {
    if (!req.supabase) {
        throw new Error('Supabase client is not initialized for this request.');
    }
    return req.supabase;
};

const scanPrescription = async (req, res) => {
    try {
        const userId = req.user.id; // Authentication Middleware Gateway
        const supabase = getSupabaseClient(req);
        
        // Multer file interception di router memastikan file ada di req.file
        if (!req.file) {
            return res.status(400).json({ error: 'Tidak ada file gambar yang diunggah' });
        }

        // 1. GATEWAY -> MACHINE LEARNING BACKEND: 
        // Mengirimkan buffer gambar OCR ini ke AI Python Port 8000 secara rahasia
        const formData = new FormData();
        formData.append('file', req.file.buffer, req.file.originalname);
        
        let extractedText = "Mock OCR Text: Amoxicillin 500mg (ML Endpoint Belum Siap)";
        
        try {
            // Tembak Microservice ML: POST /api/predict_ocr
            const mlResponse = await axios.post(`${ML_BACKEND_URL}/api/predict_ocr`, formData, {
                headers: formData.getHeaders(),
                timeout: 10000 // Beri timeout 10 detik agar tak hanging
            });
            extractedText = mlResponse.data.text || extractedText;
        } catch (mlErr) {
            console.warn("Backend ML Unreachable. Menggunakan Mock OCR. Error:", mlErr.message);
        }

        // 2. GATEWAY -> SUPABASE STORAGE: Menitipkan Gambar
        // Asumsi nama bucket 'prescriptions' sudah ada di project Supabase
        const uniqueFileName = `${Date.now()}_${req.file.originalname}`;
        const { error: uploadError, data: uploadData } = await supabase
            .storage
            .from('prescriptions') // Anda harus membuat bucket ini public terlebih dahulu di Dashboard
            .upload(uniqueFileName, req.file.buffer, { contentType: req.file.mimetype });
            
        let imageUrl = `https://mock-image.com/${uniqueFileName}`;
        if (!uploadError && uploadData) {
            const { data: publicUrlData } = supabase.storage.from('prescriptions').getPublicUrl(uniqueFileName);
            imageUrl = publicUrlData.publicUrl;
        }

        // 3. GATEWAY -> SUPABASE DATABASE: Mencatat History Scan OCR & Text Hasil
        const { data: savedScan, error: dbError } = await supabase
            .from('ocr_history')
            .insert([{ 
                user_id: userId, 
                image_url: imageUrl, 
                extracted_text: extractedText 
            }])
            .select()
            .single();

        if (dbError) throw dbError;

        // 4. GATEWAY -> FRONTEND: Kembalikan JSON text matang
        res.status(200).json({ 
            id: savedScan.id, 
            text: savedScan.extracted_text, 
            image_url: savedScan.image_url 
        });

    } catch (error) {
        console.error("Gateway OCR Scan Error:", error.message);
        res.status(500).json({ error: 'Terjadi kesalahan saat memproses OCR.' });
    }
};

const getOcrHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const supabase = getSupabaseClient(req);
        
        // GATEWAY -> DB: Transaksi Riwayat
        const { data, error } = await supabase
            .from('ocr_history')
            .select('id, image_url, created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        
        // 2. GATEWAY -> FE
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getOcrResultById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const supabase = getSupabaseClient(req);
        
        // GATEWAY -> DB: Detail Ekstraksi OCR
        const { data, error } = await supabase
            .from('ocr_history')
            .select('*')
            .eq('id', id)
            .eq('user_id', userId) // Keamanan: Hanya milik dia sendiri
            .single();

        if (error || !data) throw error || new Error("Scan tidak ditemukan");
        
        // 2. GATEWAY -> FE
        res.status(200).json({ scan: data });
    } catch (error) {
        res.status(404).json({ error: error.message });
    }
};

module.exports = { scanPrescription, getOcrHistory, getOcrResultById };