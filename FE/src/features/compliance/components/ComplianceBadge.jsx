import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { LuCircleCheck, LuShieldAlert } from 'react-icons/lu';
import * as complianceService from '../services/complianceService';
import '../compliance.css';

const ComplianceBadge = ({ patientId = null, viewOnly = false }) => {
    const [latest, setLatest] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const fetchLatest = useCallback(async () => {
        try {
            setLoading(true);
            const res = await complianceService.getLatest(patientId);
            setLatest(res.data.data);
        } catch (err) {
            console.error('[ComplianceBadge] Gagal memuat status kepatuhan:', err.message);
        } finally {
            setLoading(false);
        }
    }, [patientId]);

    useEffect(() => {
        fetchLatest();
    }, [fetchLatest]);

    if (loading) {
        return (
            <div className="compliance-dashboard-badge">
                <div className="skeleton-block" style={{ height: 40, width: '100%' }} />
            </div>
        );
    }

    if (!latest) {
        return (
            <div className="compliance-dashboard-badge">
                <div className="compliance-badge-info">
                    <h4>Analisis Kepatuhan AI</h4>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        Anda belum pernah menguji tingkat kepatuhan minum obat.
                    </p>
                </div>
                {!viewOnly && (
                    <button
                        className="btn-primary"
                        style={{ padding: '8px 16px', minHeight: '36px', fontSize: '13px' }}
                        onClick={() => navigate('/compliance')}
                    >
                        Tes Sekarang
                    </button>
                )}
            </div>
        );
    }

    const isHigh = latest.adherence_class === 1;
    const badgeLabel = isHigh ? 'High (Disiplin)' : 'Low (Butuh Bantuan)';
    const badgeClass = isHigh ? 'success' : 'danger';
    const lastDate = new Date(latest.created_at).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });

    return (
        <div className="compliance-dashboard-badge">
            <div className="compliance-badge-info">
                <h4>Status Kepatuhan AI</h4>
                <div className={`compliance-badge-status ${badgeClass}`} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {isHigh ? (
                        <LuCircleCheck size={18} style={{ color: 'var(--success)' }} />
                    ) : (
                        <LuShieldAlert size={18} style={{ color: 'var(--error)' }} />
                    )}
                    <span>{badgeLabel}</span>
                    <span style={{
                        fontSize: '11px',
                        background: isHigh ? 'var(--success-light)' : 'var(--error-light)',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                        fontWeight: 600,
                        marginLeft: '8px'
                    }}>
                        {(latest.adherence_score * 100).toFixed(0)}% Skor
                    </span>
                </div>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Terakhir diuji: {lastDate}
                </p>
            </div>
            {!viewOnly ? (
                <button
                    className="btn-outline"
                    style={{ padding: '8px 16px', minHeight: '36px', fontSize: '13px' }}
                    onClick={() => navigate('/compliance/result')}
                >
                    Lihat Rencana
                </button>
            ) : (
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
                    Dipantau Caregiver
                </span>
            )}
        </div>
    );
};

export default ComplianceBadge;
