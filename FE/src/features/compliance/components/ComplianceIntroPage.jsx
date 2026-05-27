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
            <div style={{ background: 'var(--accent-tint)', color: 'var(--accent)', padding: '16px', borderRadius: '24px', marginBottom: '8px' }}>
                <LuActivity size={48} />
            </div>
            <h2>Analisis Kepatuhan Medis AI</h2>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '540px', lineHeight: 1.6, fontSize: '14px' }}>
                TemanPulih menggunakan model kecerdasan buatan (AI) terkalibrasi klinis untuk menganalisis 3 pilar kepatuhan Anda: **Kedisiplinan Obat (Adherence)**, **Perilaku Rutinitas (Behaviour)**, dan **Persepsi Khasiat (Perception)**.
            </p>

            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr',
                gap: '16px',
                width: '100%',
                maxWidth: '560px',
                textAlign: 'left',
                margin: '12px 0'
            }}>
                <div style={{ display: 'flex', gap: '12px', background: 'var(--bg-muted)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border-light)', alignItems: 'center' }}>
                    <div style={{ color: 'var(--accent)' }}>
                        <LuFileText size={24} />
                    </div>
                    <div>
                        <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>Pengisian Cepat ~3 Menit</p>
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Kuesioner dirancang terarah dengan pertanyaan pilihan ganda yang sangat sederhana.</p>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', background: 'var(--bg-muted)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border-light)', alignItems: 'center' }}>
                    <div style={{ color: 'var(--accent)' }}>
                        <LuShield size={24} />
                    </div>
                    <div>
                        <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>Rekomendasi Tindakan Instan</p>
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Dapatkan rencana intervensi pemulihan, penyesuaian alarm, dan panduan coaching langsung.</p>
                    </div>
                </div>
            </div>

            {eligible ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', width: '100%' }}>
                    <div className="compliance-intro-meta" style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                        <LuCheck size={16} />
                        <span>Anda memenuhi syarat untuk mengisi tes kepatuhan minggu ini.</span>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', width: '100%', maxWidth: '320px', marginTop: '12px' }}>
                        <button
                            className="btn-outline"
                            style={{ flex: 1 }}
                            onClick={() => navigate('/dashboard')}
                        >
                            Kembali
                        </button>
                        <button
                            className="btn-primary"
                            style={{ flex: 1.5 }}
                            onClick={onStart}
                        >
                            Mulai Kuesioner
                        </button>
                    </div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', width: '100%' }}>
                    <div className="compliance-intro-meta locked" style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
                            <LuLock size={16} />
                            <span>Kuesioner Sedang Terkunci (Cooldown)</span>
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: 400, display: 'block', textAlign: 'center' }}>
                            Terakhir diisi: <strong>{formattedLastDate}</strong>. Anda dapat melakukan pengujian ulang dalam <strong>{daysRemaining} hari</strong> lagi untuk melacak progress pemulihan harian.
                        </span>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', width: '100%', maxWidth: '320px', marginTop: '12px' }}>
                        <button
                            className="btn-primary"
                            style={{ flex: 1 }}
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
