-- Enable RLS for all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ocr_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;

-- 1. Users Policies
CREATE POLICY "Users can view their own data" ON users FOR SELECT USING (auth.uid() = auth_id);
CREATE POLICY "Users can update their own data" ON users FOR UPDATE USING (auth.uid() = auth_id);

-- 2. Profiles Policies
CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE users.id = profiles.user_id AND users.auth_id = auth.uid()));
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (EXISTS (SELECT 1 FROM users WHERE users.id = profiles.user_id AND users.auth_id = auth.uid()));

-- 3. Medications Policies
CREATE POLICY "Users can view their own medications" ON medications FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE users.id = medications.user_id AND users.auth_id = auth.uid()));
CREATE POLICY "Users can insert their own medications" ON medications FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.id = medications.user_id AND users.auth_id = auth.uid()));
CREATE POLICY "Users can update their own medications" ON medications FOR UPDATE USING (EXISTS (SELECT 1 FROM users WHERE users.id = medications.user_id AND users.auth_id = auth.uid()));
CREATE POLICY "Users can delete their own medications" ON medications FOR DELETE USING (EXISTS (SELECT 1 FROM users WHERE users.id = medications.user_id AND users.auth_id = auth.uid()));

-- 4. Medication Schedules Policies
CREATE POLICY "Users can view schedules for their medications" ON medication_schedules FOR SELECT USING (EXISTS (SELECT 1 FROM medications JOIN users ON medications.user_id = users.id WHERE medications.id = medication_schedules.medication_id AND users.auth_id = auth.uid()));
CREATE POLICY "Users can manage schedules for their medications" ON medication_schedules FOR ALL USING (EXISTS (SELECT 1 FROM medications JOIN users ON medications.user_id = users.id WHERE medications.id = medication_schedules.medication_id AND users.auth_id = auth.uid()));

-- 5. Medication Logs Policies
CREATE POLICY "Users can view their medication logs" ON medication_logs FOR SELECT USING (EXISTS (SELECT 1 FROM medications JOIN users ON medications.user_id = users.id WHERE medications.id = medication_logs.medication_id AND users.auth_id = auth.uid()));
CREATE POLICY "Users can manage their medication logs" ON medication_logs FOR ALL USING (EXISTS (SELECT 1 FROM medications JOIN users ON medications.user_id = users.id WHERE medications.id = medication_logs.medication_id AND users.auth_id = auth.uid()));

-- 6. Family Relations Policies
CREATE POLICY "Users can view their family relations" ON family_relations FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE (users.id = family_relations.patient_id OR users.id = family_relations.caregiver_id) AND users.auth_id = auth.uid()));
CREATE POLICY "Users can manage their family relations" ON family_relations FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE (users.id = family_relations.patient_id OR users.id = family_relations.caregiver_id) AND users.auth_id = auth.uid()));

-- 7. OCR History Policies
CREATE POLICY "Users can view their OCR history" ON ocr_history FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE users.id = ocr_history.user_id AND users.auth_id = auth.uid()));
CREATE POLICY "Users can manage their OCR history" ON ocr_history FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE users.id = ocr_history.user_id AND users.auth_id = auth.uid()));

-- 8. Chat History Policies
CREATE POLICY "Users can view their chat history" ON chat_history FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE users.id = chat_history.user_id AND users.auth_id = auth.uid()));
CREATE POLICY "Users can manage their chat history" ON chat_history FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE users.id = chat_history.user_id AND users.auth_id = auth.uid()));
