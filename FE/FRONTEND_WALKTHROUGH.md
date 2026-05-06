# Frontend Walkthrough & Task Guide

Selamat datang di tim Frontend tim **Teman Pulih**! 
Dokumen ini dibuat khusus untuk memandu kamu memahami struktur proyek saat ini, teknologi yang digunakan, serta daftar pekerjaan (tasks) yang perlu diselesaikan, khususnya karena kita sekarang beroperasi dengan pemisahan **API Gateway (Backend For Frontend)**.

---

## 1. Konteks Arsitektur (Walkthrough)

Aplikasi ini menggunakan pola arsitektur **API Gateway / Backend-for-Frontend (BFF)**. 
Artinya, Frontend React **TIDAK BOLEH** menembak langsung ke Supabase (Database/Auth) ataupun servis Machine Learning.
- Seluruh HTTP request dari Frontend **harus diarahkan ke server Express (Backend)** yang berjalan di `http://localhost:3000/api`.
- Konfigurasi `baseURL` dan JWT otomatis sudah di-*handle* oleh file **`src/services/api.js`**.
- Sistem otentikasi menggunakan metode JWT (Json Web Token) *Bearer*, dimana token hasil login disimpan di `localStorage` dan dikirim ke setiap endpoint di Backend yang dilindungi.

---

## 2. Tech Stack & Konvensi
**Tech Stack:**
- **Framework:** React 19 (Vite 8)
- **Routing:** React Router v7
- **Styling:** Vanilla CSS dengan variabel root (Cek `src/styles/index.css`)
- **API Client:** Axios
- **Icon:** `react-icons`

**Konvensi Wajib:**
- Pastikan setiap komponen *functional* dan menggunakan React Hooks.
- Jangan gunakan *inline-styles*, sebisa mungkin gunakan CSS Module atau global classes yang ada sesuai design guide (`AGENT.MD`).
- Selalu gunakan servis `api` dari `src/services/api.js` untuk integrasi *backend*. Jangan gunakan `fetch` biasa.

---

## 3. Kondisi Frontend Saat Ini

- ✅ **Setup Dasar:** Vite + React + Axios + Router + Styling utama selesai.
- ✅ **API Interceptor:** Axios sudah dikonfigurasi (`src/services/api.js`) untuk melempar token.
- ✅ **Register:** Registrasi sudah berhasil menyambung ke backend gateway.
- ❌ **Login:** **UI Login ada, tetapi integrasinya belum jalan/belum tersambung dengan benar ke API backend**.
- ❌ **Dashboard & State:** Komponen UI secara statis sudah ada, namun belum mengambil data nyata dari backend (misalnya list obat, history OCR).

---

## 4. Persiapan Menjalankan Project Lokal (PENTING!)

Karena baru saja ada penambahan *library* baru di sisi Backend (seperti `multer` dan `form-data` untuk fitur OCR/Gateway), **kamu diwajibkan untuk meng-install dependensi backend terlebih dahulu** sebelum mengetes frontend.

Lakukan langkah berikut di terminal lokalmu:
1. Buka terminal pelengkap, masuk ke folder backend: `cd BE`
2. Jalankan perintah: `npm install`
3. Nyalakan server API Gateway backend: `npm run start` (atau `npm run dev` jika ingin mode auto-reload). Pastikan jalan di port 3000.
4. Di terminal terpisah baru jalankan frontend: `cd FE`, lalu `npm run dev` atau sejenisnya.

---

## 5. Daftar Tugas (Task List)

Berikut adalah daftar pekerjaan yang harus dieksekusi secara berurutan.

### Task 1: Fix & Implementasi Halaman Login (PRIORITAS UTAMA)
Saat ini *Login* gagal dieksekusi dari sisi frontend. 
- **File target:** `src/features/auth/LoginPage.jsx` (dan context auth `src/context/AuthProvider.jsx`).
- **Goal:**
  1. Tangkap inputan Email dan Password dari form.
  2. Kirim POST request menggunakan axios ke: `api.post('/auth/login', { email, password })`.
  3. Backend akan membalas dengan token authentication.
  4. Simpan token tersebut di `localStorage` (misal: `localStorage.setItem('token', response.data.token)`).
  5. Redirect user ke halaman `/dashboard`.
- **Note:** Jangan lupa kelola *state* *loading* dan tampilkan pesan *error* jika *credentials* salah.

### Task 2: Integrasi Profil (*Me*) & Protected Routing
Setelah user mereload halaman, kita perlu memastikan state login dipertahankan.
- **File target:** `src/context/AuthProvider.jsx`
- **Goal:**
  1. Buat mekanisme `useEffect` saat aplikasi pertama kali dimuat. Cek apakah ada token di `localStorage`.
  2. Jika ada token, langsung *hit* endpoint `GET /api/auth/me`.
  3. Store hasil dari profil database tersebut (role pasien/caregiver, full_name, dll) ke dalam global state Context API.
  4. Atur *Protected Router* di `App.jsx` agar user tidak bisa masuk ke dashboard bila token kosong, lalu paksa logout jika backend merespon `401 Unauthorized`.

### Task 3: Tampilkan List Jadwal Obat di Dashboard
- **File target:** `src/features/dashboard/PatientDashboard.jsx` atau `src/components/domain/MedicationTimeline.jsx`.
- **Goal:** 
  1. Buat pemanggilan `GET /api/medications` di *mount lifecycle* (useEffect).
  2. Ganti list data fiktif obat (hardcoded) yang ada di UI dengan *array* nyata dari response API.
  3. Integrasikan tombol "Telah Diminum (Taken)" melakukan trigger ke endpoint `POST /api/medications/:id/taken`.

### Task 4: Integrasi Scan OCR & Kirim File Obat
- **Target Integrasi File Upload Form-Data:**
  - Saat user melakukan foto resep, tangkap instance *File* nya, masukkan ke tipe *FormData*:
    ```javascript
    const form = new FormData();
    form.append('image', photoFile);
    ```
  - Tembak lewat `api.post('/ocr/scan', form, { headers: {"Content-Type": "multipart/form-data"} })`.
  - Tampilkan ekstrak *text* dari hasil OCR ke *Screen Result*.

### Task 5: Live Chat (AI Chatbot)
- **Target Chat:** Integrasikan *Input bar* supaya mengirim pesan secara POST ke endpoint `api.post('/chatbot/message', { message: textInput })`. Tampilkan percakapan bolak-balik dalam UI chat-bubble.

---

*Catatan untuk Frontend Dev:* Jika butuh referensi lengkap aturan Design System UI / Layout responsif, pastikan kamu selalu melihat referensi desain utama pada dokumen **`AGENT.MD`**. Semangat!