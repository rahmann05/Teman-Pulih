-- Tabel untuk nyimpan data pengguna (Pasien dan Caregiver)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('patient', 'caregiver')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabel untuk menghubungkan Pasien dan Caregiver (Family Sync)
CREATE TABLE patient_caregivers (
    patient_id INT REFERENCES users(id) ON DELETE CASCADE,
    caregiver_id INT REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (patient_id, caregiver_id)
);

-- Tabel untuk Jadwal Minum Obat (Medication Schedules)
CREATE TABLE medication_schedules (
    id SERIAL PRIMARY KEY,
    patient_id INT REFERENCES users(id) ON DELETE CASCADE,
    medicine_name VARCHAR(100) NOT NULL,
    dosage VARCHAR(50) NOT NULL,
    frequency VARCHAR(50) NOT NULL, -- Contoh: '3x1', '1x1'
    time_to_take TIME[], -- Array waktu minum obat
    start_date DATE,
    end_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabel untuk Log Riwayat Hasil Scan OCR
CREATE TABLE ocr_logs (
    id SERIAL PRIMARY KEY,
    patient_id INT REFERENCES users(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    raw_ocr_text TEXT,
    processed_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabel untuk Log Riwayat Chatbot
CREATE TABLE chatbot_logs (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    response TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);