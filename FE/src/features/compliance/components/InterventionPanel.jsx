import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    LuTarget,
    LuBell,
    LuBellRing,
    LuCheckSquare,
    LuAlertTriangle,
    LuLuggage,
    LuBookOpen,
    LuGraduationCap,
    LuFlame,
    LuStar,
    LuBotMessageSquare
} from 'react-icons/lu';

// Peta ikon dan label untuk setiap mode intervensi aktif
const MODE_META = {
    INTENSIVE_REMINDER:     { icon: LuBellRing,       label: 'Pengingat Intensif',        desc: 'Alarm ganda WA + in-app aktif setiap jadwal obat.' },
    STANDARD_REMINDER:      { icon: LuBell,            label: 'Pengingat Standar',          desc: 'Notifikasi normal berjalan sesuai jadwal.' },
    MANDATORY_CHECKIN:      { icon: LuCheckSquare,     label: 'Check-in Dosis Wajib',       desc: 'Setiap notifikasi jadwal memerlukan konfirmasi — tidak bisa dilewati.' },
    PREVENTIVE_ALERT:       { icon: LuAlertTriangle,   label: 'Peringatan Pencegahan',      desc: 'Notifikasi ekstra dikirim jika dosis terlambat lebih dari 1 jam.' },
    TRAVEL_MODE_PROMPT:     { icon: LuLuggage,         label: 'Prompt Obat Cadangan',       desc: 'Aplikasi mengingatkan untuk membawa obat saat bepergian.' },
    FORCE_EDUCATION_GATE:   { icon: LuBookOpen,        label: 'Gerbang Edukasi Wajib',     desc: 'Artikel edukasi bahaya putus obat perlu dikonfirmasi untuk lanjut.' },
    SIDE_EFFECT_COACHING:   { icon: LuGraduationCap,   label: 'Coaching Efek Samping',      desc: 'Konten manajemen efek samping dikirimkan ke notifikasi mingguan.' },
    NEUTRAL_EDUCATION:      { icon: LuBookOpen,        label: 'Rekomendasi Edukasi',        desc: 'Artikel kesehatan relevan dikirimkan secara berkala.' },
    GAMIFICATION_STREAK:    { icon: LuFlame,           label: 'Streak Motivasi Aktif',      desc: 'Setiap dosis diminum tercatat sebagai streak visual di dasbor.' },
    POSITIVE_REINFORCEMENT: { icon: LuStar,            label: 'Pencapaian Kepatuhan',       desc: 'Lencana motivasi diberikan setiap 7 hari patuh berturut-turut.' },
};

const InterventionPanel = ({ intervention }) => {
    const navigate = useNavigate();
    if (!intervention) return null;

    const { priority, message, activeModes = [], actions = [], chatbotContext } = intervention;

    const isPriorityCritical = priority === 'critical';
    const isPriorityModerate = priority === 'moderate';

    const panelBorderColor = isPriorityCritical
        ? 'var(--error)'
        : isPriorityModerate
            ? 'var(--warning, #d97706)'
            : 'var(--success)';

    const headerBg = isPriorityCritical
        ? 'var(--error-light)'
        : isPriorityModerate
            ? 'rgba(217, 119, 6, 0.08)'
            : 'var(--success-light)';

    const headerColor = isPriorityCritical
        ? 'var(--error)'
        : isPriorityModerate
            ? '#b45309'
            : 'var(--success-dark, #166534)';

    return (
        <div className="compliance-intervention-panel" style={{
            border: `1.5px solid ${panelBorderColor}`,
            borderRadius: '20px',
            overflow: 'hidden'
        }}>
            {/* Header */}
            <div style={{
                background: headerBg,
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                borderBottom: `1px solid ${panelBorderColor}22`
            }}>
                <LuTarget size={20} style={{ color: headerColor, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 800, fontSize: '15px', color: headerColor, margin: 0 }}>
                        Rencana Tindakan Pemulihan
                    </p>
                    {isPriorityCritical && (
                        <span style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            background: 'var(--error)',
                            color: '#fff',
                            padding: '2px 10px',
                            borderRadius: 'var(--radius-full)',
                            marginTop: '4px',
                            display: 'inline-block'
                        }}>
                            Mode Intervensi Aktif
                        </span>
                    )}
                </div>
            </div>

            <div style={{ padding: '20px' }}>
                {/* Pesan naratif */}
                <p style={{
                    fontSize: '14px',
                    lineHeight: 1.7,
                    color: 'var(--text)',
                    fontWeight: 500,
                    marginBottom: '20px'
                }}>
                    {message}
                </p>

                {/* Mode aplikasi yang aktif */}
                {activeModes.length > 0 && (
                    <div style={{ marginBottom: '20px' }}>
                        <p style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.06em',
                            color: 'var(--text-muted)',
                            marginBottom: '10px'
                        }}>
                            Mode Aktif di Aplikasi Anda
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {activeModes.map((mode) => {
                                const meta = MODE_META[mode];
                                if (!meta) return null;
                                const Icon = meta.icon;
                                return (
                                    <div key={mode} style={{
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: '10px',
                                        background: 'var(--bg-muted)',
                                        border: '1px solid var(--border-light)',
                                        borderRadius: '12px',
                                        padding: '10px 14px'
                                    }}>
                                        <Icon size={16} style={{ color: headerColor, marginTop: '2px', flexShrink: 0 }} />
                                        <div>
                                            <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', margin: 0 }}>
                                                {meta.label}
                                            </p>
                                            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                                                {meta.desc}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Tindakan sistem */}
                {actions.length > 0 && (
                    <div style={{ marginBottom: '20px' }}>
                        <p style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.06em',
                            color: 'var(--text-muted)',
                            marginBottom: '8px'
                        }}>
                            Tindakan Otomatis Sistem
                        </p>
                        <ul className="compliance-intervention-list">
                            {actions.map((act, i) => (
                                <li key={i}>{act}</li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Tombol Chatbot Adaptif */}
                <div style={{
                    background: 'var(--accent-tint)',
                    border: '1.5px solid var(--accent-light)',
                    borderRadius: '16px',
                    padding: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                        <LuBotMessageSquare size={22} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                        <div>
                            <p style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text)', margin: 0 }}>
                                Asep Sudah Siap Membantu
                            </p>
                            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                                {chatbotContext
                                    ? 'Asep telah membaca kondisi kepatuhan Anda dan siap memberikan panduan yang dipersonalisasi.'
                                    : 'Tanyakan apapun tentang kesehatan dan pengobatan Anda kepada Asep.'
                                }
                            </p>
                        </div>
                    </div>
                    <button
                        className="btn-primary"
                        style={{
                            padding: '10px 18px',
                            minHeight: '40px',
                            fontSize: '13px',
                            borderRadius: '12px',
                            whiteSpace: 'nowrap',
                            flexShrink: 0
                        }}
                        onClick={() => navigate('/chatbot')}
                    >
                        Chat dengan Asep
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InterventionPanel;
