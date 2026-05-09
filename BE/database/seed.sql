-- Hapus data lama agar pengecekan relasi tidak bentrok jika dijalankan ulang
-- Hati-hati, ini akan MENGHAPUS data yang sudah ada (untuk keperluan testing local)
TRUNCATE TABLE chat_history CASCADE;
TRUNCATE TABLE medication_logs CASCADE;
TRUNCATE TABLE medication_schedules CASCADE;
TRUNCATE TABLE medications CASCADE;
TRUNCATE TABLE family_relations CASCADE;
TRUNCATE TABLE reminder_preferences CASCADE;
TRUNCATE TABLE profiles CASCADE;
TRUNCATE TABLE users CASCADE;

-- Insert Data User Dummy (Tabel public.users)
-- PENTING: User ini TIDAK BISA dipakai untuk login via Supabase Auth (karena tidak ada di auth.users).
-- Data ini sekadar mock untuk mengetes Endpoint yang menggunakan UUID. 
-- UUID dummy (bisa juga menggunakan id yang ter-generate otomatis jika dari auth)
DO $$
DECLARE
    patient_id INT := 1;
    caregiver_id INT := 2;
BEGIN

    -- 1. Insert Users
    INSERT INTO users (id, name, email)
    VALUES 
    (patient_id, 'Budi Pasien', 'budi@example.com'),
    (caregiver_id, 'Siti Caregiver', 'siti@example.com');

    -- 2. Insert Profiles
    INSERT INTO profiles (user_id, phone, address, birth_date, gender)
    VALUES
    (patient_id, '081234567890', 'Jl. Merdeka No. 1, Jakarta', '1980-05-15', 'male'),
    (caregiver_id, '089876543210', 'Jl. Merdeka No. 1, Jakarta', '1985-10-20', 'female');

    -- 2a. Insert Reminder Preferences
    INSERT INTO reminder_preferences (user_id, channel, enabled)
    VALUES
    (patient_id, 'whatsapp', TRUE),
    (caregiver_id, 'whatsapp', TRUE);

    -- 3. Insert Family Relations
    INSERT INTO family_relations (patient_id, caregiver_id, status)
    VALUES
    (patient_id, caregiver_id, 'accepted');

    -- 4. Insert Medications (Untuk Pasien Budi)
    -- Amoxicillin & Paracetamol
    INSERT INTO medications (id, user_id, name, dosage, instructions)
    VALUES
    (1, patient_id, 'Amoxicillin', '500 mg', 'Sesudah makan, dihabiskan'),
    (2, patient_id, 'Paracetamol', '500 mg', 'Bila demam saja');

    -- 4a. Insert Medication Schedules
    INSERT INTO medication_schedules (id, medication_id, frequency, time_slots, start_date, end_date)
    VALUES
    (1, 1, '3x sehari', '08:00,13:00,20:00', CURRENT_DATE, CURRENT_DATE + INTERVAL '5 days'),
    (2, 2, '2x sehari', '08:00,20:00', CURRENT_DATE, CURRENT_DATE + INTERVAL '3 days');

    -- 5. Insert Medication Logs (History Minum Obat kemarin dan hari ini)
    INSERT INTO medication_logs (medication_id, schedule_id, taken_at, status)
    VALUES
    (1, 1, NOW() - INTERVAL '1 day', 'taken'),
    (1, 1, NOW(), 'taken'),
    (2, 2, NOW() - INTERVAL '1 day', 'skipped');

    -- 6. Insert Chatbot History
    INSERT INTO chat_history (user_id, message, sender, created_at)
    VALUES
    (patient_id, 'Halo, saya lupa apakah Amoxicillin harus dihabiskan?', 'user', NOW() - INTERVAL '2 hours'),
    (patient_id, 'Halo Budi! Ya, antibiotik seperti Amoxicillin harus selalu dihabiskan sesuai resep dokter agar bakteri tidak resisten.', 'ai', NOW() - INTERVAL '1 hours 59 minutes');

END $$;
