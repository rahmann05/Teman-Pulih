-- ============================================================
-- TemanPulih — Unified Database Schema (Consolidated)
--
-- File ini menyatukan seluruh tabel, indeks, fungsi, trigger,
-- dan kebijakan Row Level Security (RLS) dari:
--   1. schema.sql (V1)
--   2. migration_v2.sql (V2 - EMR & Illness History)
--   3. migration_v3.sql (V3 - Illness RAG JSONB)
--   4. ocr_history_structured_data.sql (V4 - OCR structured_data)
--   5. apply_rls.sql (RLS Policies)
--
-- Jalankan file ini di Supabase SQL Editor untuk inisialisasi bersih.
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- Bagian 1: Bersihkan Skema Lama (Clean Reset)
-- ──────────────────────────────────────────────────────────

DROP TABLE IF EXISTS public.chat_history CASCADE;
DROP TABLE IF EXISTS public.ocr_history CASCADE;
DROP TABLE IF EXISTS public.medication_logs CASCADE;
DROP TABLE IF EXISTS public.medication_schedules CASCADE;
DROP TABLE IF EXISTS public.medications CASCADE;
DROP TABLE IF EXISTS public.family_relations CASCADE;
DROP TABLE IF EXISTS public.reminder_preferences CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.roles CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.illness_history CASCADE;
DROP TABLE IF EXISTS public.daily_checkins CASCADE;
DROP TABLE IF EXISTS public.medical_complaints CASCADE;
DROP TABLE IF EXISTS public.compliance_assessments CASCADE;

-- Aktifkan UUID generation extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ──────────────────────────────────────────────────────────
-- Bagian 2: Definisi Tabel (Tables)
-- ──────────────────────────────────────────────────────────

-- 1. Roles Table
CREATE TABLE public.roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Users Table
CREATE TABLE public.users (
    id SERIAL PRIMARY KEY,
    auth_id UUID UNIQUE, -- Link ke Supabase auth.users.id
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role_id INTEGER, -- Legacy/Single-role column (opsional)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. User Roles Junction Table (Multi-role support)
CREATE TABLE public.user_roles (
    user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role_id INTEGER NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

-- 4. Profiles Table (Rekam Medis / EMR Lengkap)
CREATE TABLE public.profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    phone VARCHAR(20),
    address TEXT,
    birth_date DATE,
    gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'other')),
    blood_type VARCHAR(5),
    height NUMERIC(5,1),
    weight NUMERIC(5,1),
    blood_pressure_range VARCHAR(50),
    allergies TEXT,
    chronic_conditions TEXT,
    past_illnesses TEXT,
    last_illness TEXT,
    surgeries_history TEXT,
    routine_medications TEXT,
    smoking_habit BOOLEAN DEFAULT FALSE,
    alcohol_habit BOOLEAN DEFAULT FALSE,
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(30),
    is_emr_completed BOOLEAN DEFAULT FALSE,
    chronic_conditions_list TEXT[] DEFAULT '{}',
    allergies_list TEXT[] DEFAULT '{}',
    past_illnesses_list TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Reminder Preferences
CREATE TABLE public.reminder_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    channel VARCHAR(20) NOT NULL DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp')),
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Family Relationships (For Caregiver Sync)
CREATE TABLE public.family_relations (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    caregiver_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT family_relation_unique UNIQUE (patient_id, caregiver_id),
    CONSTRAINT family_relation_no_self CHECK (patient_id <> caregiver_id)
);

-- 7. Medications Table
CREATE TABLE public.medications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    dosage VARCHAR(100),
    instructions TEXT,
    medicinal_insight JSONB,
    image_url TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Medication Schedules
CREATE TABLE public.medication_schedules (
    id SERIAL PRIMARY KEY,
    medication_id INTEGER NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
    frequency VARCHAR(100),
    time_slots TEXT,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Medication Logs
CREATE TABLE public.medication_logs (
    id SERIAL PRIMARY KEY,
    medication_id INTEGER NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
    schedule_id INTEGER REFERENCES public.medication_schedules(id) ON DELETE SET NULL,
    time_slot VARCHAR(20), -- e.g., "08:00"
    taken_at TIMESTAMPTZ,
    status VARCHAR(50) DEFAULT 'taken' CHECK (status IN ('taken', 'missed', 'skipped')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. OCR History Table
CREATE TABLE public.ocr_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    extracted_text TEXT,
    structured_data JSONB DEFAULT NULL,
    storage_path TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Chatbot History Table
CREATE TABLE public.chat_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    sender VARCHAR(50) NOT NULL CHECK (sender IN ('user', 'ai')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Illness History Table (Riwayat penyakit terkini & Chroma RAG)
CREATE TABLE public.illness_history (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    illness_name VARCHAR(255) NOT NULL,
    started_at DATE NOT NULL DEFAULT CURRENT_DATE,
    recovered_at DATE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT,
    illness_info JSONB DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON COLUMN public.illness_history.illness_info IS 'Informasi kondisi penyakit dari Chroma RAG: indikasi, gejala_umum, penanganan, obat_terkait, peringatan';

-- 13. Daily Checkins Table (Skrining Harian)
CREATE TABLE public.daily_checkins (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    checkin_date DATE NOT NULL DEFAULT CURRENT_DATE,
    condition_rating SMALLINT NOT NULL CHECK (condition_rating BETWEEN 1 AND 5),
    symptoms_felt TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT daily_checkins_unique UNIQUE (patient_id, checkin_date)
);

-- 14. Medical Complaints Table (Keluhan Aktif)
CREATE TABLE public.medical_complaints (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    symptoms TEXT NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('mild', 'moderate', 'severe')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. Compliance Assessments Table
CREATE TABLE public.compliance_assessments (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    raw_responses JSONB NOT NULL,
    adherence_class SMALLINT NOT NULL,     -- 0: Non-Adherent, 1: Adherent
    adherence_score NUMERIC(5,4) NOT NULL,  -- Probability (0.0000 - 1.0000)
    behaviour_class SMALLINT NOT NULL,     -- 0: Negatif, 1: Positif
    perception_class SMALLINT NOT NULL,    -- 0: Negatif, 1: Netral, 2: Positif
    model_version VARCHAR(50) DEFAULT 'hf-acous-v1',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────
-- Bagian 3: Indeks Performa (Indexes)
-- ──────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_medications_user_id ON public.medications USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_medication_logs_medication_id ON public.medication_logs USING btree (medication_id);
CREATE INDEX IF NOT EXISTS idx_medication_schedules_medication_id ON public.medication_schedules USING btree (medication_id);

CREATE INDEX IF NOT EXISTS idx_illness_history_patient_id ON public.illness_history(patient_id);
CREATE INDEX IF NOT EXISTS idx_illness_history_active ON public.illness_history(patient_id, is_active);

CREATE INDEX IF NOT EXISTS idx_daily_checkins_patient_id ON public.daily_checkins(patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_complaints_patient_id ON public.medical_complaints(patient_id);

CREATE INDEX IF NOT EXISTS idx_ocr_history_created_at ON public.ocr_history(created_at);
CREATE INDEX IF NOT EXISTS idx_ocr_history_user_id ON public.ocr_history(user_id);

CREATE INDEX IF NOT EXISTS idx_compliance_patient_id ON public.compliance_assessments(patient_id);
CREATE INDEX IF NOT EXISTS idx_compliance_created_at ON public.compliance_assessments(created_at);

-- ──────────────────────────────────────────────────────────
-- Bagian 4: Trigger & Fungsi Pendaftaran User Baru
-- ──────────────────────────────────────────────────────────

-- Fungsi otomatis pemetaan user dari Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_user_id INTEGER;
    role_name TEXT;
    target_role_id INTEGER;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Implementasi lengkap handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_user_id INTEGER;
    role_name TEXT;
    target_role_id INTEGER;
BEGIN
    -- 1. Ambil metadata role pendaftaran (default ke 'patient')
    role_name := COALESCE(new.raw_user_meta_data->>'role', 'patient');
    
    -- Pemetaan role_name ke roles.id
    SELECT id INTO target_role_id FROM public.roles WHERE name = role_name;
    IF target_role_id IS NULL THEN
        target_role_id := 2; -- Default ke patient jika tidak cocok
    END IF;

    -- 2. Insert ke public.users
    INSERT INTO public.users (auth_id, name, email, created_at, updated_at)
    VALUES (
        new.id, 
        COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)), 
        new.email,
        new.created_at,
        new.created_at
    )
    RETURNING id INTO new_user_id;

    -- 3. Hubungkan ke user_roles
    INSERT INTO public.user_roles (user_id, role_id)
    VALUES (new_user_id, target_role_id);

    -- 4. Inisialisasi profil dasar kosong
    INSERT INTO public.profiles (user_id, phone, created_at, updated_at)
    VALUES (
        new_user_id, 
        COALESCE(new.raw_user_meta_data->>'phone', ''), 
        new.created_at,
        new.created_at
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger ke auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ──────────────────────────────────────────────────────────
-- Bagian 5: Row Level Security (RLS)
-- ──────────────────────────────────────────────────────────

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminder_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medication_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medication_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ocr_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.illness_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_assessments ENABLE ROW LEVEL SECURITY;

-- ── 1. Users Policies
DROP POLICY IF EXISTS "Users can view their own data" ON public.users;
CREATE POLICY "Users can view their own data" ON public.users FOR SELECT USING (auth.uid() = auth_id);

DROP POLICY IF EXISTS "Users can insert their own data" ON public.users;
CREATE POLICY "Users can insert their own data" ON public.users FOR INSERT WITH CHECK (auth.uid() = auth_id);

DROP POLICY IF EXISTS "Users can update their own data" ON public.users;
CREATE POLICY "Users can update their own data" ON public.users FOR UPDATE USING (auth.uid() = auth_id);

-- ── 2. Profiles Policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = profiles.user_id AND users.auth_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE users.id = profiles.user_id AND users.auth_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = profiles.user_id AND users.auth_id = auth.uid()));

-- ── 3. Reminder Preferences Policies
DROP POLICY IF EXISTS "Users can view their own reminder preferences" ON public.reminder_preferences;
CREATE POLICY "Users can view their own reminder preferences" ON public.reminder_preferences FOR SELECT USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = reminder_preferences.user_id AND users.auth_id = auth.uid()));

DROP POLICY IF EXISTS "Users can manage their own reminder preferences" ON public.reminder_preferences;
CREATE POLICY "Users can manage their own reminder preferences" ON public.reminder_preferences FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = reminder_preferences.user_id AND users.auth_id = auth.uid()));

-- ── 4. Medications Policies
DROP POLICY IF EXISTS "Users can view their own medications" ON public.medications;
CREATE POLICY "Users can view their own medications" ON public.medications FOR SELECT USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = medications.user_id AND users.auth_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own medications" ON public.medications;
CREATE POLICY "Users can insert their own medications" ON public.medications FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE users.id = medications.user_id AND users.auth_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update their own medications" ON public.medications;
CREATE POLICY "Users can update their own medications" ON public.medications FOR UPDATE USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = medications.user_id AND users.auth_id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own medications" ON public.medications;
CREATE POLICY "Users can delete their own medications" ON public.medications FOR DELETE USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = medications.user_id AND users.auth_id = auth.uid()));

-- ── 5. Medication Schedules Policies
DROP POLICY IF EXISTS "Users can view schedules for their medications" ON public.medication_schedules;
CREATE POLICY "Users can view schedules for their medications" ON public.medication_schedules FOR SELECT USING (EXISTS (SELECT 1 FROM public.medications JOIN public.users ON medications.user_id = users.id WHERE medications.id = medication_schedules.medication_id AND users.auth_id = auth.uid()));

DROP POLICY IF EXISTS "Users can manage schedules for their medications" ON public.medication_schedules;
CREATE POLICY "Users can manage schedules for their medications" ON public.medication_schedules FOR ALL USING (EXISTS (SELECT 1 FROM public.medications JOIN public.users ON medications.user_id = users.id WHERE medications.id = medication_schedules.medication_id AND users.auth_id = auth.uid()));

-- ── 6. Medication Logs Policies
DROP POLICY IF EXISTS "Users can view their medication logs" ON public.medication_logs;
CREATE POLICY "Users can view their medication logs" ON public.medication_logs FOR SELECT USING (EXISTS (SELECT 1 FROM public.medications JOIN public.users ON medications.user_id = users.id WHERE medications.id = medication_logs.medication_id AND users.auth_id = auth.uid()));

DROP POLICY IF EXISTS "Users can manage their medication logs" ON public.medication_logs;
CREATE POLICY "Users can manage their medication logs" ON public.medication_logs FOR ALL USING (EXISTS (SELECT 1 FROM public.medications JOIN public.users ON medications.user_id = users.id WHERE medications.id = medication_logs.medication_id AND users.auth_id = auth.uid()));

-- ── 7. Family Relations Policies
DROP POLICY IF EXISTS "Users can view their family relations" ON public.family_relations;
CREATE POLICY "Users can view their family relations" ON public.family_relations FOR SELECT USING (EXISTS (SELECT 1 FROM public.users WHERE (users.id = family_relations.patient_id OR users.id = family_relations.caregiver_id) AND users.auth_id = auth.uid()));

DROP POLICY IF EXISTS "Users can manage their family relations" ON public.family_relations;
CREATE POLICY "Users can manage their family relations" ON public.family_relations FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE (users.id = family_relations.patient_id OR users.id = family_relations.caregiver_id) AND users.auth_id = auth.uid()));

-- ── 8. OCR History Policies
DROP POLICY IF EXISTS "Users can view their OCR history" ON public.ocr_history;
CREATE POLICY "Users can view their OCR history" ON public.ocr_history FOR SELECT USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = ocr_history.user_id AND users.auth_id = auth.uid()));

DROP POLICY IF EXISTS "Users can manage their OCR history" ON public.ocr_history;
CREATE POLICY "Users can manage their OCR history" ON public.ocr_history FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = ocr_history.user_id AND users.auth_id = auth.uid()));

-- ── 9. Chat History Policies
DROP POLICY IF EXISTS "Users can view their chat history" ON public.chat_history;
CREATE POLICY "Users can view their chat history" ON public.chat_history FOR SELECT USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = chat_history.user_id AND users.auth_id = auth.uid()));

DROP POLICY IF EXISTS "Users can manage their chat history" ON public.chat_history;
CREATE POLICY "Users can manage their chat history" ON public.chat_history FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = chat_history.user_id AND users.auth_id = auth.uid()));

-- ── 10. User Roles Policies
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = user_roles.user_id AND users.auth_id = auth.uid()));

-- ── 11. Illness History Policies
DROP POLICY IF EXISTS "Patients manage own illness history" ON public.illness_history;
CREATE POLICY "Patients manage own illness history" ON public.illness_history FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = illness_history.patient_id AND users.auth_id = auth.uid()));

DROP POLICY IF EXISTS "Caregivers view patient illness history" ON public.illness_history;
CREATE POLICY "Caregivers view patient illness history" ON public.illness_history FOR SELECT USING (EXISTS (SELECT 1 FROM public.family_relations fr JOIN public.users u ON u.id = fr.caregiver_id WHERE fr.patient_id = illness_history.patient_id AND fr.status = 'accepted' AND u.auth_id = auth.uid()));

-- ── 12. Daily Checkins Policies
DROP POLICY IF EXISTS "Patients manage own checkins" ON public.daily_checkins;
CREATE POLICY "Patients manage own checkins" ON public.daily_checkins FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = daily_checkins.patient_id AND users.auth_id = auth.uid()));

DROP POLICY IF EXISTS "Caregivers view patient checkins" ON public.daily_checkins;
CREATE POLICY "Caregivers view patient checkins" ON public.daily_checkins FOR SELECT USING (EXISTS (SELECT 1 FROM public.family_relations fr JOIN public.users u ON u.id = fr.caregiver_id WHERE fr.patient_id = daily_checkins.patient_id AND fr.status = 'accepted' AND u.auth_id = auth.uid()));

-- ── 13. Medical Complaints Policies
DROP POLICY IF EXISTS "Patients manage own complaints" ON public.medical_complaints;
CREATE POLICY "Patients manage own complaints" ON public.medical_complaints FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = medical_complaints.patient_id AND users.auth_id = auth.uid()));

DROP POLICY IF EXISTS "Caregivers view patient complaints" ON public.medical_complaints;
CREATE POLICY "Caregivers view patient complaints" ON public.medical_complaints FOR SELECT USING (EXISTS (SELECT 1 FROM public.family_relations fr JOIN public.users u ON u.id = fr.caregiver_id WHERE fr.patient_id = medical_complaints.patient_id AND fr.status = 'accepted' AND u.auth_id = auth.uid()));

-- ── 14. Compliance Assessments Policies
DROP POLICY IF EXISTS "Patients manage own compliance" ON public.compliance_assessments;
CREATE POLICY "Patients manage own compliance" ON public.compliance_assessments 
    FOR ALL USING (EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.id = compliance_assessments.patient_id 
        AND users.auth_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Caregivers view patient compliance" ON public.compliance_assessments;
CREATE POLICY "Caregivers view patient compliance" ON public.compliance_assessments 
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.family_relations fr 
        JOIN public.users u ON u.id = fr.caregiver_id 
        WHERE fr.patient_id = compliance_assessments.patient_id 
        AND fr.status = 'accepted' 
        AND u.auth_id = auth.uid()
    ));
