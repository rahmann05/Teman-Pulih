import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LuLightbulb, LuClock, LuTarget } from 'react-icons/lu';

const InterventionCoachingCard = () => {
    const navigate = useNavigate();

    return (
        <div className="bento-card" style={{
            background: 'linear-gradient(135deg, #FFF5F2, #FFF)',
            borderRadius: '24px',
            border: '1.5px solid var(--accent-light)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: '0 8px 30px rgba(196, 101, 58, 0.06)'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                <div>
                    <span style={{
                        background: 'rgba(196, 101, 58, 0.1)',
                        color: 'var(--accent)',
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '4px 12px',
                        borderRadius: 'var(--radius-full)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                    }}>
                        <LuTarget size={12} />
                        Program Pemulihan Kepatuhan
                    </span>
                    <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text)', marginTop: '8px', letterSpacing: '-0.01em' }}>
                        Yuk Bangun Kebiasaan Sehat Bersama TemanPulih!
                    </h3>
                </div>
                <div style={{ background: 'var(--accent-light)', color: 'var(--accent)', padding: '10px', borderRadius: '16px' }}>
                    <LuLightbulb size={24} />
                </div>
            </div>

            <p style={{ fontSize: '13px', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                Hasil pengujian kepatuhan Anda berada dalam kategori rendah. Jangan khawatir, program ini dirancang untuk mempermudah rutinitas minum obat Anda dengan langkah-langkah praktis dan panduan harian.
            </p>

            <div style={{
                background: '#FFF',
                border: '1px solid rgba(196, 101, 58, 0.08)',
                borderRadius: '16px',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ color: 'var(--accent)' }}>
                        <LuClock size={20} />
                    </div>
                    <div style={{ textAlign: 'left' }}>
                        <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)' }}>
                            Mode Pengingat Ketat (Intensive)
                        </p>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            Aktif otomatis mengirimkan WA & SMS ganda.
                        </p>
                    </div>
                </div>
                <span style={{ color: 'var(--success)', fontWeight: 700, fontSize: '12px' }}>AKTIF</span>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                <button
                    className="btn-primary"
                    style={{
                        flex: 1,
                        minHeight: '40px',
                        padding: '10px 16px',
                        fontSize: '13px',
                        borderRadius: '12px'
                    }}
                    onClick={() => navigate('/compliance/result')}
                >
                    Lihat Rencana Pemulihan
                </button>
                <button
                    className="btn-outline"
                    style={{
                        flex: 1,
                        minHeight: '40px',
                        padding: '10px 16px',
                        fontSize: '13px',
                        borderRadius: '12px'
                    }}
                    onClick={() => navigate('/pelajari')}
                >
                    Tips Edukasi Obat
                </button>
            </div>
        </div>
    );
};

export default InterventionCoachingCard;
