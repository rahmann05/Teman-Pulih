import React from 'react';
import DashboardLayout from '@/shared/layouts/DashboardLayout';
import { useCompliance } from '../hooks/useCompliance';
import ComplianceIntroPage from '../components/ComplianceIntroPage';
import ScaleQuestion from '../components/ScaleQuestion';
import ChoiceQuestion from '../components/ChoiceQuestion';
import { useNavigate } from 'react-router-dom';
import { LuClipboardList, LuShield, LuTriangleAlert } from 'react-icons/lu';
import '../compliance.css';

const DEMOGRAPHIC_OPTIONS = {
    GENDER: [
        { value: 'Male', label: 'Laki-laki' },
        { value: 'Female', label: 'Perempuan' }
    ],
    Marital_Status: [
        { value: 'Single', label: 'Belum Menikah (Single)' },
        { value: 'Married', label: 'Menikah' },
        { value: 'Widowed', label: 'Ditinggal Mati (Janda/Duda)' },
        { value: 'Divorced', label: 'Cerai Hidup' }
    ],
    Religion_Affiliation: [
        { value: 'Islam', label: 'Islam' },
        { value: 'Christianity', label: 'Kristen Protestan' },
        { value: 'Catholicism', label: 'Katolik' },
        { value: 'Hinduism', label: 'Hindu' },
        { value: 'Buddhism', label: 'Buddha' },
        { value: 'Other', label: 'Lainnya / Konghucu' }
    ],
    Educational_Attainment: [
        { value: 'Primary School', label: 'SD / SMP' },
        { value: 'High School', label: 'SMA / SMK / Sederajat' },
        { value: 'Bachelor Degree', label: 'Sarjana (S1)' },
        { value: 'Master/Doctoral', label: 'Pascasarjana (S2/S3)' },
        { value: 'No Formal Education', label: 'Tidak Ada Pendidikan Formal' }
    ],
    Occupation: [
        { value: 'Self-employed', label: 'Wirausaha / Pekerja Mandiri' },
        { value: 'Government Employee', label: 'PNS / Pegawai BUMN' },
        { value: 'Private Sector', label: 'Karyawan Swasta' },
        { value: 'Unemployed', label: 'Tidak Bekerja' },
        { value: 'Student', label: 'Pelajar / Mahasiswa' },
        { value: 'Retired', label: 'Pensiunan' }
    ],
    Care_Giver: [
        { value: 'Yes', label: 'Ya, Ada Pendamping' },
        { value: 'No', label: 'Tidak Ada' }
    ],
    Have_Mobile_Phone: [
        { value: 'Yes', label: 'Ya, Punya' },
        { value: 'No', label: 'Tidak Punya' }
    ],
    Receive_Text_Frequency: [
        { value: 'Daily', label: 'Setiap Hari' },
        { value: 'Weekly', label: 'Setiap Minggu' },
        { value: 'Rarely', label: 'Jarang' },
        { value: 'Never', label: 'Tidak Pernah' }
    ],
    Answer_Call_Frequency: [
        { value: 'Always', label: 'Selalu' },
        { value: 'Sometimes', label: 'Kadang-kadang' },
        { value: 'Rarely', label: 'Jarang' },
        { value: 'Never', label: 'Tidak Pernah' }
    ],
    Preferred_Language: [
        { value: 'Indonesian', label: 'Bahasa Indonesia' },
        { value: 'English', label: 'Bahasa Inggris' },
        { value: 'Local Language', label: 'Bahasa Daerah' }
    ],
    Drug_Duration: [
        { value: 'Less than 1 month', label: 'Kurang dari 1 bulan' },
        { value: '1-6 months', label: '1 hingga 6 bulan' },
        { value: '6-12 months', label: '6 hingga 12 bulan' },
        { value: 'More than 1 year', label: 'Lebih dari 1 tahun' }
    ],
    When_Take_Drugs: [
        { value: 'Morning', label: 'Pagi Hari' },
        { value: 'Afternoon', label: 'Siang Hari' },
        { value: 'Evening', label: 'Sore Hari' },
        { value: 'Night', label: 'Malam Hari' },
        { value: 'Flexible', label: 'Fleksibel / Sesuai Gejala' }
    ],
    Why_Take_Drugs_At_That_Time: [
        { value: 'Prescribed by doctor', label: 'Ditetapkan oleh resep dokter' },
        { value: 'Easy to remember', label: 'Lebih mudah diingat' },
        { value: 'Matches meals', label: 'Menyesuaikan jadwal makan' },
        { value: 'Matches sleep schedule', label: 'Menyesuaikan jadwal tidur' }
    ]
};

const ComplianceAssessmentPage = () => {
    const {
        step,
        setStep,
        eligibility,
        formData,
        loading,
        submitting,
        error,
        handleInputChange,
        nextStep,
        prevStep,
        submitForm
    } = useCompliance();

    const navigate = useNavigate();

    if (loading) {
        return (
            <DashboardLayout hideNavigation={true}>
                <div className="compliance-container">
                    <div className="compliance-card">
                        <div className="skeleton-block" style={{ height: 40, width: '60%', margin: '0 auto 20px' }} />
                        <div className="skeleton-block" style={{ height: 180, width: '100%', marginBottom: '20px' }} />
                        <div className="skeleton-block" style={{ height: 48, width: '40%', margin: '0 auto' }} />
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    // Step 0: Tampilkan Intro/Eligibility Page
    if (step === 0) {
        return (
            <DashboardLayout hideNavigation={true}>
                <div className="compliance-container">
                    <div className="compliance-card">
                        <ComplianceIntroPage
                            eligibility={eligibility}
                            onStart={() => setStep(1)}
                        />
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    // Hitung progress persentase bar
    const progressPercent = Math.min(100, Math.max(0, ((step - 1) / 6) * 100));

    return (
        <DashboardLayout hideNavigation={true}>
            <div className="compliance-container">
                <div className="compliance-header">
                    <h1>Tes Kepatuhan Medis AI</h1>
                    <p>Langkah {step} dari 7: {getStepTitle(step)}</p>
                </div>

                <div className="compliance-progress-track">
                    <div className="compliance-progress-bar" style={{ width: `${progressPercent}%` }} />
                </div>

                {error && (
                    <div className="compliance-error-banner" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <LuTriangleAlert size={16} />
                        <span>{error}</span>
                    </div>
                )}

                <div className="compliance-card">
                    {/* STEP 1: DEMOGRAFIS */}
                    {step === 1 && (
                        <div className="compliance-form-step">
                            <h3 className="compliance-step-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <LuClipboardList size={20} style={{ color: 'var(--accent)' }} />
                                <span>Data Diri Dasar</span>
                            </h3>
                            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                                Data demografis membantu model mencocokkan profil kepatuhan berdasarkan kelompok latar belakang klinis.
                            </p>

                            <div className="compliance-form-grid">
                                <div className="compliance-form-group">
                                    <ChoiceQuestion
                                        label="Jenis Kelamin"
                                        fieldName="GENDER"
                                        value={formData.GENDER}
                                        onChange={handleInputChange}
                                        options={DEMOGRAPHIC_OPTIONS.GENDER}
                                        disabled={!!eligibility.prefill?.GENDER}
                                    />
                                    {eligibility.prefill?.GENDER && (
                                        <span style={{ fontSize: '11px', color: 'var(--success)' }}>✓ Prefilled dari profil</span>
                                    )}
                                </div>

                                <div className="compliance-form-group">
                                    <label htmlFor="AGE">Umur (Tahun)</label>
                                    <input
                                        id="AGE"
                                        type="number"
                                        className="compliance-input"
                                        placeholder="Contoh: 34"
                                        value={formData.AGE}
                                        onChange={(e) => handleInputChange('AGE', e.target.value)}
                                        disabled={!!eligibility.prefill?.AGE}
                                    />
                                    {eligibility.prefill?.AGE && (
                                        <span style={{ fontSize: '11px', color: 'var(--success)' }}>✓ Prefilled dari profil ({formData.AGE} tahun)</span>
                                    )}
                                </div>

                                <ChoiceQuestion
                                    label="Status Pernikahan"
                                    fieldName="Marital_Status"
                                    value={formData.Marital_Status}
                                    onChange={handleInputChange}
                                    options={DEMOGRAPHIC_OPTIONS.Marital_Status}
                                />

                                <ChoiceQuestion
                                    label="Agama"
                                    fieldName="Religion_Affiliation"
                                    value={formData.Religion_Affiliation}
                                    onChange={handleInputChange}
                                    options={DEMOGRAPHIC_OPTIONS.Religion_Affiliation}
                                />

                                <ChoiceQuestion
                                    label="Pendidikan Terakhir"
                                    fieldName="Educational_Attainment"
                                    value={formData.Educational_Attainment}
                                    onChange={handleInputChange}
                                    options={DEMOGRAPHIC_OPTIONS.Educational_Attainment}
                                />

                                <ChoiceQuestion
                                    label="Pekerjaan Utama"
                                    fieldName="Occupation"
                                    value={formData.Occupation}
                                    onChange={handleInputChange}
                                    options={DEMOGRAPHIC_OPTIONS.Occupation}
                                />
                            </div>
                        </div>
                    )}

                    {/* STEP 2: AKTIVITAS & PENGOBATAN */}
                    {step === 2 && (
                        <div className="compliance-form-step">
                            <h3 className="compliance-step-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <LuClipboardList size={20} style={{ color: 'var(--accent)' }} />
                                <span>Rutinitas & Detail Obat</span>
                            </h3>
                            <div className="compliance-form-grid">
                                <div className="compliance-form-group">
                                    <label htmlFor="Hours_Work_Per_Day">Jam Kerja Per Hari</label>
                                    <input
                                        id="Hours_Work_Per_Day"
                                        type="number"
                                        className="compliance-input"
                                        placeholder="Contoh: 8"
                                        value={formData.Hours_Work_Per_Day}
                                        onChange={(e) => handleInputChange('Hours_Work_Per_Day', e.target.value)}
                                    />
                                </div>

                                <ChoiceQuestion
                                    label="Apakah Memiliki Caregiver/Pendamping?"
                                    fieldName="Care_Giver"
                                    value={formData.Care_Giver}
                                    onChange={handleInputChange}
                                    options={DEMOGRAPHIC_OPTIONS.Care_Giver}
                                />

                                <ChoiceQuestion
                                    label="Apakah Memiliki Handphone Pribadi?"
                                    fieldName="Have_Mobile_Phone"
                                    value={formData.Have_Mobile_Phone}
                                    onChange={handleInputChange}
                                    options={DEMOGRAPHIC_OPTIONS.Have_Mobile_Phone}
                                />

                                <ChoiceQuestion
                                    label="Frekuensi Menerima Pesan SMS/WA"
                                    fieldName="Receive_Text_Frequency"
                                    value={formData.Receive_Text_Frequency}
                                    onChange={handleInputChange}
                                    options={DEMOGRAPHIC_OPTIONS.Receive_Text_Frequency}
                                />

                                <ChoiceQuestion
                                    label="Frekuensi Menjawab Panggilan Telepon"
                                    fieldName="Answer_Call_Frequency"
                                    value={formData.Answer_Call_Frequency}
                                    onChange={handleInputChange}
                                    options={DEMOGRAPHIC_OPTIONS.Answer_Call_Frequency}
                                />

                                <ChoiceQuestion
                                    label="Bahasa Komunikasi Pilihan"
                                    fieldName="Preferred_Language"
                                    value={formData.Preferred_Language}
                                    onChange={handleInputChange}
                                    options={DEMOGRAPHIC_OPTIONS.Preferred_Language}
                                />

                                <ChoiceQuestion
                                    label="Durasi Pengobatan Saat Ini"
                                    fieldName="Drug_Duration"
                                    value={formData.Drug_Duration}
                                    onChange={handleInputChange}
                                    options={DEMOGRAPHIC_OPTIONS.Drug_Duration}
                                />

                                <div className="compliance-form-group">
                                    <label htmlFor="Num_Drugs_Prescribed">Jumlah Jenis Obat Resep</label>
                                    <input
                                        id="Num_Drugs_Prescribed"
                                        type="number"
                                        className="compliance-input"
                                        value={formData.Num_Drugs_Prescribed}
                                        onChange={(e) => handleInputChange('Num_Drugs_Prescribed', e.target.value)}
                                    />
                                </div>

                                <div className="compliance-form-group">
                                    <label htmlFor="Num_Tablets_Per_Day">Jumlah Tablet Diminum Per Hari</label>
                                    <input
                                        id="Num_Tablets_Per_Day"
                                        type="number"
                                        className="compliance-input"
                                        value={formData.Num_Tablets_Per_Day}
                                        onChange={(e) => handleInputChange('Num_Tablets_Per_Day', e.target.value)}
                                    />
                                </div>

                                <ChoiceQuestion
                                    label="Kapan Biasanya Minum Obat?"
                                    fieldName="When_Take_Drugs"
                                    value={formData.When_Take_Drugs}
                                    onChange={handleInputChange}
                                    options={DEMOGRAPHIC_OPTIONS.When_Take_Drugs}
                                />

                                <ChoiceQuestion
                                    label="Alasan Minum Obat di Waktu Tersebut"
                                    fieldName="Why_Take_Drugs_At_That_Time"
                                    value={formData.Why_Take_Drugs_At_That_Time}
                                    onChange={handleInputChange}
                                    options={DEMOGRAPHIC_OPTIONS.Why_Take_Drugs_At_That_Time}
                                />
                            </div>
                        </div>
                    )}

                    {/* STEP 3: BEHAVIOUR (BLOK B) */}
                    {step === 3 && (
                        <div className="compliance-form-step">
                            <h3 className="compliance-step-title">🏃 Pilar Perilaku Harian</h3>
                            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                                Jawab skala 1 (Sangat Sering Lupa/Rendah) sampai 5 (Tidak Pernah/Sangat Baik) berdasarkan kebiasaan Anda seminggu terakhir.
                            </p>

                            <ScaleQuestion
                                questionText="Seberapa sering Anda berubah pikiran terkait pengobatan secara tiba-tiba?"
                                fieldName="B1_ChangeMind_Decision"
                                value={formData.B1_ChangeMind_Decision}
                                onChange={handleInputChange}
                            />

                            <ScaleQuestion
                                questionText="Seberapa sering Anda harus diyakinkan oleh orang lain terlebih dahulu untuk meminum obat?"
                                fieldName="B1_ChangeMind_Convince"
                                value={formData.B1_ChangeMind_Convince}
                                onChange={handleInputChange}
                            />

                            <ScaleQuestion
                                questionText="Seberapa mudah Anda menerima saran pengobatan baru dari dokter Anda?"
                                fieldName="B1_AcceptSuggestion"
                                value={formData.B1_AcceptSuggestion}
                                onChange={handleInputChange}
                            />

                            <ScaleQuestion
                                questionText="Seberapa sering Anda lupa rencana meminum obat yang sudah dibuat?"
                                fieldName="B2_ForgetPlan"
                                value={formData.B2_ForgetPlan}
                                onChange={handleInputChange}
                            />

                            <ScaleQuestion
                                questionText="Seberapa sering Anda lupa petunjuk/instruksi cara minum obat yang telah disampaikan?"
                                fieldName="B2_ForgetTold"
                                value={formData.B2_ForgetTold}
                                onChange={handleInputChange}
                            />

                            <ScaleQuestion
                                questionText="Seberapa sering Anda melewatkan atau lupa jadwal kontrol dokter?"
                                fieldName="B2_MissAppointment"
                                value={formData.B2_MissAppointment}
                                onChange={handleInputChange}
                            />

                            <ScaleQuestion
                                questionText="Seberapa sering Anda melewatkan minum obat karena adanya hambatan mendadak?"
                                fieldName="B_CauseOfMissing"
                                value={formData.B_CauseOfMissing}
                                onChange={handleInputChange}
                            />

                            <ScaleQuestion
                                questionText="Apakah metode pengingat minum obat yang Anda gunakan saat ini berjalan efektif?"
                                fieldName="B_ReminderMethod"
                                value={formData.B_ReminderMethod}
                                onChange={handleInputChange}
                            />
                        </div>
                    )}

                    {/* STEP 4: PERCEPTION (BLOK C) */}
                    {step === 4 && (
                        <div className="compliance-form-step">
                            <h3 className="compliance-step-title">🧠 Pilar Persepsi Manfaat Obat</h3>
                            <ScaleQuestion
                                questionText="Seberapa yakin Anda bahwa obat-obat ini benar-benar menyembuhkan kondisi Anda?"
                                fieldName="C1_DrugHelp"
                                value={formData.C1_DrugHelp}
                                onChange={handleInputChange}
                            />

                            <ScaleQuestion
                                questionText="Seberapa sering minum obat terasa membebani aktivitas harian Anda?"
                                fieldName="C1_DrugBurdensome"
                                value={formData.C1_DrugBurdensome}
                                onChange={handleInputChange}
                            />

                            <ScaleQuestion
                                questionText="Seberapa sering Anda merasa khasiat obat resep yang diminum saat ini kurang memadai?"
                                fieldName="C1_DrugInadequate"
                                value={formData.C1_DrugInadequate}
                                onChange={handleInputChange}
                            />

                            <ScaleQuestion
                                questionText="Apakah Anda sudah memahami bahaya penyakit Anda bahkan sebelum didiagnosis oleh dokter?"
                                fieldName="C2_AwareBeforeDiag"
                                value={formData.C2_AwareBeforeDiag}
                                onChange={handleInputChange}
                            />

                            <ScaleQuestion
                                questionText="Seberapa sadar Anda mengenai pentingnya penyesuaian gaya hidup sehat selama masa pemulihan?"
                                fieldName="C2_AwareLifestyle"
                                value={formData.C2_AwareLifestyle}
                                onChange={handleInputChange}
                            />

                            <ScaleQuestion
                                questionText="Seberapa sadar Anda mengenai bahaya penundaan pengobatan jangka panjang?"
                                fieldName="C2_AwareProlonged"
                                value={formData.C2_AwareProlonged}
                                onChange={handleInputChange}
                            />
                        </div>
                    )}

                    {/* STEP 5: DIFFICULTY (BLOK D) */}
                    {step === 5 && (
                        <div className="compliance-form-step">
                            <h3 className="compliance-step-title">🚧 Pilar Hambatan & Kesulitan</h3>
                            <ScaleQuestion
                                questionText="Apakah Anda pernah lupa meminum obat resep yang sudah disiapkan?"
                                fieldName="D_ForgetPrescribed"
                                value={formData.D_ForgetPrescribed}
                                onChange={handleInputChange}
                            />

                            <ScaleQuestion
                                questionText="Apakah Anda sering gagal meminum obat tepat waktu karena alasan teknis/di luar kendali?"
                                fieldName="D_FailOtherReasons"
                                value={formData.D_FailOtherReasons}
                                onChange={handleInputChange}
                            />

                            <ScaleQuestion
                                questionText="Apakah Anda langsung menghentikan obat jika kondisi tubuh terasa memburuk setelah meminumnya?"
                                fieldName="D_StopIfWorse"
                                value={formData.D_StopIfWorse}
                                onChange={handleInputChange}
                            />

                            <ScaleQuestion
                                questionText="Apakah Anda sering melewatkan minum obat saat sedang bepergian jauh?"
                                fieldName="D_ForgetTravel"
                                value={formData.D_ForgetTravel}
                                onChange={handleInputChange}
                            />

                            <ScaleQuestion
                                questionText="Apakah Anda meminum seluruh dosis obat yang dijadwalkan kemarin tanpa ada yang terlewat?"
                                fieldName="D_TakeAllYesterday"
                                value={formData.D_TakeAllYesterday}
                                onChange={handleInputChange}
                            />

                            <ScaleQuestion
                                questionText="Apakah Anda langsung berhenti minum obat ketika tubuh sudah merasa membaik?"
                                fieldName="D_StopIfFeelBetter"
                                value={formData.D_StopIfFeelBetter}
                                onChange={handleInputChange}
                            />

                            <ScaleQuestion
                                questionText="Seberapa sering minum obat dirasa merepotkan dan mengganggu kenyamanan Anda?"
                                fieldName="D_FeelHassled"
                                value={formData.D_FeelHassled}
                                onChange={handleInputChange}
                            />

                            <ScaleQuestion
                                questionText="Seberapa sulit bagi Anda untuk mengingat minum obat setiap harinya?"
                                fieldName="D_DifficultyRemember"
                                value={formData.D_DifficultyRemember}
                                onChange={handleInputChange}
                            />
                        </div>
                    )}

                    {/* STEP 6: TECHNOLOGY (BLOK E) */}
                    {step === 6 && (
                        <div className="compliance-form-step">
                            <h3 className="compliance-step-title">📱 Pilar Manfaat Teknologi Kesehatan</h3>
                            <ScaleQuestion
                                questionText="Seberapa sering Anda lupa meminum obat secara umum tanpa adanya alat bantu?"
                                fieldName="E_ForgetGeneral"
                                value={formData.E_ForgetGeneral}
                                onChange={handleInputChange}
                            />

                            <ScaleQuestion
                                questionText="Apakah Anda sadar detail petunjuk obat yang sering terlewatkan jika tidak ada pengingat?"
                                fieldName="E_AwareForgetDetails"
                                value={formData.E_AwareForgetDetails}
                                onChange={handleInputChange}
                            />

                            <ScaleQuestion
                                questionText="Seberapa sering Anda merasa khawatir mengenai bahaya melewatkan minum obat tanpa resep dokter?"
                                fieldName="E_DangerNoAdvice"
                                value={formData.E_DangerNoAdvice}
                                onChange={handleInputChange}
                            />

                            <ScaleQuestion
                                questionText="Seberapa berguna notifikasi alarm pengingat otomatis di HP bagi kepatuhan Anda?"
                                fieldName="E_BenefitAlerts"
                                value={formData.E_BenefitAlerts}
                                onChange={handleInputChange}
                            />

                            <ScaleQuestion
                                questionText="Apakah pesan persuasif/motivasi minum obat membantu disiplin Anda?"
                                fieldName="E_BenefitPersuasive"
                                value={formData.E_BenefitPersuasive}
                                onChange={handleInputChange}
                            />

                            <ScaleQuestion
                                questionText="Seberapa bermanfaat penjelasan risiko medis terkait bahaya lalai meminum obat?"
                                fieldName="E_BenefitRiskExpl"
                                value={formData.E_BenefitRiskExpl}
                                onChange={handleInputChange}
                            />

                            <ScaleQuestion
                                questionText="Seberapa bermanfaat penjelasan manfaat positif klinis dari keteraturan minum obat?"
                                fieldName="E_BenefitGainExpl"
                                value={formData.E_BenefitGainExpl}
                                onChange={handleInputChange}
                            />

                            <ScaleQuestion
                                questionText="Apakah pengingat digital (SMS/WA) sebanding dengan biaya internet/pulsa Anda?"
                                fieldName="E_CostBenefitMobile"
                                value={formData.E_CostBenefitMobile}
                                onChange={handleInputChange}
                            />

                            <ScaleQuestion
                                questionText="Seberapa mudah Anda menyesuaikan diri dengan sistem pengingat telepon suara otomatis?"
                                fieldName="E_AdaptVoiceSMS"
                                value={formData.E_AdaptVoiceSMS}
                                onChange={handleInputChange}
                            />

                            <ScaleQuestion
                                questionText="Apakah fitur konsultasi/diskusi dengan keluarga membantu pengobatan Anda?"
                                fieldName="E_EnableDiscussion"
                                value={formData.E_EnableDiscussion}
                                onChange={handleInputChange}
                            />

                            <ScaleQuestion
                                questionText="Secara pribadi, seberapa siap Anda menggunakan aplikasi kesehatan pendamping seperti ini?"
                                fieldName="E_PersonalAcceptance"
                                value={formData.E_PersonalAcceptance}
                                onChange={handleInputChange}
                            />
                        </div>
                    )}

                    {/* STEP 7: CONFIRM SUBMIT */}
                    {step === 7 && (
                        <div className="compliance-intro" style={{ padding: '40px 20px' }}>
                            <div style={{ background: 'var(--accent-tint)', color: 'var(--accent)', padding: '16px', borderRadius: '24px', marginBottom: '16px' }}>
                                <LuShield size={48} />
                            </div>
                            <h2>Konfirmasi Jawaban Kuesioner</h2>
                            <p style={{ color: 'var(--text-secondary)', maxWidth: '480px', lineHeight: 1.6, fontSize: '14px' }}>
                                Semua pertanyaan telah diisi dengan lengkap! Kami siap mengirimkan data Anda ke model kecerdasan buatan klinis untuk melakukan kalkulasi kepatuhan.
                            </p>

                            <div style={{
                                background: 'var(--accent-tint)',
                                border: '1.5px solid var(--accent-light)',
                                padding: '16px',
                                borderRadius: '16px',
                                color: 'var(--accent-dark)',
                                fontWeight: 600,
                                fontSize: '13px',
                                maxWidth: '440px',
                                textAlign: 'left',
                                marginTop: '12px'
                            }}>
                                💡 <strong>Catatan Keamanan:</strong> Analisis diproses secara aman menggunakan enkripsi endpoint dan rahasia data klinis Anda tetap terlindungi di platform TemanPulih.
                            </div>

                            {submitting ? (
                                <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                                    <div className="loader-shimmer" style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--accent)' }} />
                                    <p style={{ fontWeight: 700, color: 'var(--accent)' }}>Memproses Analisis AI...</p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', gap: '12px', width: '100%', maxWidth: '320px', marginTop: '24px' }}>
                                    <button
                                        className="compliance-btn-outline"
                                        style={{ flex: 1 }}
                                        onClick={prevStep}
                                    >
                                        Kembali
                                    </button>
                                    <button
                                        className="compliance-btn-primary"
                                        style={{ flex: 1.5 }}
                                        onClick={submitForm}
                                    >
                                        Analisis AI Sekarang
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* FORM ACTION FOOTER (Bukan intro atau konfirmasi/loading) */}
                    {step > 0 && step < 7 && (
                        <div className="compliance-actions">
                            <button
                                type="button"
                                className="compliance-btn-outline"
                                onClick={prevStep}
                            >
                                Kembali
                            </button>
                            <button
                                type="button"
                                className="compliance-btn-primary"
                                onClick={nextStep}
                            >
                                Lanjut
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
};

// Helper title step
const getStepTitle = (currentStep) => {
    switch (currentStep) {
        case 1: return 'Profil Demografis';
        case 2: return 'Rutinitas Obat';
        case 3: return 'Pilar Perilaku';
        case 4: return 'Pilar Persepsi';
        case 5: return 'Pilar Kesulitan';
        case 6: return 'Pilar Teknologi';
        case 7: return 'Konfirmasi';
        default: return '';
    }
};

export default ComplianceAssessmentPage;
