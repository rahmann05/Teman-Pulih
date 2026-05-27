import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/shared/layouts/DashboardLayout';
import ComplianceResultCard from '../components/ComplianceResultCard';
import InterventionPanel from '../components/InterventionPanel';
import * as complianceService from '../services/complianceService';
import { LuActivity, LuCircleCheck, LuTriangleAlert, LuInfo } from 'react-icons/lu';
import '../compliance.css';

const ComplianceResultPage = () => {
    const [latest, setLatest] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const loadLatest = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await complianceService.getLatest();
            setLatest(res.data.data);
        } catch (err) {
            setError(err.response?.data?.error || 'Gagal memuat hasil kuesioner kepatuhan.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadLatest();
    }, [loadLatest]);

    if (loading) {
        return (
            <DashboardLayout>
                <div className="compliance-container">
                    <div className="compliance-card">
                        <div className="skeleton-block" style={{ height: 40, width: '50%', margin: '0 auto 20px' }} />
                        <div className="skeleton-block" style={{ height: 120, width: '100%', marginBottom: '20px' }} />
                        <div className="skeleton-block" style={{ height: 240, width: '100%' }} />
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    if (error) {
        return (
            <DashboardLayout>
                <div className="compliance-container">
                    <div className="compliance-card" style={{ textAlign: 'center' }}>
                        <p style={{ color: 'var(--error)', fontWeight: 600 }}>{error}</p>
                        <button
                            className="btn-primary"
                            style={{ marginTop: '16px' }}
                            onClick={() => navigate('/dashboard')}
                        >
                            Kembali ke Dashboard
                        </button>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    if (!latest) {
        return (
            <DashboardLayout>
                <div className="compliance-container">
                    <div className="compliance-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
                        <div style={{ background: 'var(--accent-tint)', color: 'var(--accent)', padding: '16px', borderRadius: '24px', width: 'fit-content', margin: '0 auto 16px' }}>
                            <LuActivity size={48} />
                        </div>
                        <h2 style={{ marginTop: '16px' }}>Belum Ada Hasil Uji Kepatuhan</h2>
                        <p style={{ color: 'var(--text-secondary)', marginTop: '8px', marginBottom: '24px' }}>
                            Anda belum pernah melakukan analisis kepatuhan minum obat dengan model kecerdasan buatan klinis kami.
                        </p>
                        <button
                            className="btn-primary"
                            onClick={() => navigate('/compliance')}
                        >
                            Tes Sekarang
                        </button>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    const { adherence_class, adherence_score, behaviour_class, perception_class, intervention, created_at, global_score, global_class } = latest;
    const isHigh = (global_class !== undefined ? global_class : adherence_class) === 1;
    const displayScore = global_score !== undefined ? global_score : adherence_score;
    const testDate = new Date(created_at).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    // Menghitung tanggal cooldown berikutnya (+7 hari)
    const nextTestDate = new Date(new Date(created_at).getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    return (
        <DashboardLayout>
            <div className="compliance-container">
                <div className="compliance-header">
                    <h1>Hasil Analisis Kepatuhan AI</h1>
                    <p>Diuji pada: {testDate} WIB</p>
                </div>

                <div className="compliance-result-grid">
                    {/* HERO SCORE PANEL */}
                    <div className="compliance-result-hero">
                        <div className="compliance-score-circle" style={{ borderColor: isHigh ? 'var(--success)' : 'var(--error)' }}>
                            <h2 style={{ color: isHigh ? 'var(--success)' : 'var(--error)' }}>
                                {(displayScore * 100).toFixed(0)}%
                            </h2>
                            <span>Skor Kepatuhan Global</span>
                        </div>
                        <h3 style={{ fontSize: '20px', fontWeight: 800, marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {isHigh ? (
                                <LuCircleCheck size={22} style={{ color: 'var(--success)' }} />
                            ) : (
                                <LuTriangleAlert size={22} style={{ color: 'var(--error)' }} />
                            )}
                            <span>Kategori: {isHigh ? 'High (Sangat Patuh)' : 'Low (Butuh Intervensi)'}</span>
                        </h3>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '440px', lineHeight: 1.5 }}>
                            {isHigh
                                ? 'Selamat! Pola konsumsi obat Anda dinilai disiplin dan aman. Tetap pertahankan kedisiplinan minum obat Anda untuk hasil pemulihan optimal.'
                                : 'Perhatian: Kami mendeteksi adanya risiko keterlambatan atau kelupaan minum obat yang tinggi. Aplikasi telah menyesuaikan program pemulihan intervensi ketat untuk Anda.'
                            }
                        </p>
                    </div>

                    {/* THREE DIMENSIONAL STATUS CARDS */}
                    <ComplianceResultCard
                        adherenceClass={adherence_class}
                        behaviourClass={behaviour_class}
                        perceptionClass={perception_class}
                    />

                    {/* CLINICAL INTERVENTION PLAN PANEL */}
                    <InterventionPanel intervention={intervention} />

                    {/* COOLDOWN FOOTNOTE */}
                    <div style={{
                        background: 'var(--bg-muted)',
                        border: '1px solid var(--border-light)',
                        borderRadius: '16px',
                        padding: '16px',
                        textAlign: 'center',
                        color: 'var(--text-secondary)',
                        fontSize: '12px',
                        lineHeight: 1.5,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                    }}>
                        <LuInfo size={16} style={{ color: 'var(--text-muted)' }} />
                        <span>Mekanisme Cooldown Kepatuhan: Untuk menjaga konsistensi data evaluasi, kuesioner berikutnya dapat diisi kembali secara berkala mulai tanggal <strong>{nextTestDate}</strong>.</span>
                    </div>

                    {/* ACTION PANEL */}
                    <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '12px' }}>
                        <button
                            className="btn-outline"
                            onClick={() => navigate('/medications')}
                        >
                            Jadwal Obat Saya
                        </button>
                        <button
                            className="btn-primary"
                            onClick={() => navigate('/dashboard')}
                        >
                            Kembali ke Dashboard
                        </button>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default ComplianceResultPage;
