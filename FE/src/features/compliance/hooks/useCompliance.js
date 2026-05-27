import { useState, useEffect, useCallback } from 'react';
import * as complianceService from '../services/complianceService';

const INITIAL_FORM_DATA = {
    // Step 1: Demographics (Strings)
    GENDER: '',
    AGE: '',
    Marital_Status: '',
    Religion_Affiliation: '',
    Educational_Attainment: '',
    Occupation: '',
    Hours_Work_Per_Day: '8',
    Care_Giver: 'No',
    Have_Mobile_Phone: 'Yes',
    Receive_Text_Frequency: 'Daily',
    Answer_Call_Frequency: 'Daily',
    Preferred_Language: 'Indonesian',

    // Step 2: Medication Info (Strings)
    Drug_Duration: 'Less than 1 month',
    Num_Drugs_Prescribed: '1',
    Num_Tablets_Per_Day: '1',
    When_Take_Drugs: 'Morning',
    Why_Take_Drugs_At_That_Time: 'Prescribed by doctor',

    // Step 3: Behaviour (Numbers 1-5)
    B1_ChangeMind_Decision: 3,
    B1_ChangeMind_Convince: 3,
    B1_AcceptSuggestion: 3,
    B2_ForgetPlan: 3,
    B2_ForgetTold: 3,
    B2_MissAppointment: 3,
    B_CauseOfMissing: 3,
    B_ReminderMethod: 3,

    // Step 4: Perception (Numbers 1-5)
    C1_DrugHelp: 3,
    C1_DrugBurdensome: 3,
    C1_DrugInadequate: 3,
    C2_AwareBeforeDiag: 3,
    C2_AwareLifestyle: 3,
    C2_AwareProlonged: 3,

    // Step 5: Difficulty (Numbers 1-5)
    D_ForgetPrescribed: 3,
    D_FailOtherReasons: 3,
    D_StopIfWorse: 3,
    D_ForgetTravel: 3,
    D_TakeAllYesterday: 3,
    D_StopIfFeelBetter: 3,
    D_FeelHassled: 3,
    D_DifficultyRemember: 3,

    // Step 6: Technology (Numbers 1-5)
    E_ForgetGeneral: 3,
    E_AwareForgetDetails: 3,
    E_DangerNoAdvice: 3,
    E_BenefitAlerts: 3,
    E_BenefitPersuasive: 3,
    E_BenefitRiskExpl: 3,
    E_BenefitGainExpl: 3,
    E_CostBenefitMobile: 3,
    E_AdaptVoiceSMS: 3,
    E_EnableDiscussion: 3,
    E_PersonalAcceptance: 3
};

export const useCompliance = (patientId = null) => {
    const [step, setStep] = useState(0); // 0: Intro, 1-6: Form, 7: Confirm
    const [eligibility, setEligibility] = useState({ eligible: true, prefill: {} });
    const [formData, setFormData] = useState(INITIAL_FORM_DATA);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [result, setResult] = useState(null);

    // Muat eligibility & prefill data saat render pertama
    const loadEligibility = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await complianceService.getEligibility(patientId);
            const eligibilityData = res.data.data;
            setEligibility(eligibilityData);

            // Terapkan prefill data jika tersedia
            if (eligibilityData.prefill) {
                setFormData(prev => ({
                    ...prev,
                    GENDER: eligibilityData.prefill.GENDER || prev.GENDER,
                    AGE: eligibilityData.prefill.AGE || prev.AGE
                }));
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Gagal memuat status kuesioner.');
        } finally {
            setLoading(false);
        }
    }, [patientId]);

    useEffect(() => {
        loadEligibility();
    }, [loadEligibility]);

    // Handle input perubahan form data
    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    // Langkah navigasi
    const nextStep = () => {
        if (validateStep(step)) {
            setStep(prev => prev + 1);
        }
    };

    const prevStep = () => {
        setStep(prev => Math.max(0, prev - 1));
    };

    // Validasi input tiap langkah
    const validateStep = (currentStep) => {
        setError(null);
        if (currentStep === 1) {
            const requiredFields = ['GENDER', 'AGE', 'Marital_Status', 'Religion_Affiliation', 'Educational_Attainment', 'Occupation'];
            for (const f of requiredFields) {
                if (!formData[f]) {
                    setError('Harap lengkapi seluruh profil demografis Anda.');
                    return false;
                }
            }
            if (isNaN(Number(formData.AGE)) || Number(formData.AGE) <= 0) {
                setError('Umur harus berupa angka positif.');
                return false;
            }
        }
        return true;
    };

    // Submit ke backend
    const submitForm = async () => {
        try {
            setSubmitting(true);
            setError(null);
            const res = await complianceService.submitAssessment({
                patient_id: patientId,
                formData
            });
            setResult(res.data.data);
            setStep(8); // Step 8: Success / Result Screen
        } catch (err) {
            setError(err.response?.data?.error || 'Gagal memproses kuesioner kepatuhan.');
        } finally {
            setSubmitting(false);
        }
    };

    const resetQuestionnaire = () => {
        setStep(0);
        setResult(null);
        setFormData({
            ...INITIAL_FORM_DATA,
            GENDER: eligibility.prefill?.GENDER || '',
            AGE: eligibility.prefill?.AGE || ''
        });
        loadEligibility();
    };

    return {
        step,
        setStep,
        eligibility,
        formData,
        loading,
        submitting,
        error,
        result,
        handleInputChange,
        nextStep,
        prevStep,
        submitForm,
        resetQuestionnaire
    };
};
