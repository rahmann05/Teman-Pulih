const sharp = require('sharp');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { supabase: serviceSupabase } = require('../config/db');

// ─── Gemini client ────────────────────────────────────────────────────────────
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Frekuensi yang dikenali oleh AddMedicationModal — nilai ini harus EXACT MATCH.
 * Gemini diperintahkan untuk menggunakan salah satu dari nilai ini.
 */
const VALID_FREQUENCIES = ['1x sehari', '2x sehari', '3x sehari', '4x sehari', 'Setiap 8 jam', 'Sesuai kebutuhan'];

/**
 * Buat prompt terstruktur untuk ekstraksi data resep.
 * Tidak ada data user yang dikirim ke Gemini — hanya instruksi + gambar.
 */
const buildOcrPrompt = () => `
Kamu adalah asisten medis ahli yang sangat mahir membaca tulisan tangan dokter (kursif, berantakan, atau singkatan latin). Tugasmu mengekstrak informasi dari gambar resep dokter yang diberikan dengan kemampuan terbaikmu.

Ekstrak setiap obat yang tercantum dalam resep dan kembalikan dalam format JSON berikut:
{
  "obat": [
    {
      "nama_obat": "Nama obat persis seperti di resep (gunakan pengetahuan medismu untuk menebak jika samar)",
      "dosis": "Dosis per konsumsi (cth: 500mg, 1 tablet)",
      "frekuensi": "Salah satu dari: 1x sehari | 2x sehari | 3x sehari | 4x sehari | Setiap 8 jam | Sesuai kebutuhan",
      "aturan_pakai": "Instruksi tambahan (cth: setelah makan, sebelum tidur)",
      "durasi": "Lama penggunaan (cth: 5 hari). Kosongkan jika tidak ada."
    }
  ],
  "catatan_dokter": "Catatan tambahan dokter jika ada",
  "teks_mentah": "Seluruh teks yang berhasil dibaca dari gambar resep"
}

ATURAN PENTING:
1. Jangan menambahkan obat yang tidak ada di resep, tapi GUNAKAN intuisi medismu untuk menyimpulkan tulisan yang berantakan (misal: "amox" -> "Amoxicillin").
2. Jika ada kata yang benar-benar tidak bisa dibaca sama sekali, tulis "[tidak terbaca]". Jangan menyerah! Ekstrak sebanyak yang kamu bisa.
3. Kembalikan HANYA JSON yang valid, tanpa teks penjelasan di luar JSON.
4. Jangan sertakan nama pasien, nama dokter, atau data pribadi apapun dalam output.
`.trim();

/**
 * Ekstrak teks dari gambar resep menggunakan Gemini Vision.
 * Gambar dikirim sebagai inline base64 — tidak disimpan di server Gemini.
 * @param {Buffer} imageBuffer - Raw image buffer
 * @returns {Promise<{ structured: object, rawText: string }>}
 */
const runGeminiOcr = async (imageBuffer, modelName = 'gemini-3.5-flash') => {
    const model = genAI.getGenerativeModel({ model: modelName });

    const imagePart = {
        inlineData: {
            data: imageBuffer.toString('base64'),
            mimeType: 'image/jpeg',
        },
    };

    const result = await model.generateContent([buildOcrPrompt(), imagePart]);
    const responseText = result.response.text().trim();

    // Bersihkan markdown code fence jika ada
    const cleaned = responseText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

    let parsed;
    try {
        parsed = JSON.parse(cleaned);
    } catch {
        // Jika Gemini tidak mengembalikan JSON valid, bungkus sebagai teks mentah
        parsed = { teks_mentah: responseText, obat: [] };
    }

    if (parsed.error) {
        throw Object.assign(new Error(parsed.error), { statusCode: 422 });
    }

    // Normalisasi frekuensi agar cocok dengan AddMedicationModal
    if (Array.isArray(parsed.obat)) {
        parsed.obat = parsed.obat.map(item => ({
            ...item,
            frekuensi: normalizeFrequency(item.frekuensi),
        }));
    }

    return {
        structured: parsed,
        rawText: parsed.teks_mentah || formatStructuredToText(parsed),
    };
};

/**
 * Normalisasi frekuensi ke salah satu nilai yang diterima AddMedicationModal.
 */
const normalizeFrequency = (freq) => {
    if (!freq) return '';
    const lower = freq.toLowerCase().trim();

    if (lower.includes('8 jam') || lower.includes('tiap 8') || lower.includes('setiap 8')) return 'Setiap 8 jam';
    if (lower.includes('4') && (lower.includes('kali') || lower.includes('x'))) return '4x sehari';
    if (lower.includes('3') && (lower.includes('kali') || lower.includes('x'))) return '3x sehari';
    if (lower.includes('2') && (lower.includes('kali') || lower.includes('x'))) return '2x sehari';
    if (lower.includes('1') && (lower.includes('kali') || lower.includes('x') || lower.includes('sekali'))) return '1x sehari';
    if (lower.includes('perlu') || lower.includes('prn') || lower.includes('bila') || lower.includes('jika')) return 'Sesuai kebutuhan';

    // Jika sudah exact match, kembalikan langsung
    if (VALID_FREQUENCIES.includes(freq)) return freq;

    return freq; // Biarkan user yang perbaiki jika tidak dikenali
};

/**
 * Format structured data menjadi teks yang mudah dibaca di ScanResultCard.
 */
const formatStructuredToText = (parsed) => {
    if (!parsed || !Array.isArray(parsed.obat) || parsed.obat.length === 0) {
        return parsed?.teks_mentah || 'Tidak ada teks yang berhasil diekstrak.';
    }

    const lines = parsed.obat.map((o, i) => {
        const parts = [`[Obat ${i + 1}] ${o.nama_obat || '–'}`];
        if (o.dosis) parts.push(`Dosis: ${o.dosis}`);
        if (o.frekuensi) parts.push(`Frekuensi: ${o.frekuensi}`);
        if (o.aturan_pakai) parts.push(`Aturan: ${o.aturan_pakai}`);
        if (o.durasi) parts.push(`Durasi: ${o.durasi}`);
        return parts.join('\n');
    });

    if (parsed.catatan_dokter) {
        lines.push(`\nCatatan Dokter: ${parsed.catatan_dokter}`);
    }

    return lines.join('\n\n');
};

// ─── Main scan function ───────────────────────────────────────────────────────

/**
 * Proses scan resep: kompres gambar → OCR Gemini → upload ke Supabase → simpan ke DB.
 * @param {string} userId - ID user (dari DB, bukan auth_id)
 * @param {object} userSupabase - Supabase client dengan token user (taat RLS)
 * @param {Buffer} fileBuffer - Raw image buffer dari multer
 * @param {string} originalname - Nama file asli
 * @returns {Promise<{ id, text, image_url, structured_data }>}
 */
const scanPrescription = async (userId, userSupabase, fileBuffer, originalname) => {
    // 1. Kompres gambar secara minimal untuk menjaga detail tulisan tangan (resolusi tinggi)
    const compressedBuffer = await sharp(fileBuffer)
        .resize(2400, null, { withoutEnlargement: true })
        .jpeg({ quality: 95 })
        .toBuffer();

    // 2. Jalankan OCR via Gemini dengan Fallback
    let structured = {};
    let extractedText = '';
    try {
        console.log('[OCR] Menjalankan model utama: gemini-3.5-flash...');
        const ocrResult = await runGeminiOcr(compressedBuffer, 'gemini-3.5-flash');
        structured = ocrResult.structured;
        extractedText = ocrResult.rawText;
    } catch (primaryErr) {
        console.warn('[OCR] Model utama gemini-3.5-flash gagal. Mencoba fallback ke gemini-3.1-flash-lite...', primaryErr.message);
        try {
            const ocrResult = await runGeminiOcr(compressedBuffer, 'gemini-3.1-flash-lite');
            structured = ocrResult.structured;
            extractedText = ocrResult.rawText;
        } catch (fallbackErr) {
            console.error('[OCR] Kedua model (flash & flash-lite) gagal. Detail error:', fallbackErr.message);
            
            // Cek jika error disebabkan oleh limit kuota, rate limit, traffic sibuk, atau server error
            const errMsg = `${primaryErr.message || ''} ${fallbackErr.message || ''}`.toLowerCase();
            const isQuotaOrTraffic = 
                errMsg.includes('429') || 
                errMsg.includes('quota') || 
                errMsg.includes('limit') || 
                errMsg.includes('exhausted') || 
                errMsg.includes('overloaded') || 
                errMsg.includes('503') || 
                errMsg.includes('busy') || 
                errMsg.includes('capacity');

            if (isQuotaOrTraffic) {
                extractedText = 'Layanan scan resep saat ini sedang tidak tersedia (kapasitas sibuk atau batas kuota terlampaui). Silakan coba lagi beberapa saat lagi atau masukkan obat secara manual.';
            } else {
                extractedText = 'Gagal membaca teks dari gambar. Silakan coba lagi dengan gambar yang lebih jelas atau masukkan secara manual.';
            }
            
            structured = { obat: [], teks_mentah: extractedText };
        }
    }

    // 3. Upload ke Supabase Storage dengan path: {userId}/{YYYY-MM-DD}/{timestamp}_scan.jpg
    const dateStr = new Date().toISOString().split('T')[0]; // "2026-05-27"
    const fileName = `${Date.now()}_scan.jpg`;
    const storagePath = `${userId}/${dateStr}/${fileName}`;

    let imageUrl = null;
    const uploadClient = serviceSupabase; // Service role untuk bypass RLS storage
    const { error: uploadError, data: uploadData } = await uploadClient
        .storage.from('prescriptions')
        .upload(storagePath, compressedBuffer, {
            contentType: 'image/jpeg',
            upsert: false,
        });

    if (!uploadError && uploadData) {
        const { data: publicUrlData } = uploadClient.storage
            .from('prescriptions')
            .getPublicUrl(storagePath);
        imageUrl = publicUrlData.publicUrl;
    } else if (uploadError) {
        console.error('[OCR] Supabase Storage Upload Error:', uploadError.message);
        // Lanjutkan meski upload gagal — OCR result tetap disimpan
    }

    // 4. Simpan hasil ke database via userSupabase (taat RLS)
    const { data: savedScan, error: dbError } = await userSupabase
        .from('ocr_history')
        .insert([{
            user_id: userId,
            image_url: imageUrl,
            extracted_text: extractedText,
            structured_data: structured,
            storage_path: storagePath,
        }])
        .select()
        .single();

    if (dbError) throw dbError;

    return {
        id: savedScan.id,
        text: savedScan.extracted_text,
        image_url: savedScan.image_url,
        structured_data: savedScan.structured_data,
    };
};

// ─── Query functions ──────────────────────────────────────────────────────────

const getHistory = async (supabase, userId) => {
    const { data, error } = await supabase
        .from('ocr_history')
        .select('id, image_url, created_at, structured_data')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
};

const getResultById = async (supabase, userId, id) => {
    const { data, error } = await supabase
        .from('ocr_history')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single();
    if (error || !data) throw error || Object.assign(new Error('Scan tidak ditemukan'), { statusCode: 404 });
    return data;
};

module.exports = { scanPrescription, getHistory, getResultById };
