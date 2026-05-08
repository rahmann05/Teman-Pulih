# AGENT.MD — Teman Pulih Frontend Guide

> **AI Agent Directive**: This document is the single source of truth for building the Teman Pulih frontend. Follow every section strictly. 

---

Don't Use GIT command.
Put all plan file in Capstone\docs\superpowers

## 1. Project Overview

**Teman Pulih** is a mobile-first health companion web app for post-hospitalization recovery. It helps patients and caregivers manage medication, scan prescriptions via OCR, and access an AI-powered medical chatbot.

### Core Problem
Patients recovering at home after hospital discharge face medication non-adherence (30-50%), misunderstanding of prescriptions, and lack of continuous medical guidance.

### Target Users
| Role | Description |
|------|-------------|
| **Pasien** (Patient) | Post-hospitalization individuals managing recovery at home |
| **Caregiver** | Family members assisting patient care |

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | **React 19** (SPA with Vite 8) |
| Styling | **Vanilla CSS** with CSS Custom Properties (design tokens in `index.css`) |
| Icons | **react-icons** (`react-icons/lu` for Lucide, `react-icons/hi2` for Heroicons) |
| HTTP Client | **Axios** |
| State Management | **Context API** or **Redux Toolkit** |
| Routing | **React Router v7** (Protected Routes) |
| Auth | **JWT** (stored in httpOnly cookies) |
| Linter | **ESLint** with `eslint-config-dicodingacademy` |
| Deployment | **Vercel** with GitHub CI/CD |
| Font | **Google Fonts: Plus Jakarta Sans** (headings), **Inter** (body) |

### Package Manager
Use `npm`. All commands assume npm.

---

## 3. Design System — "Pulih Design Language"

### 3.1 Design Philosophy

The design language is **warm, professional, and photography-driven** — never "AI-generated" or overly playful. It combines two visual references:

1. **Photography-Rich Service Cards** (Denta reference): Full-bleed hero imagery, image cards with dark gradient overlays and white text, category chips for filtering, glassmorphic icon buttons on cards, professional medical photography
2. **Clean Data Typography** (Health Monitor reference): Large bold stat numbers (36px+), restrained single-accent color system, clean white data cards with minimal shadows, warm neutral backgrounds

**Core principles:**
- No emojis anywhere in the UI — use `react-icons` exclusively
- Real photography for heroes, features, and backgrounds — never illustrations or Lottie
- Restrained 2-color accent system (terracotta + sage) — never rainbow or saturated
- Typography-first hierarchy — large weights and sizes establish visual structure
- Warm neutral palette that feels trustworthy and calm

### 3.2 Color Palette

```css
:root {
  /* Warm Neutrals */
  --bg: #FAF8F5;             /* Main background — warm off-white */
  --bg-card: #FFFFFF;        /* Card surfaces */
  --bg-muted: #F3F0EC;       /* Alternate section backgrounds */
  --bg-dark: #1A1A2E;        /* Dark sections (testimonial, footer, CTA cards) */

  /* Text */
  --text: #1A1A2E;           /* Primary text — near-black */
  --text-secondary: #6C6C80; /* Secondary/descriptive text */
  --text-muted: #A3A3B5;     /* Tertiary/placeholder text */
  --text-inverse: #FFFFFF;   /* Text on dark backgrounds */

  /* Accent — Warm Terracotta */
  --accent: #C4653A;         /* Primary accent — CTAs, highlights, labels */
  --accent-light: #F4DDD3;   /* Light accent — tags, badges */
  --accent-dark: #9E4E2A;    /* Dark accent — hover states */

  /* Secondary — Deep Sage (for secondary data emphasis) */
  --sage: #5B7B6A;
  --sage-light: #E4EDE8;

  /* Border */
  --border: #E8E5E0;
  --border-light: #F0EDEA;
}
```

### 3.3 Typography Scale

```css
/* Heading - Plus Jakarta Sans */
--font-heading: 'Plus Jakarta Sans', sans-serif;
/* Body - Inter */
--font-body: 'Inter', sans-serif;
/* Monospace for data */
--font-mono: 'JetBrains Mono', monospace;

/* Scale (mobile-first) */
--text-xs: 0.75rem;    /* 12px - captions */
--text-sm: 0.875rem;   /* 14px - secondary */
--text-base: 1rem;     /* 16px - body */
--text-lg: 1.125rem;   /* 18px - emphasis */
--text-xl: 1.25rem;    /* 20px - card titles */
--text-2xl: 1.5rem;    /* 24px - section heads */
--text-3xl: 1.875rem;  /* 30px - page titles */
--text-4xl: 2.25rem;   /* 36px - hero display */
--text-5xl: 3rem;      /* 48px - large data numbers */
```

### 3.4 Spacing & Layout

```css
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */

--radius-sm: 8px;
--radius-md: 12px;
--radius-lg: 16px;
--radius-xl: 24px;
--radius-2xl: 32px;
  --radius-full: 9999px;

  /* Responsive container strategy */
  --container-max: 1280px; /* Expands for desktop, centered with shadow */
  --container-mobile: 430px;
}
```

### 3.5 Elevation & Glass Effects

```css
/* Shadows — subtle, warm-tinted */
--shadow-sm: 0 1px 2px rgba(26, 26, 46, 0.04);
--shadow-md: 0 4px 16px rgba(26, 26, 46, 0.06);
--shadow-lg: 0 12px 40px rgba(26, 26, 46, 0.08);
--shadow-card: 0 2px 8px rgba(26, 26, 46, 0.04), 0 0 1px rgba(26, 26, 46, 0.06);

/* Glass — use sparingly on image-overlay buttons */
.glass-btn {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 50%;
}
```

### 3.6 Micro-Animations (2026 Trends)

All animations must be **purposeful** — guide attention, confirm actions, or provide feedback. Never decorative-only.

```css
/* Timing functions */
--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--spring: cubic-bezier(0.34, 1.56, 0.64, 1);

/* Duration tokens */
--duration-fast: 150ms;
--duration-normal: 250ms;
--duration-slow: 400ms;
--duration-enter: 300ms;
--duration-exit: 200ms;
```

**Required micro-animations:**
- Page transitions: slide-up with fade (300ms)
- Card hover: subtle lift (`translateY(-2px)`) + image scale (`1.04`)
- Card click (`:active`): refined tactile compression (`scale(0.985)`) + gradient overlay shift
- Button tap: subtle scale pulse + ripple effect
- Desktop images: smoother cinematic zoom (`1.2s`) and `object-position` composition tuning
- Loading states: skeleton shimmer (never empty screens)

**Respect `prefers-reduced-motion`** — disable all non-essential animations.

---

## 4. Page Architecture & Routes

```
/                     → Landing Page (public)
/login                → Login Page (public)
/register             → Register Page (public)
/forgot-password      → Forgot Password (public)

/dashboard            → Patient Dashboard (protected)
/scan                 → OCR Prescription Scanner (protected)
/scan/result/:id      → OCR Result + Manual Edit (protected)
/medications          → Medication Schedule List (protected)
/medications/:id      → Medication Detail (protected)
/chatbot              → AI Medical Chatbot (protected)
/profile              → User Profile & Settings (protected)
/family-sync          → Caregiver Sync Settings (protected)

/caregiver/dashboard  → Caregiver Dashboard (protected, role-based)
```

---

## 5. Component Architecture

### 5.1 Folder Structure

```
src/
├── assets/              # Static images, icons, lotties
│   ├── icons/
│   ├── images/
│   └── animations/
├── components/          # Reusable UI components
│   ├── ui/              # Primitives (Button, Card, Input, etc.)
│   │   └── auth/        # Auth primitives (AuthInputField, SocialLoginButton, etc.)
│   ├── layout/          # Shell, BottomNav, Header, Container
│   │   └── auth/        # Auth layout components (AuthLayout)
│   ├── feedback/        # Toast, Skeleton, Spinner, EmptyState
│   └── domain/          # LandingHero, MedicationCard, ChatBubble, ScanPreview
├── features/            # Feature-based modules
│   ├── auth/            # Auth pages (LoginPage, RegisterPage)
│   ├── dashboard/       # PatientDashboard, CaregiverDashboard
│   ├── scan/            # ScanCamera, ScanResult, TextEditor
│   ├── medications/     # MedList, MedDetail, MedReminder
│   ├── chatbot/         # ChatWindow, MessageList, InputBar
│   └── profile/         # ProfileView, Settings, FamilySync
├── hooks/               # Custom hooks (useAuth, useApi, useToast)
├── context/             # React Context providers
├── services/            # Axios API service layer
├── utils/               # Helpers, formatters, validators
├── styles/              # Global CSS & Feature-specific styles
│   ├── features/        # Scoped feature styles (Auth.css, etc.)
│   ├── App.css
│   └── index.css
├── routes/              # Route definitions, ProtectedRoute wrapper
├── App.jsx
└── main.jsx
```

### 5.2 Key UI Components

#### Bottom Navigation (Always visible on protected routes)
```
┌──────────────────────────────────────────┐
│  Home    Scan    Obat    Chat    Profil  │
│  (icon)  (icon)  (icon)  (icon)  (icon)  │
└──────────────────────────────────────────┘
```
- Use `react-icons/lu` icons: `LuHome`, `LuScanLine`, `LuPill`, `LuMessageCircle`, `LuUser`
- Active state: filled icon + label + terracotta accent dot below
- Inactive: outline icon only, `--text-muted` color
- Scan button: elevated, larger, `--accent` background (primary CTA)

#### Landing Components (Domain)
Full-bleed photography with dark gradient overlay (Denta-style):
```
┌──────────────────────────────┐
│  LandingHero                 │
│  LandingFeatureGrid          │
│  LandingStats                │
│  LandingSteps                │
└──────────────────────────────┘
```

#### Hero Section (LandingHero)
Full-bleed photography with dark gradient overlay, content anchored to bottom:
```
┌──────────────────────────────┐
│  [logo-mark] Teman Pulih     │  ← nav over image
│                              │
│    (full-bleed photograph)   │
│                              │
│  ── PENDAMPING PEMULIHAN     │  ← uppercase label with line
│  Pulih Lebih                 │
│  Aman & Terarah              │  ← bold 32px heading
│  Description text...         │
│                              │
│  [Mulai Sekarang →] [Pelajari]│  ← terracotta + outline btns
└──────────────────────────────┘
```

#### Feature Grid (LandingFeatureGrid)
Photography cards with dark overlay and white text:
```
┌──────────────────────────────┐
│  (photograph background)     │
│                              │
│  DEEP OCR          [>]       │  ← label + glass chevron btn
│  Scan Resep Obat             │  ← bold white title
└──────────────────────────────┘
┌─────────────┐ ┌─────────────┐
│ (photo bg)  │ │ (photo bg)  │
│ OTOMATIS    │ │ MEDGEMMA    │
│ Pengingat   │ │ Chatbot AI  │
│ Obat    [>] │ │         [>] │
└─────────────┘ └─────────────┘
```

#### Data Cards (Medication Schedule)
Inspired by Health Monitor — clean white cards, large bold numbers, terracotta accent:
```
┌──────────────────────────────┐
│  [Pill icon] Amoxicillin     │
│  500 mg  •  3x sehari        │
│                              │
│  ████████░░  7/10 diminum    │
│  Sisa: 3 hari                │
└──────────────────────────────┘
```

#### Chat Interface
Clean chat bubbles with avatar initials, no emoji:
```
┌──────────────────────────────┐
│  [HeartPulse] Teman Pulih AI │
│                              │
│       ┌──────────────┐       │
│       │ User message │       │
│       └──────────────┘       │
│  ┌──────────────────┐        │
│  │ AI response with │        │
│  │ formatted medical│        │
│  │ information      │        │
│  └──────────────────┘        │
│                              │
│  [Attach] [Ketik pesan...]   │
│                         [>]  │
└──────────────────────────────┘
```

#### Category Chips (Service Filtering)
Horizontal scroll pills with `react-icons`, active chip uses `--bg-dark` fill:
```
[* Semua Layanan] [ScanLine OCR Resep] [Clock Pengingat] [MessageCircle Chatbot]
```

---

## 6. Page Specifications

### 6.1 Landing Page
- Full-bleed hero photograph (patient recovery context) with dark gradient overlay
- Content anchored bottom-left: uppercase label, bold heading, description, two CTAs
- Horizontal scrollable category chips (Denta-style)
- Image-rich feature cards: 1 large + 2 half-width grid, photography with dark overlay
- Stats section: 2×2 grid with large bold numbers (36px, 800 weight), terracotta/sage colors
- Steps section: numbered circles with vertical connector line
- Testimonial: dark background, large italic quote, avatar initials
- Bottom CTA: dark rounded card with shield icon and terracotta button
- Minimal dark footer with logo, links, copyright

### 6.2 Login / Register
- Clean centered card on gradient background
- Social login options (Google)
- Role selection toggle: Pasien / Caregiver
- Form validation with inline error messages
- Password strength indicator on register

### 6.3 Patient Dashboard
- Greeting header with avatar & notification bell
- Hero card: next medication reminder (gradient + glass)
- Quick action grid: Scan Resep, Jadwal Obat, Chat AI, Family Sync
- Today's medication timeline (vertical)
- Health tips carousel (horizontal scroll cards)

### 6.4 OCR Scan Page
- Camera viewfinder with overlay guide frame
- "Ambil Foto" / "Upload dari Galeri" buttons
- Processing state: animated scan line effect
- Result page: extracted text with editable fields
- "Tanyakan ke AI" button to send to chatbot

### 6.5 Medication List
- Category filter chips (horizontal scroll)
- Medication cards with progress bars
- FAB button: "Tambah Obat Manual"
- Sort/filter by time, name, completion

### 6.6 AI Chatbot
- Chat bubble interface
- AI avatar with typing indicator animation
- Support for rich content: bullet lists, bold text, warnings
- Quick reply suggestion chips
- "Scan Resep" shortcut within chat

### 6.7 Profile & Settings
- Avatar with edit overlay
- Personal info card
- Connected caregiver list
- App settings: notifications, theme, language
- Logout button (red, bottom)

---

## 7. API Integration Patterns

### Base Configuration
```javascript
// services/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' }
});

// Request interceptor: attach JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor: handle 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);
```

### API Endpoints (Expected from Backend)
```
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me

GET    /api/medications
POST   /api/medications
PATCH  /api/medications/:id
DELETE /api/medications/:id
POST   /api/medications/:id/taken

POST   /api/ocr/scan          (multipart/form-data)
GET    /api/ocr/history
GET    /api/ocr/result/:id

POST   /api/chatbot/message
GET    /api/chatbot/history

GET    /api/profile
PATCH  /api/profile
POST   /api/family/invite
GET    /api/family/members
```

---

## 8. State Management

```
AuthContext        → user, token, login(), logout(), isAuthenticated
MedicationContext  → medications[], addMed(), updateMed(), markTaken()
ChatContext        → messages[], sendMessage(), loadHistory()
UIContext          → theme, toast(), loading states
```

---

## 9. Performance & Accessibility

### Performance Rules
- **Lazy load** all feature routes with `React.lazy()` + `Suspense`
- **Skeleton screens** for all loading states (never spinners alone)
- Images: use WebP format, lazy load with `loading="lazy"`
- Bundle splitting per route
- Target **Lighthouse score ≥ 90** on mobile

### Accessibility (WCAG 2.2 AA)
- All interactive elements: minimum 44x44px touch target
- Color contrast ratio ≥ 4.5:1 for text
- Semantic HTML: `<nav>`, `<main>`, `<article>`, `<section>`
- ARIA labels on all icon-only buttons
- Focus management on route changes
- `prefers-reduced-motion` respected
- Screen reader friendly chat messages

---

## 10. Responsive Design Strategy

The app follows a **mobile-first responsive** approach. While designed primarily for a 430px viewport, it expands gracefully for tablet and desktop.

### Breakpoints & Layout Shifts
- **Mobile (Default):** Single column layouts, vertical timelines, full-width cards.
- **Tablet (768px+):**
  - Feature Grid: Asymmetric 2-column layout. Large card (`460px`) perfectly aligned with two small cards (`220px` each) and a `20px` gap.
  - Stats: Expands to 4-column row.
  - Steps: Shifts from vertical to horizontal 3-column process.
  - Content: Increased padding and scaled-up typography.
- **Desktop (1024px+):**
  - Max-width: `#root` container capped at `1280px` and centered.
  - Feature Grid: Gap increases to `24px`, large card height adjusted to `464px` for perfect alignment with side cards.
  - Hero: Full-screen height (`100dvh`), max-height `1400px`, bold `80px` display headings.
  - Navbar: Enlarged logo (`24px`) and action buttons (`12px 28px` padding).
  - Stats: Scaled up numbers (`42px`) and descriptions (`14px`).
  - Composition: Mandated `object-position` tuning (e.g., `center 30%` for hero) to maintain subject focus on wider aspect ratios.
  - Visual: Centered app-frame with soft shadows on ultra-wide viewports.

---

## 11. Development Conventions

### Naming
- Components: `PascalCase.jsx`
- Hooks: `useCamelCase.js`
- Utils: `camelCase.js`
- CSS modules: `ComponentName.module.css` (if not using Tailwind)
- Constants: `UPPER_SNAKE_CASE`

### Code Style
- Follow the **Dicoding Academy ESLint standard** (`eslint-config-dicodingacademy`) strictly.
- Use semicolons, 2-space indentation, and LF line endings.
- Functional components only (no class components).
- Destructure props in function signature.
- Custom hooks for all reusable logic.
- Error boundaries around each feature route.
- All API calls in `services/` layer, never in components directly.

### Git Conventions
- Branch: `feature/`, `fix/`, `refactor/`
- Commits: conventional commits (`feat:`, `fix:`, `style:`, `refactor:`)
- PR required for merge to `main`

---

## 12. Environment Variables

```env
VITE_API_URL=http://localhost:3000/api
VITE_ML_API_URL=http://localhost:8000
VITE_APP_NAME=Teman Pulih
VITE_APP_VERSION=1.0.0
```

---

## 13. 2026 Design Trend Checklist

- [x] Mobile-first responsive design (430px container)
- [x] Photography-driven UI — real images, never illustrations or emoji
- [x] Warm neutral palette — trustworthy, professional, calm
- [x] Restrained accent system (2 colors: terracotta + sage)
- [x] Variable font usage (Plus Jakarta Sans 300–800)
- [x] Purposeful micro-animations with spring easing
- [x] Scroll-reveal animations via IntersectionObserver
- [x] Skeleton loading states (never empty screens)
- [x] One-handed thumb-zone optimized bottom navigation
- [x] Anticipatory design (proactive medication reminders)
- [x] High contrast accessible color palette (WCAG 2.2 AA)
- [x] Physics-based motion (spring, ease-out-expo)
- [x] Category chips for quick filtering (Denta-inspired)
- [x] Image-rich overlay cards with glassmorphic buttons
- [x] `prefers-reduced-motion` respected
- [x] Icon library (`react-icons`) — no emoji anywhere

---

## 14. Key Visual References Summary

| Aspect | Inspiration Source | Implementation |
|--------|-------------------|----------------|
| Full-bleed photography hero | Denta (center screen) | Landing hero with dark gradient overlay |
| Image-rich overlay cards | Denta (left screen) | Feature cards with photo bg + white text |
| Category filter chips | Denta (left screen) | Horizontal scroll pills with icons |
| Glassmorphic icon buttons | Denta (left screen) | Chevron buttons on feature cards |
| Chat UI with avatar | Denta (right screen) | AI chatbot interface |
| Large data numbers | Health Monitor (all screens) | Stats section, medication dosages |
| Clean white data cards | Health Monitor (right screen) | Stat cards, medication cards |
| Single warm accent color | Health Monitor (orange) | Terracotta (#C4653A) throughout |
| Pill-shaped CTAs | Both references | All primary and outline buttons |
| Dark sections for contrast | Both references | Testimonial, footer, bottom CTA card |

---

> **Remember**: Teman Pulih is a health app. The design must feel **trustworthy, calm, and professional**. Use real photography, warm neutrals, and restrained accents. **Never use emojis** — always use `react-icons`. Every pixel should serve the goal of helping patients recover safely at home.
