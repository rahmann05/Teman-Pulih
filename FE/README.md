# TemanPulih — Frontend

React + Vite web application for the TemanPulih healthcare companion platform.

## Tech Stack

- **Framework:** React 19 (with React Compiler enabled)
- **Bundler:** Vite
- **Styling:** Vanilla CSS (feature-scoped CSS modules per feature)
- **Path Aliases:** `@/` → `src/` (configured in `vite.config.js`)

## Project Structure

```
src/
├── app/                     # App shell (router, providers, global setup)
│   ├── App.jsx
│   ├── AppProviders.jsx
│   └── AppRoutes.jsx
│
├── features/                # Feature modules (self-contained)
│   ├── auth/                # Login, register, OAuth callback
│   ├── chatbot/             # AI chat (streaming SSE), context, history
│   ├── dashboard/           # Patient & caregiver dashboards
│   ├── family-sync/         # Family invite, member list, pending requests
│   ├── landing/             # Landing page & Pelajari page
│   ├── medications/         # Medication CRUD, schedules, dose logging
│   ├── profile/             # Profile, EMR form, family section
│   └── scan/                # OCR prescription scanner
│
│   Each feature contains:
│   ├── components/          # Feature-specific UI components
│   ├── hooks/               # Feature-specific custom hooks
│   ├── pages/               # Route-level page components
│   ├── services/            # API call abstractions
│   └── *.css                # Feature-scoped styles
│
├── shared/                  # Cross-feature shared code
│   ├── components/          # Layout components (Navbar, Sidebar, etc.)
│   ├── context/             # Auth context (AuthContext.js)
│   ├── hooks/               # Shared hooks (useAuth, etc.)
│   ├── services/            # Shared API client (api.js, supabaseClient.js)
│   ├── config/              # Supabase config
│   └── utils/               # Shared utility functions
│
├── styles/                  # Global CSS only
│   ├── index.css            # CSS variables, resets, global tokens
│   └── animations.css       # Global animation keyframes
│
├── assets/                  # Static images
└── main.jsx                 # Entry point
```

## Running Locally

```bash
npm install
npm run dev        # Start dev server (http://localhost:5173)
npm run build      # Production build
npm run preview    # Preview production build
```

## Architecture Notes

- **Feature-First:** Each feature module is self-contained with its own components, hooks, services, and styles.
- **Thin Hooks:** Feature hooks consume feature services rather than making raw API calls.
- **Shared Services:** The `@/shared/services/api.js` Axios instance and `supabaseClient.js` are used across all features.
- **Path Aliases:** Use `@/` prefix instead of relative `../` traversal (e.g., `@/shared/services/api`).
