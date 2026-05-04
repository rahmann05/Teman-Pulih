-- Hapus data lama agar pengecekan relasi tidak bentrok jika dijalankan ulang
-- Hati-hati, ini akan MENGHAPUS data yang sudah ada (untuk keperluan testing local)
TRUNCATE TABLE chat_history CASCADE;
TRUNCATE TABLE medication_logs CASCADE;
TRUNCATE TABLE medications CASCADE;
TRUNCATE TABLE family_relations CASCADE;
TRUNCATE TABLE profiles CASCADE;
TRUNCATE TABLE users CASCADE;

-- Insert Data User Dummy (Tabel public.users)
-- PENTING: User ini TIDAK BISA dipakai untuk login via Supabase Auth (karena tidak ada di auth.users).
-- Data ini sekadar mock untuk mengetes Endpoint yang menggunakan UUID. 
-- UUID dummy (bisa juga menggunakan id yang ter-generate otomatis jika dari auth)
DO $$
DECLARE
    patient_id UUID := '11111111-1111-1111-1111-111111111111';
    caregiver_id UUID := '22222222-2222-2222-2222-222222222222';
BEGIN

    -- 1. Insert Users
    INSERT INTO users (id, name, email, role)
    VALUES 
    (patient_id, 'Budi Pasien', 'budi@example.com', 'patient'),
    (caregiver_id, 'Siti Caregiver', 'siti@example.com', 'caregiver');

    -- 2. Insert Profiles
    INSERT INTO profiles (user_id, phone, address, birth_date, gender)
    VALUES
    (patient_id, '081234567890', 'Jl. Merdeka No. 1, Jakarta', '1980-05-15', 'male'),
    (caregiver_id, '089876543210', 'Jl. Merdeka No. 1, Jakarta', '1985-10-20', 'female');

    -- 3. Insert Family Relations
    INSERT INTO family_relations (patient_id, caregiver_id, status)
    VALUES
    (patient_id, caregiver_id, 'accepted');

    -- 4. Insert Medications (Untuk Pasien Budi)
    -- Amoxicillin & Paracetamol
    INSERT INTO medications (id, user_id, name, dosage, frequency, start_date, end_date, instructions)
    VALUES
    ('33333333-3333-3333-3333-333333333333', patient_id, 'Amoxicillin', '500 mg', '3x sehari', CURRENT_DATE, CURRENT_DATE + INTERVAL '5 days', 'Sesudah makan, dihabiskan'),
    ('44444444-4444-4444-4444-444444444444', patient_id, 'Paracetamol', '500 mg', '2x sehari', CURRENT_DATE, CURRENT_DATE + INTERVAL '3 days', 'Bila demam saja');

    -- 5. Insert Medication Logs (History Minum Obat kemarin dan hari ini)
    INSERT INTO medication_logs (medication_id, taken_at, status)
    VALUES
    ('33333333-3333-3333-3333-333333333333', NOW() - INTERVAL '1 day', 'taken'),
    ('33333333-3333-3333-3333-333333333333', NOW(), 'taken'),
    ('44444444-4444-4444-4444-444444444444', NOW() - INTERVAL '1 day', 'skipped');

    -- 6. Insert Chatbot History
    INSERT INTO chat_history (user_id, message, sender, created_at)
    VALUES
    (patient_id, 'Halo, saya lupa apakah Amoxicillin harus dihabiskan?', 'user', NOW() - INTERVAL '2 hours'),
    (patient_id, 'Halo Budi! Ya, antibiotik seperti Amoxicillin harus selalu dihabiskan sesuai resep dokter agar bakteri tidak resisten.', 'ai', NOW() - INTERVAL '1 hours 59 minutes');

END $$;
