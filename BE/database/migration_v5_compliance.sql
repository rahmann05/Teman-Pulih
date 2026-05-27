-- ============================================================
-- TemanPulih — Migration V5: Compliance Assessments
-- ============================================================

-- 1. Create Compliance Assessments Table
CREATE TABLE IF NOT EXISTS public.compliance_assessments (
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

-- 2. Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_compliance_patient_id ON public.compliance_assessments(patient_id);
CREATE INDEX IF NOT EXISTS idx_compliance_created_at ON public.compliance_assessments(created_at);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.compliance_assessments ENABLE ROW LEVEL SECURITY;

-- 4. Apply RLS Policies
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
