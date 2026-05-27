import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import {
  LuTriangleAlert, LuCircleCheck, LuChevronLeft, LuChevronRight,
  LuActivity, LuPill, LuInfo,
} from 'react-icons/lu';
import heroImg from '@/assets/images/hero-recovery.webp';
import '@/features/dashboard/dashboard.css';
import '@/features/dashboard/caregiver-dashboard.css';

const TriageHeroCard = ({
  status,
  message,
  acceptedPatients = [],
  activePatientId,
  activePatientName,
  activePatientProfile,
  switchPatient,
  activeIllnesses = [],
}) => {
  const isAlert = status === 'alert';
  const containerRef = useRef(null);
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start']
  });

  const imgY = useTransform(scrollYProgress, [0, 1], ['-22%', '22%']);

  const handlePrev = (e) => {
    e.stopPropagation();
    if (acceptedPatients.length <= 1) return;
    const currentIndex = acceptedPatients.findIndex(p => p.id === activePatientId);
    const prevIndex = (currentIndex - 1 + acceptedPatients.length) % acceptedPatients.length;
    switchPatient(acceptedPatients[prevIndex].id);
  };

  const handleNext = (e) => {
    e.stopPropagation();
    if (acceptedPatients.length <= 1) return;
    const currentIndex = acceptedPatients.findIndex(p => p.id === activePatientId);
    const nextIndex = (currentIndex + 1) % acceptedPatients.length;
    switchPatient(acceptedPatients[nextIndex].id);
  };

  const getAge = (birthDateStr) => {
    if (!birthDateStr) return '';
    const birthDate = new Date(birthDateStr);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return `${age} Tahun`;
  };

  const getGenderLabel = (gender) => {
    if (!gender) return '';
    const val = gender.toLowerCase();
    if (val === 'male' || val === 'l') return 'Laki-laki';
    if (val === 'female' || val === 'p') return 'Perempuan';
    return gender;
  };

  const profileData = activePatientProfile?.profile || {};
  const age = getAge(profileData.birth_date);
  const gender = getGenderLabel(profileData.gender);
  const subtitleParts = [age, gender].filter(Boolean);
  const subtitle = subtitleParts.join(' • ') || 'Detail profil belum lengkap';

  const hasIllnesses = activeIllnesses.length > 0;

  return (
    <div ref={containerRef} className="split-bento-hero" data-testid="triage-hero-card">
      
      {/* Left Glass Content Pane */}
      <div className="hero-glass-content-pane">
        
        {/* Header Badge */}
        <div className="hero-content-header">
          <div className="hero-badge-pill" style={{ 
            color: isAlert ? '#C62828' : 'var(--accent)',
            background: isAlert ? 'rgba(198, 40, 40, 0.1)' : 'rgba(var(--accent-rgb), 0.1)' 
          }}>
            {isAlert ? <LuTriangleAlert size={14} /> : <LuCircleCheck size={14} />}
            <span>{isAlert ? 'BUTUH PERHATIAN' : 'STATUS TERKINI: AMAN'}</span>
          </div>
          <span 
            className="hero-status-dot" 
            style={{ 
              backgroundColor: isAlert ? '#C62828' : '#2E7D32',
              boxShadow: isAlert ? '0 0 10px rgba(198, 40, 40, 0.4)' : '0 0 10px rgba(46, 125, 50, 0.4)'
            }}
          />
        </div>
        
        {/* Switcher & Name */}
        <div className="hero-main-typography" style={{ marginBottom: 0 }}>
          <div className="patient-switcher-container" style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            gap: '16px', 
            margin: '12px 0 20px 0' 
          }}>
            {acceptedPatients.length > 1 && (
              <button 
                className="switcher-btn-circular" 
                onClick={handlePrev} 
                aria-label="Pasien Sebelumnya"
                title="Pasien Sebelumnya"
                type="button"
              >
                <LuChevronLeft size={20} />
              </button>
            )}

            <div className="patient-info-display" style={{ flex: 1, textAlign: acceptedPatients.length > 1 ? 'center' : 'left' }}>
              <h2 className="hero-giant-time" style={{ 
                fontSize: 'clamp(28px, 5vw, 44px)', 
                margin: 0, 
                lineHeight: 1.1,
                color: 'var(--text)'
              }}>
                {activePatientName || 'Tidak Ada Pasien'}
              </h2>
              <p className="hero-med-desc" style={{ 
                margin: '6px 0 0 0', 
                fontWeight: '700', 
                color: 'var(--accent)',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                fontSize: '12px'
              }}>
                {subtitle}
              </p>
            </div>

            {acceptedPatients.length > 1 && (
              <button 
                className="switcher-btn-circular" 
                onClick={handleNext} 
                aria-label="Pasien Selanjutnya"
                title="Pasien Selanjutnya"
                type="button"
              >
                <LuChevronRight size={20} />
              </button>
            )}
          </div>
          
          {/* Triage Health Alert Description Box */}
          <div className="triage-status-text-box" style={{
            background: isAlert ? 'rgba(198, 40, 40, 0.04)' : 'rgba(var(--accent-rgb), 0.03)',
            border: `1px solid ${isAlert ? 'rgba(198, 40, 40, 0.08)' : 'rgba(var(--accent-rgb), 0.08)'}`,
            borderRadius: '20px',
            padding: '16px 20px',
            marginTop: '16px'
          }}>
            <p className="hero-med-desc" style={{ 
              margin: 0, 
              fontSize: '15px', 
              fontWeight: 600,
              color: 'var(--text-secondary)',
              lineHeight: 1.5
            }}>
              {message}
            </p>
          </div>
        </div>
        
        {/* Action Button */}
        {isAlert && (
          <div className="hero-action-footer" style={{ marginTop: '20px' }}>
            <button
              className="btn-primary"
              style={{ backgroundColor: '#C62828', borderColor: '#C62828', color: '#fff' }}
              type="button"
            >
              Kirim Pengingat Cepat
            </button>
          </div>
        )}
      </div>

      {/* Right Pane — Illness Info Panel (overlay on image background) */}
      <div className="hero-image-pane triage-illness-pane">
        {/* Background image */}
        <motion.img 
          style={{ y: imgY, scale: 1.35 }} 
          src={heroImg} 
          alt="Illustration" 
          className="hero-bento-img" 
        />
        
        {/* Overlay panel */}
        <div className={`triage-illness-overlay ${hasIllnesses ? 'has-illness' : 'healthy'}`}>
          <div className="triage-illness-header">
            <div className="triage-illness-badge">
              <LuActivity size={13} />
              KONDISI TERKINI
            </div>
          </div>

          {!hasIllnesses ? (
            <div className="triage-illness-healthy">
              <LuCircleCheck size={28} />
              <span>Tidak ada penyakit aktif</span>
            </div>
          ) : (
            <div className="triage-illness-list">
              {activeIllnesses.slice(0, 2).map((ill) => {
                const info = ill.illness_info;
                return (
                  <div key={ill.id} className="triage-illness-item">
                    <div className="triage-illness-name">{ill.illness_name}</div>
                    {info && (
                      <div className="triage-illness-info-rows">
                        {info.indikasi && (
                          <div className="triage-illness-info-row">
                            <LuInfo size={11} />
                            <span>{info.indikasi.substring(0, 80)}{info.indikasi.length > 80 ? '…' : ''}</span>
                          </div>
                        )}
                        {info.penanganan && (
                          <div className="triage-illness-info-row">
                            <LuCircleCheck size={11} />
                            <span>{info.penanganan.substring(0, 80)}{info.penanganan.length > 80 ? '…' : ''}</span>
                          </div>
                        )}
                        {info.obat_terkait && (
                          <div className="triage-illness-info-row accent">
                            <LuPill size={11} />
                            <span>Obat: {info.obat_terkait.split(',')[0].trim()}</span>
                          </div>
                        )}
                        {info.peringatan && (
                          <div className="triage-illness-info-row warning">
                            <LuTriangleAlert size={11} />
                            <span>{info.peringatan.substring(0, 70)}{info.peringatan.length > 70 ? '…' : ''}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {activeIllnesses.length > 2 && (
                <div className="triage-illness-more">
                  +{activeIllnesses.length - 2} penyakit lainnya
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TriageHeroCard;
