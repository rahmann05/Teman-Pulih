const axios = require('axios');
const FormData = require('form-data');
const sharp = require('sharp');
const { supabase: serviceSupabase } = require('../config/db');

const ML_BACKEND_URL = process.env.ML_API_URL || 'http://localhost:8000';

const scanPrescription = async (userId, userSupabase, fileBuffer, originalname) => {
    const compressedBuffer = await sharp(fileBuffer)
        .resize(1200, null, { withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();

    const formData = new FormData();
    formData.append('file', compressedBuffer, originalname);

    let extractedText = 'Mock OCR Text: Amoxicillin 500mg (ML Endpoint Belum Siap)';
    try {
        const mlResponse = await axios.post(`${ML_BACKEND_URL}/api/predict_ocr`, formData, {
            headers: formData.getHeaders(),
            timeout: 15000,
        });
        extractedText = mlResponse.data.text || extractedText;
    } catch (mlErr) {
        console.warn('Backend ML Unreachable. Menggunakan Mock OCR. Error:', mlErr.message);
    }

    const uniqueFileName = `${Date.now()}_scan.jpg`;
    const { error: uploadError, data: uploadData } = await serviceSupabase
        .storage.from('prescriptions')
        .upload(uniqueFileName, compressedBuffer, { contentType: 'image/jpeg', upsert: true });

    let imageUrl = 'https://placehold.co/600x400/F3F0EC/C4653A?text=Scan+Prescription';
    if (!uploadError && uploadData) {
        const { data: publicUrlData } = serviceSupabase.storage.from('prescriptions').getPublicUrl(uniqueFileName);
        imageUrl = publicUrlData.publicUrl;
    } else if (uploadError) {
        console.error('Supabase Storage Upload Error:', uploadError.message);
    }

    const { data: savedScan, error: dbError } = await userSupabase
        .from('ocr_history')
        .insert([{ user_id: userId, image_url: imageUrl, extracted_text: extractedText }])
        .select().single();
    if (dbError) throw dbError;

    return { id: savedScan.id, text: savedScan.extracted_text, image_url: savedScan.image_url };
};

const getHistory = async (supabase, userId) => {
    const { data, error } = await supabase
        .from('ocr_history')
        .select('id, image_url, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
};

const getResultById = async (supabase, userId, id) => {
    const { data, error } = await supabase
        .from('ocr_history').select('*').eq('id', id).eq('user_id', userId).single();
    if (error || !data) throw error || Object.assign(new Error('Scan tidak ditemukan'), { statusCode: 404 });
    return data;
};

module.exports = { scanPrescription, getHistory, getResultById };
