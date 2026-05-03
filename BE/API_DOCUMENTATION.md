# Teman Pulih API Documentation

Dokumentasi ini ditujukan untuk Frontend Developer sebagai panduan dalam mengintegrasikan antarmuka pengguna (React) dengan Backend API (Express.js).

## Base URL
Saat proses development lokal, seluruh endpoint akan diakses melalui Prefix:
`http://localhost:3000/api`

## Autentikasi
Sebagian besar endpoint bersifat *protected*. Artinya, Anda wajib menyertakan **JWT Token** dalam Request Header untuk mengaksesnya. Token didapatkan setelah berhasil login.

Format Header:
```json
{
  "Authorization": "Bearer <TOKEN_JWT_KAMU>"
}
```

---

## 1. Authentication (Auth)

### a. Register User
Mendaftarkan akun baru (sebagai Pasien atau Caregiver).

- **Endpoint**: `POST /auth/register`
- **Protected**: Tidak
- **Request Body (JSON)**:
  ```json
  {
      "name": "Budi Santoso",
      "email": "budi@gmail.com",
      "password": "password123",
      "role": "patient"  // pilihan: 'patient' atau 'caregiver'
  }
  ```
- **Response (201 Created)**:
  ```json
  {
      "message": "User berhasil didaftarkan",
      "user": {
          "id": 1,
          "name": "Budi Santoso",
          "email": "budi@gmail.com",
          "role": "patient"
      }
  }
  ```

### b. Login User
Masuk ke dalam aplikasi dan mendapatkan JWT Token.

- **Endpoint**: `POST /auth/login`
- **Protected**: Tidak
- **Request Body (JSON)**:
  ```json
  {
      "email": "budi@gmail.com",
      "password": "password123"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
      "message": "Login berhasil",
      "token": "eyJhbGciOiJIUzI1NiIsIn...",
      "user": {
          "id": 1,
          "name": "Budi Santoso",
          "email": "budi@gmail.com",
          "role": "patient"
      }
  }
  ```
*(Wajib simpan token ini di localStorage, session/cookies, atau Redux/Zustand di Frontend untuk digunakan di endpoint lain)*

### c. Get My Profile
Mendapatkan data user yang sedang login berdasarkan token.

- **Endpoint**: `GET /auth/me`
- **Protected**: Ya (Butuh Token)
- **Response (200 OK)**:
  ```json
  {
      "message": "Akses berhasil, ini adalah data profil Anda",
      "user": {
          "id": 1,
          "role": "patient",
          "iat": 1714652400,
          "exp": 1714738800
      }
  }
  ```

---

## 2. Medications (Jadwal Obat)

### a. Tambah Jadwal Obat Baru
- **Endpoint**: `POST /medications`
- **Protected**: Ya
- **Request Body (JSON)**:
  ```json
  {
      "patient_id": 1, // (Opsional jika login sebagai pasien. Wajib jika login sebagai caregiver untuk sinkronisasi)
      "medicine_name": "Paracetamol 500mg",
      "dosage": "1 Tablet",
      "frequency": "3x1",
      "time_to_take": ["08:00", "13:00", "19:00"], // array waktu
      "start_date": "2026-05-01",
      "end_date": "2026-05-05",
      "notes": "Diminum sesudah makan"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
      "message": "Jadwal berhasil ditambahkan",
      "data": {
          "id": 1,
          "patient_id": 1,
          "medicine_name": "Paracetamol 500mg",
          // ... field lainnya
      }
  }
  ```

### b. Ambil Jadwal Obat
Mengambil seluruh jadwal pengingat obat.

- **Endpoint**: `GET /medications`
- **Protected**: Ya
- **Query Params (Opsional)**: `?patient_id=1` (Dipakai oleh caregiver jika ingin melihat jadwal pasien tertentu)
- **Response (200 OK)**:
  ```json
  {
      "data": [
          {
              "id": 1,
              "patient_id": 1,
              "medicine_name": "Paracetamol 500mg",
              "dosage": "1 Tablet",
              "frequency": "3x1",
              "time_to_take": ["08:00", "13:00", "19:00"],
              "start_date": "2026-05-01",
              "end_date": "2026-05-05",
              "notes": "Diminum sesudah makan"
          }
      ]
  }
  ```

---

## 3. Ekstraksi Etiket Obat (OCR)

### a. Upload Foto Etiket/Resep
Upload gambar etiket obat untuk di scan menggunakan model Deep Learning OCR.
*(Catatan: Endpoint ini membutuhkan `multipart/form-data`, jangan gunakan JSON)*

- **Endpoint**: `POST /ocr/upload`
- **Protected**: Ya
- **Request Body (FormData)**:
  - `image`: [File Gambar / Foto Resep] (Maksimal tergantung limit multer)
- **Response (200 OK)**:
  ```json
  {
      "message": "OCR berhasil diproses",
      "data": {
          "id": 1,
          "patient_id": 1,
          "image_url": "/uploads/1714652400-resep.jpeg",
          "raw_ocr_text": "MOCK_OCR_RAW: Parasetamol 3x1",
          "processed_text": "Paracetamol 500mg, 3 kali sehari setelah makan.",
          "created_at": "2026-05-02T10:00:00.000Z"
      }
  }
  ```

### b. Ambil Riwayat Scan OCR
- **Endpoint**: `GET /ocr/logs`
- **Protected**: Ya
- **Response (200 OK)**:
  ```json
  {
      "data": [
           {
              "id": 1,
              "patient_id": 1,
              "image_url": "/uploads/1714652400-resep.jpeg",
              "processed_text": "Paracetamol 500mg, 3 kali sehari setelah makan."
          }
      ]
  }
  ```

---

## 4. Edukasi Medis (Chatbot)

### a. Kirim Pesan ke Chatbot
Berinteraksi dengan AI LLM (MedGemma) terkait informasi medis.

- **Endpoint**: `POST /chatbot/ask`
- **Protected**: Ya
- **Request Body (JSON)**:
  ```json
  {
      "message": "Apakah aman meminum obat ini bersamaan dengan vitamin C?"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
      "data": {
          "id": 1,
          "user_id": 1,
          "message": "Apakah aman meminum obat ini bersamaan dengan vitamin C?",
          "response": "(Mock ML Response) Anda bertanya: \"...\" Sebaiknya minum obat sesuai...",
          "created_at": "2026-05-02T10:05:00.000Z"
      }
  }
  ```

### b. Ambil Riwayat Percakapan
- **Endpoint**: `GET /chatbot/history`
- **Protected**: Ya
- **Response (200 OK)**:
  ```json
  {
      "data": [
          {
              "id": 1,
              "user_id": 1,
              "message": "Apakah aman meminum obat ini bersamaan!",
              "response": "Sebaiknya minum obat...",
              "created_at": "2026-05-02T10:05:00.000Z"
          }
      ]
  }
  ```
