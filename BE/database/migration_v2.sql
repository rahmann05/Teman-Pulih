-- ============================================================
-- TemanPulih — Migration V2
-- Tujuan:
--   1. Tambah kolom array untuk chip/tag selector di EMR Form
--   2. Buat tabel illness_history untuk riwayat penyakit terkini
--   3. Pastikan tabel daily_checkins & medical_complaints ada
--   4. Tambah RLS untuk tabel baru
-- Jalankan di Supabase SQL Editor
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- BAGIAN 1: Tambah kolom ke tabel profiles
-- ──────────────────────────────────────────────────────────

-- Kolom untuk chip/tag selector di EMR (array of text)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS chronic_conditions_list TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS allergies_list           TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS past_illnesses_list      TEXT[] DEFAULT '{}';

-- EMR fields yang mungkin belum ada (jika DB lama tidak punya)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS blood_type                  VARCHAR(5),
  ADD COLUMN IF NOT EXISTS height                      NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS weight                      NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS blood_pressure_range        VARCHAR(50),
  ADD COLUMN IF NOT EXISTS allergies                   TEXT,
  ADD COLUMN IF NOT EXISTS chronic_conditions          TEXT,
  ADD COLUMN IF NOT EXISTS past_illnesses              TEXT,
  ADD COLUMN IF NOT EXISTS last_illness                TEXT,
  ADD COLUMN IF NOT EXISTS surgeries_history           TEXT,
  ADD COLUMN IF NOT EXISTS routine_medications         TEXT,
  ADD COLUMN IF NOT EXISTS smoking_habit               BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS alcohol_habit               BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS emergency_contact_name      VARCHAR(255),
  ADD COLUMN IF NOT EXISTS emergency_contact_phone     VARCHAR(30),
  ADD COLUMN IF NOT EXISTS is_emr_completed            BOOLEAN DEFAULT FALSE;


-- ──────────────────────────────────────────────────────────
-- BAGIAN 2: Tabel illness_history (penyakit terkini pasien)
-- ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.illness_history (
    id           SERIAL PRIMARY KEY,
    patient_id   INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    illness_name VARCHAR(255) NOT NULL,
    started_at   DATE NOT NULL DEFAULT CURRENT_DATE,
    recovered_at DATE,                           -- NULL = masih aktif
    is_active    BOOLEAN NOT NULL DEFAULT TRUE,  -- FALSE = sudah sembuh
    notes        TEXT,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_illness_history_patient_id
  ON public.illness_history(patient_id);

CREATE INDEX IF NOT EXISTS idx_illness_history_active
  ON public.illness_history(patient_id, is_active);


-- ──────────────────────────────────────────────────────────
-- BAGIAN 3: Pastikan tabel daily_checkins ada
-- ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.daily_checkins (
    id               SERIAL PRIMARY KEY,
    patient_id       INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    checkin_date     DATE NOT NULL DEFAULT CURRENT_DATE,
    condition_rating SMALLINT NOT NULL CHECK (condition_rating BETWEEN 1 AND 5),
    symptoms_felt    TEXT,
    notes            TEXT,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT daily_checkins_unique UNIQUE (patient_id, checkin_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_checkins_patient_id
  ON public.daily_checkins(patient_id);


-- ──────────────────────────────────────────────────────────
-- BAGIAN 4: Pastikan tabel medical_complaints ada
-- ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.medical_complaints (
    id         SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    symptoms   TEXT NOT NULL,
    severity   VARCHAR(20) NOT NULL CHECK (severity IN ('mild', 'moderate', 'severe')),
    notes      TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medical_complaints_patient_id
  ON public.medical_complaints(patient_id);


-- ──────────────────────────────────────────────────────────
-- BAGIAN 5: Row Level Security untuk tabel baru
-- ──────────────────────────────────────────────────────────

ALTER TABLE public.illness_history    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_checkins     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_complaints ENABLE ROW LEVEL SECURITY;

-- illness_history: pasien kelola sendiri
DROP POLICY IF EXISTS "Patients manage own illness history" ON public.illness_history;
CREATE POLICY "Patients manage own illness history"
  ON public.illness_history FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = illness_history.patient_id
        AND users.auth_id = auth.uid()
    )
  );

-- illness_history: caregiver terhubung bisa baca
DROP POLICY IF EXISTS "Caregivers view patient illness history" ON public.illness_history;
CREATE POLICY "Caregivers view patient illness history"
  ON public.illness_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.family_relations fr
      JOIN public.users u ON u.id = fr.caregiver_id
      WHERE fr.patient_id = illness_history.patient_id
        AND fr.status = 'accepted'
        AND u.auth_id = auth.uid()
    )
  );

-- daily_checkins: pasien kelola sendiri
DROP POLICY IF EXISTS "Patients manage own checkins" ON public.daily_checkins;
CREATE POLICY "Patients manage own checkins"
  ON public.daily_checkins FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = daily_checkins.patient_id
        AND users.auth_id = auth.uid()
    )
  );

-- daily_checkins: caregiver terhubung bisa baca
DROP POLICY IF EXISTS "Caregivers view patient checkins" ON public.daily_checkins;
CREATE POLICY "Caregivers view patient checkins"
  ON public.daily_checkins FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.family_relations fr
      JOIN public.users u ON u.id = fr.caregiver_id
      WHERE fr.patient_id = daily_checkins.patient_id
        AND fr.status = 'accepted'
        AND u.auth_id = auth.uid()
    )
  );

-- medical_complaints: pasien kelola sendiri
DROP POLICY IF EXISTS "Patients manage own complaints" ON public.medical_complaints;
CREATE POLICY "Patients manage own complaints"
  ON public.medical_complaints FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = medical_complaints.patient_id
        AND users.auth_id = auth.uid()
    )
  );

-- medical_complaints: caregiver terhubung bisa baca
DROP POLICY IF EXISTS "Caregivers view patient complaints" ON public.medical_complaints;
CREATE POLICY "Caregivers view patient complaints"
  ON public.medical_complaints FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.family_relations fr
      JOIN public.users u ON u.id = fr.caregiver_id
      WHERE fr.patient_id = medical_complaints.patient_id
        AND fr.status = 'accepted'
        AND u.auth_id = auth.uid()
    )
  );
