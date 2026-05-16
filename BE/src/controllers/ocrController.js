const axios = require('axios');
const FormData = require('form-data');
const sharp = require('sharp');
const { supabase: serviceSupabase } = require('../config/db');

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
        const userId = req.user.id;
        const userSupabase = getSupabaseClient(req);
        
        if (!req.file) {
            return res.status(400).json({ error: 'Tidak ada file gambar yang diunggah' });
        }

        // 0. COMPRESSION: Kompres gambar agar di bawah 500KB (sesuai limit bucket)
        // Kita resize ke lebar maksimal 1200px (cukup untuk OCR) dan kualitas 80%
        const compressedBuffer = await sharp(req.file.buffer)
            .resize(1200, null, { withoutEnlargement: true })
            .jpeg({ quality: 80 })
            .toBuffer();

        // 1. GATEWAY -> MACHINE LEARNING BACKEND
        const formData = new FormData();
        formData.append('file', compressedBuffer, req.file.originalname);
        
        let extractedText = "Mock OCR Text: Amoxicillin 500mg (ML Endpoint Belum Siap)";
        
        try {
            const mlResponse = await axios.post(`${ML_BACKEND_URL}/api/predict_ocr`, formData, {
                headers: formData.getHeaders(),
                timeout: 15000 
            });
            extractedText = mlResponse.data.text || extractedText;
        } catch (mlErr) {
            console.warn("Backend ML Unreachable. Menggunakan Mock OCR. Error:", mlErr.message);
        }

        // 2. GATEWAY -> SUPABASE STORAGE
        const uniqueFileName = `${Date.now()}_scan.jpg`;
        const { error: uploadError, data: uploadData } = await serviceSupabase
            .storage
            .from('prescriptions')
            .upload(uniqueFileName, compressedBuffer, { 
                contentType: 'image/jpeg',
                upsert: true
            });
            
        let imageUrl = `https://placehold.co/600x400/F3F0EC/C4653A?text=Scan+Prescription`; 
        if (!uploadError && uploadData) {
            const { data: publicUrlData } = serviceSupabase.storage.from('prescriptions').getPublicUrl(uniqueFileName);
            imageUrl = publicUrlData.publicUrl;
        } else if (uploadError) {
            console.error("Supabase Storage Upload Error:", uploadError.message);
        }

        // 3. GATEWAY -> SUPABASE DATABASE
        const { data: savedScan, error: dbError } = await userSupabase
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