-- Drop existing tables to ensure a clean reset
DROP TABLE IF EXISTS chat_history CASCADE;
DROP TABLE IF EXISTS ocr_history CASCADE;
DROP TABLE IF EXISTS medication_logs CASCADE;
DROP TABLE IF EXISTS medication_schedules CASCADE;
DROP TABLE IF EXISTS medications CASCADE;
DROP TABLE IF EXISTS family_relations CASCADE;
DROP TABLE IF EXISTS reminder_preferences CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Enable UUID generation (default in Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Roles Table
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Users Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    auth_id UUID UNIQUE, -- Link to Supabase auth.users.id
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role_id INTEGER, -- Legacy/Single-role column (optional)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. User Roles Junction Table (Multi-role support)
CREATE TABLE user_roles (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

-- 4. Profiles Table (Extended user info)
CREATE TABLE profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    phone VARCHAR(20),
    address TEXT,
    birth_date DATE,
    gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'other')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Reminder Preferences
CREATE TABLE reminder_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    channel VARCHAR(20) NOT NULL DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp')),
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Family Relationships (For Caregiver Sync)
CREATE TABLE family_relations (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    caregiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT family_relation_unique UNIQUE (patient_id, caregiver_id),
    CONSTRAINT family_relation_no_self CHECK (patient_id <> caregiver_id)
);

-- 7. Medications Table
CREATE TABLE medications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    dosage VARCHAR(100),
    instructions TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Medication Schedules
CREATE TABLE medication_schedules (
    id SERIAL PRIMARY KEY,
    medication_id INTEGER NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
    frequency VARCHAR(100),
    time_slots TEXT,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Medication Logs
CREATE TABLE medication_logs (
    id SERIAL PRIMARY KEY,
    medication_id INTEGER NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
    schedule_id INTEGER REFERENCES medication_schedules(id) ON DELETE SET NULL,
    taken_at TIMESTAMPTZ,
    status VARCHAR(50) DEFAULT 'taken' CHECK (status IN ('taken', 'missed', 'skipped')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. OCR History
CREATE TABLE ocr_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    extracted_text TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Chatbot History
CREATE TABLE chat_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    sender VARCHAR(50) NOT NULL CHECK (sender IN ('user', 'ai')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TRIGGERS & FUNCTIONS --

-- Function to handle new user registration from Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_user_id INTEGER;
    role_name TEXT;
    target_role_id INTEGER;
BEGIN
    -- 1. Extract metadata
    role_name := COALESCE(new.raw_user_meta_data->>'role', 'patient');
    
    -- Map role name to role_id
    SELECT id INTO target_role_id FROM public.roles WHERE name = role_name;
    IF target_role_id IS NULL THEN
        target_role_id := 2; -- Default to patient
    END IF;

    -- 2. Insert into public.users
    INSERT INTO public.users (auth_id, name, email, created_at, updated_at)
    VALUES (
        new.id, 
        COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)), 
        new.email,
        new.created_at,
        new.created_at
    )
    RETURNING id INTO new_user_id;

    -- 3. Insert into public.user_roles
    INSERT INTO user_roles (user_id, role_id)
    VALUES (new_user_id, target_role_id);

    -- 4. Insert into public.profiles
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

-- Re-create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
