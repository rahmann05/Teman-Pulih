const express = require('express');
const cors = require('cors');
const path = require('path');

// Fix Chroma/Transformers cache permission error
process.env.XENOVA_CACHE_DIR = path.join(process.cwd(), '.cache');
process.env.TRANSFORMERS_CACHE = path.join(process.cwd(), '.cache');

const authRoutes = require('./routes/authRoutes');
const chatbotRoutes = require('./routes/chatbotRoutes');
const medicationRoutes = require('./routes/medicationRoutes');
const ocrRoutes = require('./routes/ocrRoutes');
const profileRoutes = require('./routes/profileRoutes');
const relationRoutes = require('./routes/relationRoutes');
const emrRoutes = require('./routes/emrRoutes');
const profileController = require('./controllers/profileController');
const { requireAuth } = require('./middleware/authMiddleware');

const app = express();

// ==========================================
// KONFIGURASI API GATEWAY (BFF / MID-TIER)
// ==========================================
// 1. CORS: Hanya izinkan Frontend yang spesifik (misal Localhost:5173 / Domain Vercel)
// Hal ini mencegah aplikasi lain atau direct browser mencuri jalur komunikasi.
const corsOptions = {
    origin: [/http:\/\/localhost:\d+$/, 'https://temanpulih.vercel.app'], 
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-active-role']
};
app.use(cors(corsOptions));
app.use(express.json());

// 2. ROUTING BERSENTRAL
// Frontend HANYA boleh memanggil endpoint di bawah ini.
// Gateway (Express) inilah yang akan meneruskan logic ke DB atau Service ML.
app.use('/api/auth', authRoutes);                 // Gateway -> Supabase Auth & DB
app.use('/api/medications', medicationRoutes);    // Gateway -> Supabase DB
app.use('/api/chatbot', chatbotRoutes);           // Gateway -> Python ML Backend (Port 8000) & DB
app.use('/api/ocr', ocrRoutes);                   // Gateway -> ML Backend & Supabase Storage
app.use('/api/profile', profileRoutes);           // Gateway -> Supabase DB (Profile records)
app.use('/api/relations', relationRoutes);        // Gateway -> Caregiver request & approval
app.use('/api/emr', emrRoutes);                   // Gateway -> Document Parsing

// Khusus Family Routes (supaya strukturnya rapi sesuai dokumentasi)
app.post('/api/family/invite', requireAuth, profileController.inviteFamily);
app.get('/api/family/members', requireAuth, profileController.getFamilyMembers);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`API Gateway is running on port ${PORT}`);
});