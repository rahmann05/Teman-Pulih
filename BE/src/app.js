const express = require('express');
const cors = require('cors');
const path = require('path');
const apiRouter = require('./routes');
const { errorHandler } = require('./middleware/errorHandler');
const { initCleanupTasks } = require('./tasks/cleanup');
const { initReminderTasks } = require('./tasks/medicationReminderTask');

// Fix Chroma/Transformers cache permission error
process.env.XENOVA_CACHE_DIR = path.join(process.cwd(), '.cache');
process.env.TRANSFORMERS_CACHE = path.join(process.cwd(), '.cache');

// Initialize background tasks
initCleanupTasks();
initReminderTasks();

const app = express();

// ==========================================
// KONFIGURASI API GATEWAY (BFF / MID-TIER)
// ==========================================
// 1. CORS: Hanya izinkan Frontend yang spesifik (misal Localhost:5173 / Domain Vercel)
// Hal ini mencegah aplikasi lain atau direct browser mencuri jalur komunikasi.
const corsOptions = {
    origin: [/http:\/\/localhost:\d+$/, 'https://temanpulih.vercel.app'],
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-active-role'],
};
app.use(cors(corsOptions));
app.use(express.json());

// 2. ROUTING BERSENTRAL
// Frontend HANYA boleh memanggil endpoint di bawah ini.
// Gateway (Express) inilah yang akan meneruskan logic ke DB atau Service ML.
app.use('/api', apiRouter);

// Centralized error handler (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`API Gateway is running on port ${PORT}`);
});