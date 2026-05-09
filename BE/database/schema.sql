-- Drop existing tables to ensure a clean reset
DROP TABLE IF EXISTS chat_history CASCADE;
DROP TABLE IF EXISTS ocr_history CASCADE;
DROP TABLE IF EXISTS medication_logs CASCADE;
DROP TABLE IF EXISTS medication_schedules CASCADE;
DROP TABLE IF EXISTS medications CASCADE;
DROP TABLE IF EXISTS family_relations CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

-- Enable UUID generation (default in Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Roles Table
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users Table
-- Catatan: Di Supabase, untuk autentikasi biasanya menggunakan tabel bawaan "auth.users" (yang menggunakan UUID).
-- Namun untuk keperluan simulasi/testing ini, kita mengubah id menjadi tipe SERIAL (Integer berurut)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    auth_id UUID UNIQUE, -- Terhubung dengan Supabase auth.users.id
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role_id INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT
);

-- Profiles Table (Extended user info)
CREATE TABLE profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    birth_date DATE,
    gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'other')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Family Relationships (For Caregiver Sync)
CREATE TABLE family_relations (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL,
    caregiver_id INTEGER NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (caregiver_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Medications Table (Hanya Data Obat)
CREATE TABLE medications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    dosage VARCHAR(100),
    instructions TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Medication Schedules (Hanya Jadwal Obat)
CREATE TABLE medication_schedules (
    id SERIAL PRIMARY KEY,
    medication_id INTEGER NOT NULL,
    frequency VARCHAR(100), -- e.g., '3x sehari'
    time_slots TEXT, -- e.g., '08:00,13:00,20:00'
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (medication_id) REFERENCES medications(id) ON DELETE CASCADE
);

-- Medication Logs (Tracking taken pills)
CREATE TABLE medication_logs (
    id SERIAL PRIMARY KEY,
    medication_id INTEGER NOT NULL,
    schedule_id INTEGER,
    taken_at TIMESTAMPTZ,
    status VARCHAR(50) DEFAULT 'taken' CHECK (status IN ('taken', 'missed', 'skipped')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (medication_id) REFERENCES medications(id) ON DELETE CASCADE,
    FOREIGN KEY (schedule_id) REFERENCES medication_schedules(id) ON DELETE SET NULL
);

-- OCR History
CREATE TABLE ocr_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    image_url TEXT NOT NULL,
    extracted_text TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Chatbot History
CREATE TABLE chat_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    sender VARCHAR(50) NOT NULL CHECK (sender IN ('user', 'ai')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);