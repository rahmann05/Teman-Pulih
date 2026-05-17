const multer = require('multer');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (
            file.mimetype === 'application/pdf' ||
            file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            file.mimetype === 'application/msword'
        ) {
            cb(null, true);
        } else {
            cb(new Error('Format file tidak didukung. Harap unggah PDF atau Word (DOCX).'), false);
        }
    },
}).single('document');

const extractMedicalData = (text) => {
    const data = {
        blood_type: '', height: '', weight: '', blood_pressure_range: '',
        allergies: '', chronic_conditions: '', past_illnesses: '',
        last_illness: '', surgeries_history: '', routine_medications: '',
    };

    const bloodTypeMatch = text.match(/(?:^|\n)\s*(?:golongan darah|blood type|gol darah|gol\.?\s*darah)[\s:]*([ABO]{1,2}(?:\s*[+-])?)/i);
    if (bloodTypeMatch) data.blood_type = bloodTypeMatch[1].replace(/[^ABO]/g, '').toUpperCase();

    const heightMatch = text.match(/(?:^|\n)\s*(?:tinggi|tinggi badan|height|tb)[\s:]*(\d{2,3})(?:\s*cm)?/i);
    if (heightMatch) data.height = heightMatch[1];

    const weightMatch = text.match(/(?:^|\n)\s*(?:berat|berat badan|weight|bb)[\s:]*(\d{2,3})(?:\s*kg)?/i);
    if (weightMatch) data.weight = weightMatch[1];

    const bpMatch = text.match(/(?:^|\n)\s*(?:tekanan darah|tensi|blood pressure|bp)[\s:]*(\d{2,3})\s*[/|]\s*(\d{2,3})/i);
    if (bpMatch) {
        const systolic = parseInt(bpMatch[1]);
        const diastolic = parseInt(bpMatch[2]);
        if (systolic < 90) data.blood_pressure_range = 'Rendah (<90/60)';
        else if (systolic > 140 || diastolic > 90) data.blood_pressure_range = 'Tinggi (>140/90)';
        else data.blood_pressure_range = 'Normal (120/80)';
    }

    const cleanMatch = (match, maxLength = 60) => {
        if (!match) return null;
        let extracted = match[1].trim().replace(/\s{2,}/g, ' ');
        const lower = extracted.toLowerCase();
        if (lower.includes('tidak ada') || lower === 'none' || extracted === '-' || lower.includes('disangkal')) return null;
        return extracted.length > maxLength ? extracted.substring(0, maxLength) + '...' : extracted;
    };

    const allergyMatch = text.match(/(?:^|\n)\s*(?:alergi|allergy|allergies|riwayat alergi)[\s:]+([a-zA-Z0-9\s,-]{1,50})(?:[.\n]|$)/i);
    const cleanedAllergy = cleanMatch(allergyMatch, 50);
    if (cleanedAllergy) data.allergies = cleanedAllergy;

    const chronicMatch = text.match(/(?:^|\n)\s*(?:penyakit kronis|kondisi kronis|chronic|penyerta|komorbid|riwayat penyakit)[\s:]+([a-zA-Z0-9\s,-]{1,60})(?:[.\n]|$)/i);
    const cleanedChronic = cleanMatch(chronicMatch, 60);
    if (cleanedChronic) data.chronic_conditions = cleanedChronic;

    const surgeryMatch = text.match(/(?:^|\n)\s*(?:operasi|bedah|surgery|tindakan bedah|riwayat operasi)[\s:]+([a-zA-Z0-9\s,-]{1,60})(?:[.\n]|$)/i);
    const cleanedSurgery = cleanMatch(surgeryMatch, 60);
    if (cleanedSurgery) data.surgeries_history = cleanedSurgery;

    const medsMatch = text.match(/(?:^|\n)\s*(?:obat rutin|terapi|resep|medications|pengobatan|obat saat ini)[\s:]+([a-zA-Z0-9\s,-]{1,80})(?:[.\n]|$)/i);
    const cleanedMeds = cleanMatch(medsMatch, 80);
    if (cleanedMeds) data.routine_medications = cleanedMeds;

    return data;
};

const parseDocument = async (fileBuffer, mimetype) => {
    let rawText = '';
    if (mimetype === 'application/pdf') {
        const pdfData = await pdfParse(fileBuffer);
        rawText = pdfData.text;
    } else if (mimetype.includes('word')) {
        const wordData = await mammoth.extractRawText({ buffer: fileBuffer });
        rawText = wordData.value;
    }

    if (!rawText || rawText.trim() === '') {
        throw Object.assign(
            new Error('Dokumen kosong atau teks tidak dapat dibaca (mungkin berisi gambar pindaian).'),
            { statusCode: 400 }
        );
    }

    return extractMedicalData(rawText);
};

module.exports = { upload, parseDocument };
