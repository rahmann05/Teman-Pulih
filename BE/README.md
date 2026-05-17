# TemanPulih — Backend (API Gateway)

Express.js API Gateway for the TemanPulih healthcare platform.

## Tech Stack

- **Runtime:** Node.js + Express.js
- **Database:** PostgreSQL via `pg` pool + Supabase client (RLS-aware)
- **Cache:** Redis (ioredis)
- **AI:** Google Gemini (chatbot) + ChromaDB (RAG vector store)
- **File Handling:** Multer (memory storage)

## Architecture: Thin Controller / Fat Service

All business logic lives in `services/`. Controllers are thin HTTP handlers only.

```
src/
├── app.js                    # Entry: CORS, JSON, central router, error handler
│
├── controllers/              # HTTP layer only (parse → service → respond)
│   ├── authController.js
│   ├── chatbotController.js
│   ├── emrController.js
│   ├── familyController.js   # Decoupled from profileController
│   ├── medicationController.js
│   ├── ocrController.js
│   ├── profileController.js
│   └── relationController.js
│
├── services/                 # Business logic & DB queries
│   ├── authService.js
│   ├── chatbotService.js     # EMR context, RAG retrieval, history management
│   ├── emrService.js         # Document parsing (PDF/DOCX heuristic NLP)
│   ├── familyService.js      # Invite & member listing
│   ├── medicationService.js  # CRUD, schedules, dose logging
│   ├── ocrService.js         # ML proxy, Supabase storage upload
│   ├── profileService.js     # Profile get/update with cache
│   └── relationService.js    # Caregiver access request/approval
│
├── helpers/                  # Shared utilities (DRY)
│   ├── cache.js              # cacheGet, cacheSet, cacheDel (Redis wrappers)
│   ├── patientAccess.js      # canAccessPatient, resolveTargetPatientId
│   ├── phone.js              # phoneRegex, normalizePhone
│   ├── supabase.js           # getSupabaseClient(req)
│   └── validation.js         # emailRegex
│
├── routes/                   # Express routers
│   ├── index.js              # Central router — mounts all feature routers at /api
│   ├── authRoutes.js
│   ├── chatbotRoutes.js
│   ├── emrRoutes.js
│   ├── familyRoutes.js       # /api/family/invite, /api/family/members
│   ├── medicationRoutes.js
│   ├── ocrRoutes.js
│   ├── profileRoutes.js
│   └── relationRoutes.js
│
├── middleware/
│   ├── authMiddleware.js     # requireAuth (JWT verification via Supabase)
│   └── errorHandler.js      # Centralized error → { error: "message" }
│
├── config/
│   ├── db.js                 # pg Pool + service-role Supabase client
│   ├── redis.js              # ioredis client
│   └── chroma.js             # ChromaDB client
│
└── tasks/
    └── cleanup.js            # Scheduled cron tasks
```

## Running Locally

```bash
npm install
npm run dev        # Start dev server (port 3000)
```

## API Endpoints

All endpoints are prefixed with `/api`.

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/auth/register` | POST | — | Register new user |
| `/api/auth/login` | POST | — | Login (email or phone) |
| `/api/auth/oauth` | POST | — | OAuth token exchange |
| `/api/auth/me` | GET | ✅ | Get current user |
| `/api/auth/refresh` | POST | — | Refresh access token |
| `/api/profile` | GET | ✅ | Get user profile |
| `/api/profile` | PATCH | ✅ | Update profile fields |
| `/api/medications` | GET | ✅ | List medications + schedules |
| `/api/medications` | POST | ✅ | Create medication |
| `/api/medications/:id` | PATCH | ✅ | Update medication |
| `/api/medications/:id` | DELETE | ✅ | Delete medication |
| `/api/medications/:id/taken` | POST | ✅ | Log dose status |
| `/api/medications/logs` | GET | ✅ | Get medication logs |
| `/api/chatbot/message` | POST | ✅ | Send message (SSE stream) |
| `/api/chatbot/history` | GET | ✅ | Get chat history |
| `/api/chatbot/history` | DELETE | ✅ | Clear chat history |
| `/api/ocr/scan` | POST | ✅ | Upload & OCR prescription |
| `/api/ocr/history` | GET | ✅ | Get scan history |
| `/api/ocr/result/:id` | GET | ✅ | Get specific scan result |
| `/api/family/invite` | POST | ✅ | Invite family member |
| `/api/family/members` | GET | ✅ | List family relations |
| `/api/relations/request` | POST | ✅ | Request patient access (caregiver) |
| `/api/relations/approve` | POST | ✅ | Approve/reject request (patient) |
| `/api/relations/pending` | GET | ✅ | Get pending requests |
| `/api/emr/upload` | POST | ✅ | Parse EMR document (PDF/DOCX) |
