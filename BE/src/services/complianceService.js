const db = require('../config/db');
const { resolveTargetPatientId } = require('../helpers/patientAccess');
const { cacheDel } = require('../helpers/cache');
const notificationService = require('./notificationService');
const axios = require('axios');
const { buildIntervention } = require('./interventionEngine');

/**
 * Compliance Service Layer
 */

// Menghitung umur berdasarkan birth_date
const calculateAge = (birthDateString) => {
    if (!birthDateString) return null;
    const today = new Date();
    const birthDate = new Date(birthDateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age.toString();
};

/**
 * Cek eligibility (cooldown 1 minggu)
 */
const checkEligibility = async (user, candidatePatientId) => {
    const { patientId, error } = await resolveTargetPatientId(user, candidatePatientId);
    if (error) throw Object.assign(new Error(error), { statusCode: 403 });

    // Ambal riwayat tes kepatuhan terbaru
    const query = `
        SELECT created_at 
        FROM compliance_assessments 
        WHERE patient_id = $1 
        ORDER BY created_at DESC 
        LIMIT 1
    `;
    const { rows } = await db.query(query, [patientId]);
    
    if (rows.length === 0) {
        return { eligible: true, prefill: await getPrefillData(patientId) };
    }

    const lastCreatedAt = new Date(rows[0].created_at);
    const now = new Date();
    const oneWeekInMs = 7 * 24 * 60 * 60 * 1000;
    const timeDiff = now - lastCreatedAt;

    if (timeDiff < oneWeekInMs) {
        const msRemaining = oneWeekInMs - timeDiff;
        const daysRemaining = Math.ceil(msRemaining / (24 * 60 * 60 * 1000));
        return { 
            eligible: false, 
            daysRemaining, 
            lastTestedAt: lastCreatedAt,
            prefill: await getPrefillData(patientId)
        };
    }

    return { eligible: true, prefill: await getPrefillData(patientId) };
};

/**
 * Mengambil data demografis yang sudah terisi di profil
 */
const getPrefillData = async (patientId) => {
    const query = `
        SELECT gender, birth_date 
        FROM profiles 
        WHERE user_id = $1
    `;
    const { rows } = await db.query(query, [patientId]);
    if (rows.length === 0) return { GENDER: null, AGE: null };

    const profile = rows[0];
    let gender = null;
    if (profile.gender === 'male') gender = 'Male';
    if (profile.gender === 'female') gender = 'Female';

    return {
        GENDER: gender,
        AGE: calculateAge(profile.birth_date)
    };
};

/**
 * Memanggil API Hugging Face Space & Simpan Hasil Kepatuhan
 */
const predictAndSave = async (user, supabase, data) => {
    const { patient_id, formData } = data;
    const { patientId, error } = await resolveTargetPatientId(user, patient_id);
    if (error) throw Object.assign(new Error(error), { statusCode: 403 });

    // 1. Validasi Cooldown
    const eligibility = await checkEligibility(user, patientId);
    if (!eligibility.eligible) {
        throw Object.assign(new Error(`Anda baru saja mengisi tes kepatuhan. Harap tunggu ${eligibility.daysRemaining} hari lagi untuk mengisi ulang.`), { statusCode: 400 });
    }

    // 2. Prefill fallback jika FE tidak mengirimkan GENDER/AGE
    const prefill = eligibility.prefill;
    const finalFormData = { ...formData };
    if (!finalFormData.GENDER && prefill.GENDER) finalFormData.GENDER = prefill.GENDER;
    if (!finalFormData.AGE && prefill.AGE) finalFormData.AGE = prefill.AGE;

    // List 50 field wajib agar tidak kena HTTPValidationError 422 dari HF Space
    const requiredStringFields = [
        'GENDER', 'AGE', 'Marital_Status', 'Religion_Affiliation', 'Educational_Attainment',
        'Occupation', 'Hours_Work_Per_Day', 'Care_Giver', 'Have_Mobile_Phone', 'Receive_Text_Frequency',
        'Answer_Call_Frequency', 'Preferred_Language', 'Drug_Duration', 'Num_Drugs_Prescribed',
        'Num_Tablets_Per_Day', 'When_Take_Drugs', 'Why_Take_Drugs_At_That_Time'
    ];

    const requiredNumericFields = [
        'B1_ChangeMind_Decision', 'B1_ChangeMind_Convince', 'B1_AcceptSuggestion', 'B2_ForgetPlan',
        'B2_ForgetTold', 'B2_MissAppointment', 'B_CauseOfMissing', 'B_ReminderMethod',
        'C1_DrugHelp', 'C1_DrugBurdensome', 'C1_DrugInadequate', 'C2_AwareBeforeDiag',
        'C2_AwareLifestyle', 'C2_AwareProlonged', 'D_ForgetPrescribed', 'D_FailOtherReasons',
        'D_StopIfWorse', 'D_ForgetTravel', 'D_TakeAllYesterday', 'D_StopIfFeelBetter',
        'D_FeelHassled', 'D_DifficultyRemember', 'E_ForgetGeneral', 'E_AwareForgetDetails',
        'E_DangerNoAdvice', 'E_BenefitAlerts', 'E_BenefitPersuasive', 'E_BenefitRiskExpl',
        'E_BenefitGainExpl', 'E_CostBenefitMobile', 'E_AdaptVoiceSMS', 'E_EnableDiscussion',
        'E_PersonalAcceptance'
    ];

    // Validasi keberadaan field dan isi default jika kosong agar API model tidak error
    for (const field of requiredStringFields) {
        if (finalFormData[field] === undefined || finalFormData[field] === null || finalFormData[field] === '') {
            throw Object.assign(new Error(`Field demografis '${field}' wajib diisi.`), { statusCode: 400 });
        }
        finalFormData[field] = finalFormData[field].toString();
    }

    for (const field of requiredNumericFields) {
        if (finalFormData[field] === undefined || finalFormData[field] === null) {
            throw Object.assign(new Error(`Field kuesioner '${field}' wajib diisi.`), { statusCode: 400 });
        }
        finalFormData[field] = Number(finalFormData[field]);
        if (isNaN(finalFormData[field])) {
            throw Object.assign(new Error(`Field '${field}' harus berupa angka numerik.`), { statusCode: 400 });
        }
    }

    // 3. Panggil API HF Space
    let modelResult;
    try {
        console.log('[COMPLIANCE] Mengirim data ke API Hugging Face Space...');
        const response = await axios.post('https://acous-adherence.hf.space/predict', finalFormData, {
            timeout: 10000 // 10 detik timeout
        });
        
        modelResult = response.data;
        console.log('[COMPLIANCE] Hasil prediksi diterima:', modelResult);
    } catch (apiErr) {
        console.error('[COMPLIANCE] Gagal memanggil API Hugging Face:', apiErr.message);
        throw Object.assign(new Error('Gagal memproses analisis kepatuhan menggunakan AI. Hubungi admin atau coba lagi nanti.'), { statusCode: 502 });
    }

    // Ekstrak hasil prediksi
    const { adherence, adherence_score, behaviour, perception } = modelResult;

    if (adherence === undefined || behaviour === undefined || perception === undefined) {
        throw Object.assign(new Error('Format respons API model tidak valid.'), { statusCode: 502 });
    }

    // 4. Simpan ke database compliance_assessments menggunakan Supabase Client / Pool
    const { data: dbData, error: dbError } = await supabase
        .from('compliance_assessments')
        .insert([{
            patient_id: patientId,
            raw_responses: finalFormData,
            adherence_class: adherence,
            adherence_score: adherence_score,
            behaviour_class: behaviour,
            perception_class: perception
        }])
        .select()
        .single();

    if (dbError) throw dbError;

    // Hapus EMR / Dashboard cache
    await cacheDel(`medications:${patientId}`, `emr_profile:patient_${patientId}`);

    // 5. Treatment khusus jika Low Adherence (adherence_class === 0)
    let triggeredIntervention = false;
    if (adherence === 0) {
        triggeredIntervention = true;
        try {
            const patientName = user.name || 'Pasien';
            
            // Ambil daftar caregiver yang terhubung
            const { data: relations } = await supabase
                .from('family_relations')
                .select('caregiver_id')
                .eq('patient_id', patientId)
                .eq('status', 'accepted');

            if (relations && relations.length > 0) {
                const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
                
                for (const rel of relations) {
                    const messageText = `[PERINGATAN KEPATUHAN TEMANPULIH]\n\nPasien Anda, *${patientName}*, terdeteksi memiliki *Tingkat Kepatuhan Rendah (Low Adherence)* berdasarkan analisis kuesioner AI terbaru.\n\nMohon pendampingan lebih ketat dan bantu ingatkan jadwal minum obatnya secara proaktif demi pemulihan optimal.`;
                    
                    // 1. In-app notification
                    await supabase
                        .from('notifications')
                        .insert([{
                            user_id: rel.caregiver_id,
                            title: `Kepatuhan ${patientName} Menurun!`,
                            message: `Pasien ${patientName} terdeteksi memiliki tingkat kepatuhan minum obat yang rendah. Mohon bantu pantau pengobatannya.`,
                            type: 'compliance_alert', // Tipe khusus untuk alerts compliance
                            is_read: false
                        }]);

                    // 2. Kirim WhatsApp Alert
                    try {
                        const contactRes = await db.query(`
                            SELECT u.name, u.email, p.phone 
                            FROM users u 
                            LEFT JOIN profiles p ON u.id = p.user_id 
                            WHERE u.id = $1
                        `, [rel.caregiver_id]);
                        
                        const caregiverContact = contactRes?.rows?.[0];
                        if (caregiverContact) {
                            if (caregiverContact.phone) {
                                await notificationService.sendWhatsApp(caregiverContact.phone, messageText);
                            } else if (caregiverContact.email) {
                                await notificationService.sendEmail(
                                    caregiverContact.email,
                                    `[ALERT KEPATUHAN] ${patientName} Membutuhkan Pendampingan Medis`,
                                    `<h3>Perhatian Kepatuhan Pasien</h3><p>${messageText}</p>`,
                                    messageText
                                );
                            }
                        }
                    } catch (contactErr) {
                        console.error('[Notification Caregiver Contact Error]:', contactErr.message);
                    }
                }
            }
        } catch (notifErr) {
            console.error('[Notification Compliance Alert Error]:', notifErr.message);
        }
    }

    return { 
        ...dbData, 
        triggered_intervention: triggeredIntervention,
        intervention: buildIntervention(adherence, behaviour, perception) 
    };
};

/**
 * Mendapatkan riwayat tes kepatuhan pasien
 */
const getHistory = async (user, candidatePatientId) => {
    const { patientId, error } = await resolveTargetPatientId(user, candidatePatientId);
    if (error) throw Object.assign(new Error(error), { statusCode: 403 });

    const query = `
        SELECT * FROM compliance_assessments 
        WHERE patient_id = $1 
        ORDER BY created_at DESC
    `;
    const { rows } = await db.query(query, [patientId]);
    return rows.map(row => ({
        ...row,
        intervention: buildIntervention(row.adherence_class, row.behaviour_class, row.perception_class)
    }));
};

/**
 * Mendapatkan tes kepatuhan terbaru beserta rekomendasi
 */
const getLatestAssessment = async (user, candidatePatientId) => {
    const { patientId, error } = await resolveTargetPatientId(user, candidatePatientId);
    if (error) throw Object.assign(new Error(error), { statusCode: 403 });

    const query = `
        SELECT * FROM compliance_assessments 
        WHERE patient_id = $1 
        ORDER BY created_at DESC 
        LIMIT 1
    `;
    const { rows } = await db.query(query, [patientId]);
    if (rows.length === 0) return null;

    const row = rows[0];
    return {
        ...row,
        intervention: buildIntervention(row.adherence_class, row.behaviour_class, row.perception_class)
    };
};

// buildIntervention didelegasikan ke modul interventionEngine.js (SRP)
// Lihat: src/services/interventionEngine.js

module.exports = {
    checkEligibility,
    predictAndSave,
    getHistory,
    getLatestAssessment
};
