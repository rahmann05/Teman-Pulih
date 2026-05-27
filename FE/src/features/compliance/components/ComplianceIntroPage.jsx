import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LuActivity, LuFileText, LuShield, LuCheck, LuLock } from 'react-icons/lu';

const ComplianceIntroPage = ({ eligibility, onStart }) => {
    const navigate = useNavigate();
    const { eligible, daysRemaining, lastTestedAt } = eligibility;

    const formattedLastDate = lastTestedAt
        ? new Date(lastTestedAt).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        })
        : '';

    return (
        <div className="compliance-intro">
            <div className="compliance-intro-icon-wrapper">
                <LuActivity size={44} />
            </div>

            <h2 className="compliance-intro-title">AI Analisis Kepatuhan Medis</h2>

            <p className="compliance-intro-subtitle">
                TemanPulih menggunakan model Arificial Intelligence terkalibrasi klinis untuk menganalisis karakteristik Anda terhadap: <strong>Kedisiplinan Obat (Adherence)</strong>, <strong>Perilaku Rutinitas (Behaviour)</strong>, dan <strong>Persepsi Khasiat (Perception)</strong>.
            </p>

            <div className="compliance-intro-features">
                <div className="compliance-intro-feature-card">
                    <div className="compliance-intro-feature-icon">
                        <LuFileText size={22} />
                    </div>
                    <div>
                        <h4 className="compliance-intro-feature-title">Pengisian Cepat ~3 Menit</h4>
                        <p className="compliance-intro-feature-desc">Kuesioner dirancang terarah dengan pertanyaan pilihan ganda yang sangat sederhana.</p>
                    </div>
                </div>

                <div className="compliance-intro-feature-card">
                    <div className="compliance-intro-feature-icon">
                        <LuShield size={22} />
                    </div>
                    <div>
                        <h4 className="compliance-intro-feature-title">Rekomendasi Tindakan Instan</h4>
                        <p className="compliance-intro-feature-desc">Dapatkan rencana intervensi pemulihan, penyesuaian alarm, dan panduan coaching langsung.</p>
                    </div>
                </div>
            </div>

            {eligible ? (
                <div className="compliance-intro-eligibility-container">
                    <div className="compliance-intro-eligibility">
                        <LuCheck size={16} />
                        <span>Anda memenuhi syarat untuk mengisi tes kepatuhan minggu ini.</span>
                    </div>
                    <div className="compliance-intro-actions">
                        <button
                            className="compliance-btn-outline"
                            onClick={() => navigate('/dashboard')}
                        >
                            Kembali
                        </button>
                        <button
                            className="compliance-btn-primary"
                            onClick={onStart}
                        >
                            Mulai Kuesioner
                        </button>
                    </div>
                </div>
            ) : (
                <div className="compliance-intro-eligibility-container">
                    <div className="compliance-intro-eligibility locked">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800 }}>
                            <LuLock size={16} />
                            <span>Kuesioner Sedang Terkunci (Cooldown)</span>
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: 500, display: 'block', textAlign: 'center', opacity: 0.9 }}>
                            Terakhir diisi: <strong>{formattedLastDate}</strong>. Anda dapat melakukan pengujian ulang dalam <strong>{daysRemaining} hari</strong> lagi untuk melacak progress pemulihan harian.
                        </span>
                    </div>
                    <div className="compliance-intro-actions single">
                        <button
                            className="compliance-btn-primary"
                            onClick={() => navigate('/dashboard')}
                        >
                            Kembali ke Dashboard
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ComplianceIntroPage;
