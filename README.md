# Teman Pulih — Pendamping Pemulihan Pasca-Rawat Inap

> Aplikasi web untuk mendampingi pasien pasca-rawat inap dalam mengelola pengobatan, memahami penyakit, dan terhubung dengan keluarga/caregiver secara real-time.

---

## Daftar Isi

- [Gambaran Umum](#gambaran-umum)
- [Arsitektur Sistem](#arsitektur-sistem)
- [Tech Stack](#tech-stack)
- [Struktur Proyek](#struktur-proyek)
- [Fitur & Flow Aplikasi](#fitur--flow-aplikasi)
- [Database Schema](#database-schema)
- [Panduan Replikasi (Setup dari Nol)](#panduan-replikasi-setup-dari-nol)
- [Menjalankan Aplikasi (Development)](#menjalankan-aplikasi-development)
- [Deployment](#deployment)
- [Environment Variables](#environment-variables)

---

## Gambaran Umum

**Teman Pulih** adalah aplikasi web berbasis **BFF (Backend For Frontend)** yang membantu:

- **Pasien** mengelola jadwal obat, scan resep dokter, chatbot medis AI, tes kepatuhan, dan check-in harian.
- **Caregiver** memantau kondisi pasien, menerima notifikasi darurat, dan berkomunikasi langsung.

Aplikasi ini menerapkan arsitektur **multi-role** di mana satu akun bisa login sebagai `patient` atau `caregiver` dengan tampilan/dashboard yang berbeda.

---

## Arsitektur Sistem

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React + Vite)                     │
│  Port: 5173  |  Deploy: Vercel                                      │
│  Semua request API → VITE_API_URL (Express Backend)                 │
│  Google OAuth → Supabase Auth (langsung dari browser)               │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ HTTP (Axios + JWT Bearer)
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     BACKEND / API GATEWAY (Express.js)               │
│  Port: 3000  |  Deploy: Railway                                      │
│  CORS: localhost:* + temanpulih.vercel.app                           │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐              │
│  │   Auth       │  │  Medication  │  │   Chatbot     │              │
│  │   Module     │  │   Module     │  │   Module      │              │
│  └──────┬───────┘  └──────┬───────┘  └───────┬───────┘              │
│         │                 │                  │                        │
│  ┌──────┴───────┐  ┌──────┴───────┐  ┌───────┴───────┐              │
│  │  OCR/Scan    │  │  Family Sync │  │  Compliance   │              │
│  │  Module      │  │  Module      │  │  Module       │              │
│  └──────┬───────┘  └──────┬───────┘  └───────┬───────┘              │
│         │                 │                  │                        │
│  ┌──────┴───────┐  ┌──────┴───────┐  ┌───────┴───────┐              │
│  │  Illness     │  │ Notification │  │  Profile/EMR  │              │
│  │  Module      │  │  Module      │  │  Module       │              │
│  └──────────────┘  └──────────────┘  └───────────────┘              │
└────────┬────────────────┬──────────────────┬────────────────────────┘
         │                │                  │
         ▼                ▼                  ▼
┌────────────────┐ ┌──────────────┐ ┌────────────────────┐
│ Supabase       │ │ ChromaDB     │ │ External Services  │
│ (PostgreSQL +  │ │ (Vector DB   │ │ - Gemini AI API    │
│  Auth + RLS +  │ │  RAG Obat &  │ │ - Twilio WhatsApp  │
│  Storage)      │ │  Penyakit)   │ │ - Resend Email     │
└────────────────┘ └──────────────┘ │ - HuggingFace ML   │
                                    │ - Redis (Upstash)   │
                                    └────────────────────┘
```

### Flow Autentikasi

```
1. User Register/Login → Express Backend → Supabase Auth (signUp/signIn)
2. Supabase mengembalikan access_token (JWT)
3. Backend menyimpan user ke tabel public.users (via trigger/manual)
4. Frontend menyimpan token di localStorage
5. Setiap request API → Axios interceptor menambahkan Authorization: Bearer <token>
6. Backend middleware (requireAuth) → verifikasi token via Supabase Auth → resolve user dari DB
7. Header x-active-role menentukan apakah user bertindak sebagai patient atau caregiver
```

### Flow OAuth (Google Login)

```
1. Frontend memanggil supabase.auth.signInWithOAuth({ provider: 'google' })
2. Redirect ke Google → kembali ke /auth/callback
3. AuthCallback.jsx mengambil access_token dari URL hash
4. POST /api/auth/oauth-login { access_token, role }
5. Backend verifikasi token → upsert user/profile/role → return JWT + user data
```

---

## Tech Stack

### Frontend

| Teknologi | Fungsi |
|-----------|--------|
| **React 19** | UI Library |
| **Vite 8** | Build Tool & Dev Server |
| **React Router DOM 7** | Client-side Routing |
| **Framer Motion** | Page Transitions & Animations |
| **Axios** | HTTP Client ke Backend API |
| **Lucide React & React Icons** | Icon Library |
| **React Easy Crop** | Image Cropping (Scan Resep) |
| **Supabase JS** | Google OAuth (frontend-direct) |
| **Plus Jakarta Sans & Inter** | Typography (Google Fonts) |

### Backend

| Teknologi | Fungsi |
|-----------|--------|
| **Express.js 5** | API Gateway / BFF |
| **Supabase JS** | Database Client + Auth + Storage |
| **pg (node-postgres)** | Direct PostgreSQL Pool (bypass RLS) |
| **@google/generative-ai** | Gemini AI API (Chatbot, OCR, RAG) |
| **ChromaDB** | Vector Database (RAG Obat & Penyakit) |
| **ioredis** | Redis Cache (Upstash) |
| **jsonwebtoken** | JWT Token Verification |
| **bcrypt** | Password Hashing |
| **multer** | File Upload (OCR, Medication Image) |
| **sharp** | Image Processing & Compression |
| **node-cron** | Scheduled Tasks (Medication Reminders) |
| **Resend** | Email Notifications |
| **Twilio** | WhatsApp Notifications |
| **Axios** | HTTP Client (ke HuggingFace ML API) |
| **mammoth & pdf-parse** | EMR Document Parsing (Word/PDF) |

### Infrastructure

| Service | Fungsi |
|---------|--------|
| **Supabase** | PostgreSQL Database + Auth + Storage + RLS |
| **ChromaDB Cloud** | Hosted Vector Database (RAG knowledge base) |
| **Upstash Redis** | Managed Redis Cache |
| **Vercel** | Frontend Deployment |
| **Railway** | Backend Deployment |
| **HuggingFace Spaces** | ML Model API (Compliance Prediction) |

---

## Struktur Proyek

```
Teman-Pulih/
├── BE/                              # Backend (Express.js API Gateway)
│   ├── src/
│   │   ├── app.js                   # Entry point Express server
│   │   ├── config/
│   │   │   ├── db.js                # Supabase + PostgreSQL Pool config
│   │   │   ├── redis.js             # Redis (Upstash) config
│   │   │   └── chroma.js            # ChromaDB Cloud config
│   │   ├── middleware/
│   │   │   ├── authMiddleware.js     # JWT verification + role resolution
│   │   │   └── errorHandler.js      # Centralized error handler
│   │   ├── routes/                   # Express route definitions
│   │   │   ├── index.js             # Route aggregator
│   │   │   ├── authRoutes.js        # /api/auth/*
│   │   │   ├── medicationRoutes.js  # /api/medications/*
│   │   │   ├── chatbotRoutes.js     # /api/chatbot/*
│   │   │   ├── ocrRoutes.js         # /api/ocr/*
│   │   │   ├── profileRoutes.js     # /api/profile/*
│   │   │   ├── familyRoutes.js      # /api/family/*
│   │   │   ├── chatRoutes.js        # /api/chat/*
│   │   │   ├── illnessRoutes.js     # /api/illness/*
│   │   │   ├── complianceRoutes.js  # /api/compliance/*
│   │   │   ├── notificationRoutes.js# /api/notifications/*
│   │   │   ├── relationRoutes.js    # /api/relations/*
│   │   │   └── emrRoutes.js         # /api/emr/*
│   │   ├── controllers/             # Request handlers
│   │   ├── services/                # Business logic layer
│   │   │   ├── authService.js       # Register, Login, OAuth, Refresh
│   │   │   ├── medicationService.js # CRUD Obat, Mark Taken, Image Upload
│   │   │   ├── chatbotService.js    # Gemini Chat, EMR Context Builder
│   │   │   ├── ragService.js        # RAG Search (Drug & Disease)
│   │   │   ├── ocrService.js        # Gemini Vision OCR Pipeline
│   │   │   ├── familyService.js     # Family Invite, Complaints, Checkins
│   │   │   ├── complianceService.js # HuggingFace ML Prediction + Scoring
│   │   │   ├── illnessService.js    # Illness CRUD + ChromaDB Search
│   │   │   ├── notificationService.js # Email (Resend) + WhatsApp (Twilio)
│   │   │   ├── interventionEngine.js  # Compliance → Intervention Modes
│   │   │   ├── patientContextService.js # EMR Profile Enrichment
│   │   │   ├── profileService.js    # Profile CRUD
│   │   │   ├── chatService.js       # Direct Chat between users
│   │   │   └── relationService.js   # Access Request/Approval
│   │   ├── helpers/                 # Utility functions
│   │   │   ├── chromaHelper.js      # ChromaDB collection/query helpers
│   │   │   ├── ragUtils.js          # Text parsing, normalization
│   │   │   ├── cache.js             # Redis cache get/set/del
│   │   │   ├── patientAccess.js     # Caregiver→Patient access resolver
│   │   │   ├── phone.js             # Phone number normalization
│   │   │   ├── supabase.js          # Supabase helpers
│   │   │   └── validation.js        # Email regex
│   │   └── tasks/                   # Background scheduled tasks
│   │       ├── medicationReminderTask.js  # Cron: per-menit medication reminders
│   │       └── cleanup.js           # Cron: data cleanup tasks
│   ├── database/
│   │   ├── schema.sql               # Full database schema (DDL + RLS)
│   │   └── seed.sql                 # Initial seed data
│   ├── .env                         # Backend environment variables
│   └── package.json
│
├── FE/                              # Frontend (React + Vite)
│   ├── src/
│   │   ├── main.jsx                 # React entry point
│   │   ├── app/
│   │   │   └── App.jsx              # Router, ProtectedRoute, AnimatedRoutes
│   │   ├── features/                # Feature-based modules
│   │   │   ├── auth/                # Login, Register, OAuth Callback
│   │   │   ├── dashboard/           # PatientDashboard, CaregiverDashboard
│   │   │   ├── medications/         # MedicationList, Detail, Caregiver views
│   │   │   ├── scan/                # ScanPage, ScanCrop, ScanResult
│   │   │   ├── chatbot/             # AI Chatbot Page
│   │   │   ├── profile/             # EMR Profile Page
│   │   │   ├── family-sync/         # Family Sync Management
│   │   │   ├── chat/                # Direct Chat Page
│   │   │   ├── notifications/       # Notifications Page
│   │   │   ├── compliance/          # Compliance Assessment & Result
│   │   │   ├── pelajari/            # Educational Content Page
│   │   │   └── landing/             # Landing Page
│   │   ├── shared/                  # Shared utilities
│   │   │   ├── components/          # Reusable UI components
│   │   │   ├── context/             # AuthContext + AuthProvider
│   │   │   ├── hooks/               # useAuth hook
│   │   │   ├── services/            # api.js (Axios instance)
│   │   │   ├── config/              # supabaseClient.js
│   │   │   ├── layouts/             # Layout components
│   │   │   └── utils/               # Utility functions
│   │   ├── styles/                  # Global CSS
│   │   └── assets/                  # Static assets
│   ├── .env                         # Frontend environment variables
│   ├── .env.example                 # Template for env variables
│   ├── vite.config.js               # Vite config + path aliases
│   └── package.json
│
└── README.md                        # ← File ini
```

---

## Fitur & Flow Aplikasi

### 1. Autentikasi (Auth)

**Endpoints**: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/oauth-login`, `POST /api/auth/refresh`, `POST /api/auth/logout`, `GET /api/auth/me`

**Flow:**
1. User memilih **Register** atau **Login** pada halaman auth.
2. Bisa login dengan **email/password** atau **nomor telepon/password**, serta **Google OAuth**.
3. Saat register, user memberikan nama, email, nomor telepon, dan password.
4. Login mengembalikan JWT token + data user + role aktif.
5. User memilih role saat login: `patient` atau `caregiver`.
6. Setiap login/logout, chat history dihapus otomatis untuk keamanan.
7. Token kedaluwarsa → frontend otomatis melakukan silent refresh atau redirect ke login.

---

### 2. Manajemen Obat (Medications)

**Endpoints**: `GET/POST /api/medications`, `PATCH/DELETE /api/medications/:id`, `POST /api/medications/:id/taken`, `GET /api/medications/logs`, `POST /api/medications/:id/image`, `GET /api/medications/search-chroma`

**Flow:**
1. Pasien menambah obat secara manual atau dari hasil scan resep.
2. Saat menambah obat, backend otomatis mencari **informasi medis (medicinal_insight)** dari ChromaDB RAG.
3. Jadwal obat dibuat dengan time_slots (mis: `["08:00", "13:00", "19:00"]`), start_date, dan end_date.
4. Pasien menekan tombol **"Sudah Diminum"** untuk mencatat log (`taken/missed/skipped`).
5. Saat obat ditandai `taken`, **caregiver** otomatis menerima notifikasi (in-app + WhatsApp/Email).
6. Gambar obat bisa di-upload, dikonversi ke WebP oleh **sharp**, dan disimpan di Supabase Storage.
7. **Caregiver** bisa melihat daftar obat pasien yang terhubung.

**Medicinal Insight (RAG):**
- Saat obat ditambahkan, sistem melakukan pencarian otomatis ke ChromaDB collection `RAG-TemanPulih-Obat`.
- Strategi pencarian: Gemini prediction → Fuzzy match → Vector search → Ingredient scan → Gemini synthesis.
- Hasil insight mencakup: kategori, indikasi, komposisi, dosis, aturan pakai, efek samping, peringatan.

---

### 3. Scan Resep Dokter (OCR)

**Endpoints**: `POST /api/ocr/scan`, `GET /api/ocr/history`, `GET /api/ocr/result/:id`

**Flow:**
1. Pasien mengambil foto resep dari kamera atau galeri.
2. Gambar bisa di-**crop** pada halaman `ScanCropPage`.
3. Gambar dikirim ke backend (multipart/form-data via multer).
4. Backend **mengompresi** gambar dengan **sharp** (resolusi 2400px, JPEG quality 95).
5. Gambar dikirim ke **Gemini Vision** (`gemini-3.5-flash`) dengan prompt terstruktur untuk ekstraksi data resep.
6. Jika model utama gagal, **fallback** ke `gemini-3.1-flash-lite`.
7. Gemini mengembalikan JSON terstruktur: `{ obat: [{ nama_obat, dosis, frekuensi, aturan_pakai, durasi }], catatan_dokter, teks_mentah }`.
8. Frekuensi dinormalisasi ke format AddMedicationModal (`1x sehari`, `2x sehari`, dll).
9. Gambar di-upload ke **Supabase Storage** bucket `prescriptions`.
10. Hasil disimpan ke tabel `ocr_history` dan ditampilkan di `ScanResultPage`.
11. Dari hasil scan, pasien bisa langsung **menambahkan obat** ke daftar medication.

---

### 4. Chatbot AI Medis (Asep)

**Endpoints**: `POST /api/chatbot/message`, `GET /api/chatbot/history`, `DELETE /api/chatbot/history`

**Flow:**
1. Pasien/Caregiver membuka halaman chatbot.
2. Pesan dikirim ke backend → **klasifikasi topik** oleh Gemini (OBAT/PENYAKIT/GEJALA/UMUM).
3. Berdasarkan klasifikasi:
   - **OBAT**: RAG search di ChromaDB collection `RAG-TemanPulih-Obat` + cek alergi pasien.
   - **PENYAKIT**: RAG search di ChromaDB collection `RAG-TemanPulih` (penyakit).
   - **GEJALA**: Multi-symptom differential diagnosis search + scoring.
4. **Konteks EMR pasien** disuntikkan ke prompt (rekam medis, alergi, penyakit aktif, obat rutin, check-in terbaru).
5. **Konteks private** (daftar obat yang sedang dikonsumsi) juga disertakan.
6. Gemini menghasilkan respons medis yang **dipersonalisasi** berdasarkan profil pasien.
7. Riwayat chat disimpan di database dan dihapus otomatis saat login/logout.
8. Caregiver mendapatkan konteks pasien yang terhubung dengannya.

**RAG Pipeline:**
```
User Message → Gemini Classifier → Keyword Extraction
     ↓
ChromaDB Search (Metadata → Fuzzy → Vector → Ingredient)
     ↓
EMR Context Builder (Profile + Medications + Illness + Checkins)
     ↓
Gemini LLM (System Prompt + RAG Context + EMR Context + Chat History)
     ↓
AI Response → Save to DB → Return to User
```

---

### 5. Sinkronisasi Keluarga (Family Sync)

**Endpoints**: `POST /api/family/invite`, `GET /api/family/members`, `POST /api/family/complaints`, `GET /api/family/complaints`, `POST /api/family/checkins`, `GET /api/family/checkins`, `GET /api/family/checkins/today`

**Flow Undangan Keluarga:**
1. Pasien atau Caregiver mengirim undangan via **email** atau **nomor telepon**.
2. Backend mengecek apakah user terdaftar → generate **kode verifikasi 6-digit**.
3. Kode dikirim via **Email** (Resend API, HTML template premium) atau **WhatsApp** (Twilio Content Template OTP).
   - Catatan deliverability: jika pengirim email belum **verifikasi domain** (Resend) atau memakai SMTP gratis (Gmail), OTP berpotensi masuk **spam**.
4. Penerima memasukkan kode verifikasi di halaman Family Sync.
5. Relasi `family_relations` diubah dari `pending` → `accepted`.
6. Undangan pending otomatis **kedaluwarsa setelah 10 menit**.

**Flow Keluhan Medis:**
1. Pasien mengirim keluhan medis (gejala, severity: mild/moderate/severe, catatan).
2. Semua **caregiver terhubung** menerima notifikasi:
   - In-app notification.
   - WhatsApp alert (dengan konteks EMR pasien: alergi, penyakit kronis).
   - Email HTML notifikasi darurat.

**Flow Check-in Harian:**
1. Pasien mengisi rating kondisi (1-5), gejala yang dirasakan, dan catatan.
2. Satu check-in per hari (upsert by `patient_id + checkin_date`).
3. Data check-in digunakan sebagai konteks chatbot dan dashboard caregiver.

---

### 6. Tes Kepatuhan Minum Obat (Compliance Assessment)

**Endpoints**: `GET /api/compliance/eligibility`, `POST /api/compliance/assess`, `GET /api/compliance/history`, `GET /api/compliance/latest`

**Flow:**
1. Pasien mengecek **eligibility** (cooldown 1 minggu sejak tes terakhir).
2. Pasien mengisi kuesioner dengan **50 pertanyaan** (demografis + behaviour + perception + adherence).
3. Data demografis (gender, age) otomatis di-**prefill** dari profil.
4. Jawaban dikirim ke **HuggingFace Spaces** ML API (`https://acous-adherence.hf.space/predict`).
5. ML model mengembalikan 3 prediksi multi-task:
   - `adherence_class`: 0 (Low) / 1 (High)
   - `behaviour_class`: 0 (Negatif) / 1 (Positif)
   - `perception_class`: 0 (Negatif) / 1 (Netral) / 2 (Positif)
6. Hasil disimpan ke tabel `compliance_assessments`.
7. **Intervention Engine** menerjemahkan kombinasi 3 kelas ke:
   - `activeModes`: mode perilaku UI (INTENSIVE_REMINDER, MANDATORY_CHECKIN, dll).
   - `actions`: tindakan konkret yang diaktifkan.
   - `chatbotContext`: konteks yang disuntikkan ke prompt chatbot.
8. Jika **Low Adherence** (class 0), caregiver otomatis menerima notifikasi peringatan (WhatsApp + Email).
9. **Global Score** dihitung secara blended:
   - 50% Real Adherence (medication logs vs expected)
   - 30% AI Adherence Score
   - 10% Behaviour Score
   - 10% Perception Score

---

### 7. Riwayat Penyakit (Illness History)

**Endpoints**: `GET /api/illness/search`, `GET /api/illness`, `POST /api/illness`, `PATCH /api/illness/:id/recover`

**Flow:**
1. Pasien mencari penyakit dengan **autocomplete** berbasis ChromaDB + Gemini prediction.
2. Strategi pencarian: Gemini prediction → Fuzzy match → Vector search → Gemini synthesis.
3. Saat menambahkan penyakit, `illness_info` otomatis diambil dari ChromaDB (gejala, penanganan, obat terkait, peringatan).
4. Obat terkait di-cross-reference dari collection `RAG-TemanPulih-Obat`.
5. Penyakit ditandai aktif (`is_active: true`) dan bisa ditandai **sembuh** (`recovered_at`).
6. Penyakit aktif digunakan sebagai konteks chatbot.

---

### 8. Notifikasi & Pengingat Obat

**Flow Pengingat Otomatis (Cron Job — setiap menit):**
1. Backend menjalankan cron job setiap menit mengecek semua jadwal obat aktif.
2. Berdasarkan **tingkat kepatuhan** pasien, frekuensi notifikasi berbeda:
   - **Baik** (≥75%): Pengingat 10 menit sebelum + tepat waktu + terlambat 15 menit.
   - **Menengah** (50-75%): + 5 menit sebelum + terlambat per jam.
   - **Mengkhawatirkan** (<50%): + 15 menit sebelum + terlambat setiap 15 menit.
3. Setiap notifikasi dikirim sebagai:
   - **In-app notification** (tabel `notifications`).
   - **WhatsApp** (Twilio Content Template).
   - **Email** (Resend API).
4. Jika pasien **terlambat**, caregiver juga dinotifikasi.
5. Notifikasi tidak dikirim ulang jika sudah ada untuk hari & slot yang sama.
6. Notifikasi late tidak dikirim jika obat sudah ditandai `taken`.

---

### 9. Profil & Rekam Medis (EMR)

**Endpoints**: `GET/PATCH /api/profile`, `POST /api/emr/parse`

**Flow:**
1. Pasien mengisi data profil: data pribadi, golongan darah, tekanan darah, tinggi/berat badan.
2. Data rekam medis: alergi, penyakit kronis, riwayat penyakit, riwayat operasi, obat rutin.
3. **EMR Document Upload**: Pasien bisa upload dokumen PDF/Word, di-parse oleh `mammoth`/`pdf-parse` dan Gemini untuk mengekstrak data medis.
4. Data EMR digunakan sebagai konteks oleh chatbot, compliance assessment, dan illness search.

---

### 10. Direct Chat

**Endpoints**: `GET /api/chat/:otherUserId`, `POST /api/chat`

**Flow:**
1. Pasien dan Caregiver bisa berkirim pesan langsung.
2. Pesan disimpan di database (tabel via Supabase).
3. **Supabase Realtime** digunakan untuk mendeteksi pesan baru secara real-time.

---

### 11. Dashboard

- **Patient Dashboard**: Ringkasan obat, jadwal hari ini, check-in harian, penyakit aktif, skor kepatuhan.
- **Caregiver Dashboard**: Daftar pasien terhubung, status obat pasien, keluhan medis, check-in pasien.

---

### 12. Halaman Pelajari

Halaman edukasi publik (tanpa login) berisi informasi kesehatan umum.

---

## Database Schema

Tabel utama di Supabase PostgreSQL:

| Tabel | Fungsi |
|-------|--------|
| `users` | Data user (auth_id, name, email) |
| `roles` | Definisi role (patient, caregiver) |
| `user_roles` | Junction table multi-role |
| `profiles` | Rekam medis/EMR lengkap |
| `medications` | Daftar obat + medicinal_insight (JSONB) |
| `medication_schedules` | Jadwal obat (frequency, time_slots, start/end date) |
| `medication_logs` | Log minum obat (taken/missed/skipped) |
| `ocr_history` | Riwayat scan resep + structured_data (JSONB) |
| `chat_history` | Riwayat percakapan chatbot AI |
| `family_relations` | Hubungan patient↔caregiver (pending/accepted) |
| `illness_history` | Riwayat penyakit + illness_info (JSONB dari ChromaDB) |
| `daily_checkins` | Check-in kondisi harian (1-5 rating) |
| `medical_complaints` | Keluhan medis darurat |
| `compliance_assessments` | Hasil tes kepatuhan AI (adherence/behaviour/perception) |
| `notifications` | Notifikasi in-app |
| `reminder_preferences` | Preferensi pengingat WhatsApp |

Semua tabel dilengkapi **Row Level Security (RLS)** sehingga user hanya bisa mengakses data miliknya sendiri. Caregiver yang `accepted` bisa melihat data pasien terkait.

---

## Panduan Replikasi (Setup dari Nol)

### Prasyarat

- **Node.js** v18+ (direkomendasikan v20+)
- **npm** v9+
- **Git**
- **Akun Supabase** (gratis) — [supabase.com](https://supabase.com)
- *Opsional*: Akun Gemini API, ChromaDB Cloud, Twilio, Resend, Upstash Redis

---

### Langkah 1: Clone Repository

```bash
git clone https://github.com/rahmann05/Teman-Pulih.git
cd Teman-Pulih
```

---

### Langkah 2: Setup Supabase

1. Buat project baru di [Supabase Dashboard](https://app.supabase.com).

2. Buka **SQL Editor** dan jalankan seluruh isi file `BE/database/schema.sql`:
   - File ini membuat semua tabel, indeks, trigger, dan RLS policies.

3. Jalankan `BE/database/seed.sql` untuk data awal (roles):
   ```sql
   INSERT INTO public.roles (name, description) VALUES
     ('admin', 'Administrator'),
     ('patient', 'Pasien'),
     ('caregiver', 'Pendamping/Keluarga');
   ```

4. Buat **Storage Buckets**:
   - `prescriptions` (public) — untuk gambar hasil scan resep.
   - `medication-images` (public) — untuk gambar obat.

5. Aktifkan **Google OAuth** (opsional):
   - Buka **Authentication → Providers → Google**.
   - Masukkan Google OAuth Client ID dan Secret.
   - Set Redirect URL: `https://<your-supabase-ref>.supabase.co/auth/v1/callback`.

6. Catat informasi berikut dari **Project Settings → API**:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (opsional, untuk bypass RLS)
   - `DATABASE_URL` (Connection Pooling URL)

---

### Langkah 3: Setup Backend

```bash
cd BE
npm install
```

Buat file `.env` di folder `BE/` berdasarkan template berikut:

```env
# Server
PORT=3000

# Supabase
SUPABASE_URL=https://your-ref.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # opsional

# Database (Supabase Connection Pooling)
DATABASE_URL=postgresql://postgres.your-ref:your-password@aws-xxx.pooler.supabase.com:6543/postgres?pgbouncer=true

# Gemini AI
GEMINI_API_KEY=your_gemini_api_key

# ChromaDB Cloud (opsional — untuk fitur RAG)
CHROMA_HOST=api.trychroma.com
CHROMA_API_KEY=your_chroma_api_key
CHROMA_TENANT=your_tenant_id
CHROMA_DATABASE=RAG-TemanPulih

# Redis Cache (opsional — app tetap berjalan tanpa Redis)
REDIS_URL=rediss://default:your_password@your-host.upstash.io:6379

# Resend Email (opsional — fallback ke mock log)
RESEND_API_KEY=re_your_resend_api_key

# Twilio WhatsApp (opsional — fallback ke mock log)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+14155238886
```

> **Catatan**: Jika tidak mengonfigurasi ChromaDB/Redis/Twilio/Resend, aplikasi tetap berfungsi. Fitur RAG akan di-fallback ke Gemini synthesis, cache dinonaktifkan, dan notifikasi menggunakan mock log ke terminal.

---

### Langkah 4: Setup Frontend

```bash
cd FE
npm install
```

Buat file `.env` di folder `FE/` berdasarkan template (lihat `.env.example`):

```env
# API Gateway URL
VITE_API_URL=http://localhost:3000/api

# App Configuration
VITE_APP_NAME=Teman Pulih
VITE_APP_VERSION=1.0.0

# API Timeout
VITE_API_TIMEOUT=15000

# Feature Flags
VITE_ENABLE_DEBUG=false

# Authentication
VITE_TOKEN_STORAGE_KEY=token

# Supabase (untuk Google OAuth langsung dari browser)
VITE_SUPABASE_URL=https://your-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

### Langkah 5: Setup ChromaDB (Opsional — untuk RAG)

Jika ingin mengaktifkan fitur RAG (pencarian obat & penyakit), Anda perlu:

1. Buat akun di [ChromaDB Cloud](https://www.trychroma.com/).
2. Buat 2 collection:
   - `RAG-TemanPulih` — berisi data penyakit/kondisi medis.
   - `RAG-TemanPulih-Obat` — berisi data obat/farmasi.
3. Ingest data ke collection menggunakan metadata berikut:
   - **Obat**: `nama_obat`, `kategori`, `source_id`, `chunk_index`.
   - **Penyakit**: `disease_name`, `has_drugs`, `chunk_index`.
4. Data format per-chunk berisi informasi terstruktur tentang indikasi, dosis, efek samping, dll.

---

### Langkah 6: Setup HuggingFace Space (Opsional — untuk Compliance)

Fitur Tes Kepatuhan membutuhkan ML model yang di-deploy di HuggingFace Spaces:

1. Deploy model ke HuggingFace Space dengan endpoint `/predict`.
2. Model menerima JSON body berisi 50 field (demografis + kuesioner).
3. Model mengembalikan: `{ adherence, behaviour, perception, adherence_score }`.
4. URL default: `https://acous-adherence.hf.space/predict`.

---

## Menjalankan Aplikasi (Development)

### Terminal 1 — Backend

```bash
cd BE
npm run dev
```

Backend berjalan di `http://localhost:3000`.

### Terminal 2 — Frontend

```bash
cd FE
npm run dev
```

Frontend berjalan di `http://localhost:5173`.

> **Pastikan backend sudah berjalan sebelum mengakses frontend**, karena semua API call dikirim ke `http://localhost:3000/api`.

---

## Deployment

### Frontend → Vercel

1. Push ke GitHub.
2. Import repository di [Vercel](https://vercel.com).
3. Set Root Directory: `FE`.
4. Set environment variables (`VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
5. Build Command: `npm run build`.
6. Output Directory: `dist`.

### Backend → Railway

1. Push ke GitHub.
2. Import repository di [Railway](https://railway.app).
3. Set Root Directory: `BE`.
4. Set semua environment variables (lihat [Langkah 3](#langkah-3-setup-backend)).
5. Start Command: `npm start`.
6. Railway akan otomatis memberikan URL publik.

> **Penting**: Update `VITE_API_URL` di frontend ke URL Railway backend (misalnya `https://your-backend.up.railway.app/api`). Update juga CORS origin di `BE/src/app.js` jika menggunakan domain kustom.

---

## Environment Variables

### Backend (BE/.env)

| Variable | Wajib | Deskripsi |
|----------|-------|-----------|
| `PORT` | Ya | Port server (default: 3000) |
| `SUPABASE_URL` | Ya | URL project Supabase |
| `SUPABASE_ANON_KEY` | Ya | Anon/public key Supabase |
| `DATABASE_URL` | Ya | PostgreSQL connection string (pooling) |
| `GEMINI_API_KEY` | Ya | Google Gemini AI API key |
| `CHROMA_HOST` | Tidak | ChromaDB Cloud host |
| `CHROMA_API_KEY` | Tidak | ChromaDB API key |
| `CHROMA_TENANT` | Tidak | ChromaDB tenant ID |
| `CHROMA_DATABASE` | Tidak | ChromaDB database name |
| `REDIS_URL` | Tidak | Redis connection URL (Upstash) |
| `RESEND_API_KEY` | Tidak | Resend email API key |
| `TWILIO_ACCOUNT_SID` | Tidak | Twilio SID (WhatsApp) |
| `TWILIO_AUTH_TOKEN` | Tidak | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | Tidak | Twilio WhatsApp number |

### Frontend (FE/.env)

| Variable | Wajib | Deskripsi |
|----------|-------|-----------|
| `VITE_API_URL` | Ya | URL Backend API Gateway |
| `VITE_APP_NAME` | Tidak | Nama aplikasi |
| `VITE_APP_VERSION` | Tidak | Versi aplikasi |
| `VITE_API_TIMEOUT` | Tidak | Timeout request (ms) |
| `VITE_ENABLE_DEBUG` | Tidak | Enable debug mode |
| `VITE_TOKEN_STORAGE_KEY` | Tidak | Key localStorage untuk JWT |
| `VITE_SUPABASE_URL` | Tidak | URL Supabase (untuk Google OAuth) |
| `VITE_SUPABASE_ANON_KEY` | Tidak | Anon key Supabase (untuk Google OAuth) |

---

## Lisensi

Proyek ini dibuat sebagai **Capstone Project** untuk program Dicoding Academy.

---

<div align="center">

**Teman Pulih** — *Karena pemulihan tidak harus dijalani sendiri.*

</div>
