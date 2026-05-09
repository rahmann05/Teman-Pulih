-- Enable RLS for all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ocr_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- 1. Users Policies
DROP POLICY IF EXISTS "Users can view their own data" ON users;
CREATE POLICY "Users can view their own data" ON users FOR SELECT USING (auth.uid() = auth_id);
DROP POLICY IF EXISTS "Users can insert their own data" ON users;
CREATE POLICY "Users can insert their own data" ON users FOR INSERT WITH CHECK (auth.uid() = auth_id);
DROP POLICY IF EXISTS "Users can update their own data" ON users;
CREATE POLICY "Users can update their own data" ON users FOR UPDATE USING (auth.uid() = auth_id);

-- 2. Profiles Policies
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE users.id = profiles.user_id AND users.auth_id = auth.uid()));
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.id = profiles.user_id AND users.auth_id = auth.uid()));
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (EXISTS (SELECT 1 FROM users WHERE users.id = profiles.user_id AND users.auth_id = auth.uid()));

-- 2a. Reminder Preferences Policies
DROP POLICY IF EXISTS "Users can view their own reminder preferences" ON reminder_preferences;
CREATE POLICY "Users can view their own reminder preferences" ON reminder_preferences FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE users.id = reminder_preferences.user_id AND users.auth_id = auth.uid()));
DROP POLICY IF EXISTS "Users can manage their own reminder preferences" ON reminder_preferences;
CREATE POLICY "Users can manage their own reminder preferences" ON reminder_preferences FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE users.id = reminder_preferences.user_id AND users.auth_id = auth.uid()));

-- 3. Medications Policies
DROP POLICY IF EXISTS "Users can view their own medications" ON medications;
CREATE POLICY "Users can view their own medications" ON medications FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE users.id = medications.user_id AND users.auth_id = auth.uid()));
DROP POLICY IF EXISTS "Users can insert their own medications" ON medications;
CREATE POLICY "Users can insert their own medications" ON medications FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.id = medications.user_id AND users.auth_id = auth.uid()));
DROP POLICY IF EXISTS "Users can update their own medications" ON medications;
CREATE POLICY "Users can update their own medications" ON medications FOR UPDATE USING (EXISTS (SELECT 1 FROM users WHERE users.id = medications.user_id AND users.auth_id = auth.uid()));
DROP POLICY IF EXISTS "Users can delete their own medications" ON medications;
CREATE POLICY "Users can delete their own medications" ON medications FOR DELETE USING (EXISTS (SELECT 1 FROM users WHERE users.id = medications.user_id AND users.auth_id = auth.uid()));

-- 4. Medication Schedules Policies
DROP POLICY IF EXISTS "Users can view schedules for their medications" ON medication_schedules;
CREATE POLICY "Users can view schedules for their medications" ON medication_schedules FOR SELECT USING (EXISTS (SELECT 1 FROM medications JOIN users ON medications.user_id = users.id WHERE medications.id = medication_schedules.medication_id AND users.auth_id = auth.uid()));
DROP POLICY IF EXISTS "Users can manage schedules for their medications" ON medication_schedules;
CREATE POLICY "Users can manage schedules for their medications" ON medication_schedules FOR ALL USING (EXISTS (SELECT 1 FROM medications JOIN users ON medications.user_id = users.id WHERE medications.id = medication_schedules.medication_id AND users.auth_id = auth.uid()));

-- 5. Medication Logs Policies
DROP POLICY IF EXISTS "Users can view their medication logs" ON medication_logs;
CREATE POLICY "Users can view their medication logs" ON medication_logs FOR SELECT USING (EXISTS (SELECT 1 FROM medications JOIN users ON medications.user_id = users.id WHERE medications.id = medication_logs.medication_id AND users.auth_id = auth.uid()));
DROP POLICY IF EXISTS "Users can manage their medication logs" ON medication_logs;
CREATE POLICY "Users can manage their medication logs" ON medication_logs FOR ALL USING (EXISTS (SELECT 1 FROM medications JOIN users ON medications.user_id = users.id WHERE medications.id = medication_logs.medication_id AND users.auth_id = auth.uid()));

-- 6. Family Relations Policies
DROP POLICY IF EXISTS "Users can view their family relations" ON family_relations;
CREATE POLICY "Users can view their family relations" ON family_relations FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE (users.id = family_relations.patient_id OR users.id = family_relations.caregiver_id) AND users.auth_id = auth.uid()));
DROP POLICY IF EXISTS "Users can manage their family relations" ON family_relations;
CREATE POLICY "Users can manage their family relations" ON family_relations FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE (users.id = family_relations.patient_id OR users.id = family_relations.caregiver_id) AND users.auth_id = auth.uid()));

-- 7. OCR History Policies
DROP POLICY IF EXISTS "Users can view their OCR history" ON ocr_history;
CREATE POLICY "Users can view their OCR history" ON ocr_history FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE users.id = ocr_history.user_id AND users.auth_id = auth.uid()));
DROP POLICY IF EXISTS "Users can manage their OCR history" ON ocr_history;
CREATE POLICY "Users can manage their OCR history" ON ocr_history FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE users.id = ocr_history.user_id AND users.auth_id = auth.uid()));

-- 8. Chat History Policies
DROP POLICY IF EXISTS "Users can view their chat history" ON chat_history;
CREATE POLICY "Users can view their chat history" ON chat_history FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE users.id = chat_history.user_id AND users.auth_id = auth.uid()));
DROP POLICY IF EXISTS "Users can manage their chat history" ON chat_history;
CREATE POLICY "Users can manage their chat history" ON chat_history FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE users.id = chat_history.user_id AND users.auth_id = auth.uid()));

-- 9. User Roles Policies
DROP POLICY IF EXISTS "Users can view their own roles" ON user_roles;
CREATE POLICY "Users can view their own roles" ON user_roles FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE users.id = user_roles.user_id AND users.auth_id = auth.uid()));
