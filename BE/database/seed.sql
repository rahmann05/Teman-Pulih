-- Seed roles first
INSERT INTO roles (id, name, description) VALUES
(1, 'admin', 'Administrator sistem'),
(2, 'patient', 'Pasien yang sedang pemulihan'),
(3, 'caregiver', 'Pendamping pasien')
ON CONFLICT (id) DO NOTHING;

-- Seed initial data (Mock users)
-- PENTING: User ini tidak terhubung ke Supabase Auth secara langsung.
-- Digunakan untuk testing local/simulasi data.
DO $$
DECLARE
    patient_id INT;
    caregiver_id INT;
BEGIN
    -- 1. Insert Users
    INSERT INTO users (name, email) VALUES 
    ('Budi Pasien', 'budi@example.com'),
    ('Siti Caregiver', 'siti@example.com')
    ON CONFLICT (email) DO NOTHING;

    SELECT id INTO patient_id FROM users WHERE email = 'budi@example.com';
    SELECT id INTO caregiver_id FROM users WHERE email = 'siti@example.com';

    -- 2. Insert User Roles
    INSERT INTO user_roles (user_id, role_id) VALUES
    (patient_id, 2),
    (caregiver_id, 3)
    ON CONFLICT DO NOTHING;

    -- 3. Insert Profiles
    INSERT INTO profiles (user_id, phone, address, birth_date, gender) VALUES
    (patient_id, '081234567890', 'Jl. Merdeka No. 1, Jakarta', '1980-05-15', 'male'),
    (caregiver_id, '089876543210', 'Jl. Merdeka No. 1, Jakarta', '1985-10-20', 'female')
    ON CONFLICT DO NOTHING;

    -- 4. Family Relations
    INSERT INTO family_relations (patient_id, caregiver_id, status) VALUES
    (patient_id, caregiver_id, 'accepted')
    ON CONFLICT DO NOTHING;

    -- 5. Medications
    INSERT INTO medications (user_id, name, dosage, instructions) VALUES
    (patient_id, 'Amoxicillin', '500 mg', 'Sesudah makan, dihabiskan'),
    (patient_id, 'Paracetamol', '500 mg', 'Bila demam saja')
    ON CONFLICT DO NOTHING;

END $$;
