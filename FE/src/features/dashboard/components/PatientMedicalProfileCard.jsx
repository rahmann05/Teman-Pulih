import React, { useEffect, useState } from 'react';
import { 
  LuHeart, 
  LuActivity, 
  LuScale, 
  LuShieldAlert, 
  LuStethoscope, 
  LuHistory,
  LuScissors,
  LuPhoneCall, 
  LuUsers,
  LuCircleCheck,
} from 'react-icons/lu';
import { getIllnessHistory } from '@/features/family-sync/services/familyService';
import ComplianceBadge from '@/features/compliance/components/ComplianceBadge';
import * as complianceService from '@/features/compliance/services/complianceService';

const PatientMedicalProfileCard = ({ activePatientProfile, activePatientName, loading }) => {
  const profileData = activePatientProfile?.profile || {};
  const patientUserId = activePatientProfile?.id ?? activePatientProfile?.user_id ?? null;

  const [activeIllnesses, setActiveIllnesses] = useState([]);
  const [illnessLoading, setIllnessLoading] = useState(false);
  const [latestCompliance, setLatestCompliance] = useState(null);

  useEffect(() => {
    if (!patientUserId) {
      setLatestCompliance(null);
      return;
    }
    complianceService.getLatest(patientUserId)
      .then(res => setLatestCompliance(res.data.data))
      .catch(err => console.error('[Caregiver Medical Profile] Gagal memuat compliance status:', err));
  }, [patientUserId]);

  useEffect(() => {
    if (!patientUserId) {
      setActiveIllnesses([]);
      return;
    }
    let cancelled = false;
    const fetchIllnesses = async () => {
      setIllnessLoading(true);
      try {
        const { data } = await getIllnessHistory(patientUserId);
        if (!cancelled) {
          setActiveIllnesses((data || []).filter(i => i.is_active));
        }
      } catch {
        // silently ignore — card still renders without illness list
      } finally {
        if (!cancelled) setIllnessLoading(false);
      }
    };
    fetchIllnesses();
    return () => { cancelled = true; };
  }, [patientUserId]);

  if (loading) {
    return (
      <div className="dashboard-section">
        <h3 className="section-title">Detail Pasien</h3>
        <div className="medical-profile-card bento-card loading-shimmer" style={{ height: '280px', borderRadius: '32px' }} />
      </div>
    );
  }

  if (!activePatientProfile) {
    return (
      <div className="dashboard-section">
        <h3 className="section-title">Detail Pasien</h3>
        <div className="medical-profile-card bento-card empty-profile" style={{ borderRadius: '32px' }}>
          <LuUsers size={32} className="empty-state-icon" style={{ color: 'var(--accent)' }} />
          <p className="empty-state-text">Silakan pilih pasien untuk melihat detail.</p>
        </div>
      </div>
    );
  }

  const val = (field) => field || 'Tidak ada';

  return (
    <div className="dashboard-section" data-testid="patient-medical-profile">
      <h3 className="section-title">Detail Pasien: {activePatientName}</h3>

      <div className="medical-profile-card bento-card" style={{ borderRadius: '32px', padding: '28px', background: '#FFF' }}>
        {latestCompliance && latestCompliance.adherence_class === 0 && (
          <div style={{
            background: 'var(--error-light)',
            border: '1.5px solid #fca5a5',
            borderRadius: '16px',
            padding: '16px',
            color: 'var(--error)',
            fontWeight: 700,
            fontSize: '13px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <LuShieldAlert size={18} />
            <span>PERINGATAN KEPATUHAN: Pasien {activePatientName} terdeteksi memiliki tingkat kepatuhan minum obat yang rendah! Mohon bantu pantau jadwal minum obatnya secara proaktif.</span>
          </div>
        )}
        <div className="medical-grid">

          {/* ── Baris 1: Data Fisik (4 kolom di desktop) ── */}

          {/* Bento Item 1: Golongan Darah */}
          <div className="medical-bento-item" style={{ borderColor: 'rgba(196,101,58,0.15)', background: 'rgba(196,101,58,0.02)' }}>
            <div className="bento-icon-wrapper" style={{ background: 'rgba(196,101,58,0.1)', color: 'var(--accent)' }}>
              <LuHeart size={20} />
            </div>
            <div className="bento-details">
              <span className="bento-label">Gol. Darah</span>
              <span className="bento-value" style={{ color: 'var(--accent)' }}>{profileData.blood_type || '-'}</span>
            </div>
          </div>

          {/* Bento Item 2: Tensi Normal */}
          <div className="medical-bento-item" style={{ borderColor: 'rgba(91,123,106,0.15)', background: 'rgba(91,123,106,0.02)' }}>
            <div className="bento-icon-wrapper" style={{ background: 'rgba(91,123,106,0.1)', color: 'var(--sage-dark)' }}>
              <LuActivity size={20} />
            </div>
            <div className="bento-details">
              <span className="bento-label">Tensi Normal</span>
              <span className="bento-value" style={{ color: 'var(--sage-dark)' }}>{val(profileData.blood_pressure_range)}</span>
            </div>
          </div>

          {/* Bento Item 3: Tinggi & Berat */}
          <div className="medical-bento-item" style={{ borderColor: 'rgba(176,137,104,0.15)', background: 'rgba(176,137,104,0.02)' }}>
            <div className="bento-icon-wrapper" style={{ background: 'rgba(176,137,104,0.1)', color: '#8C6239' }}>
              <LuScale size={20} />
            </div>
            <div className="bento-details">
              <span className="bento-label">Tinggi / Berat</span>
              <span className="bento-value" style={{ color: '#8C6239' }}>
                {profileData.height ? `${profileData.height} cm` : '-'} / {profileData.weight ? `${profileData.weight} kg` : '-'}
              </span>
            </div>
          </div>

          {/* Bento Item 4: Alergi */}
          <div className="medical-bento-item" style={{ borderColor: 'rgba(196,101,58,0.15)', background: 'rgba(196,101,58,0.02)' }}>
            <div className="bento-icon-wrapper" style={{ background: 'rgba(196,101,58,0.1)', color: 'var(--accent)' }}>
              <LuShieldAlert size={20} />
            </div>
            <div className="bento-details">
              <span className="bento-label">Alergi</span>
              <span className="bento-value" style={{ color: 'var(--accent-dark)' }}>{val(profileData.allergies)}</span>
            </div>
          </div>

          {/* ── Baris 2: Kondisi Medis (masing-masing 2 kolom di desktop) ── */}

          {/* Bento Item 5: Penyakit Kronis */}
          <div className="medical-bento-item half-width-desktop-item" style={{ borderColor: 'rgba(176,137,104,0.15)', background: 'rgba(176,137,104,0.02)' }}>
            <div className="bento-icon-wrapper" style={{ background: 'rgba(176,137,104,0.1)', color: '#8C6239' }}>
              <LuStethoscope size={20} />
            </div>
            <div className="bento-details">
              <span className="bento-label">Penyakit Kronis / Bawaan</span>
              <span className="bento-value" style={{ color: '#8C6239' }}>{val(profileData.chronic_conditions)}</span>
            </div>
          </div>

          {/* Bento Item 6: Riwayat Penyakit Dahulu */}
          <div className="medical-bento-item half-width-desktop-item" style={{ borderColor: 'rgba(91,123,106,0.15)', background: 'rgba(91,123,106,0.02)' }}>
            <div className="bento-icon-wrapper" style={{ background: 'rgba(91,123,106,0.1)', color: 'var(--sage-dark)' }}>
              <LuHistory size={20} />
            </div>
            <div className="bento-details">
              <span className="bento-label">Riwayat Penyakit Dahulu</span>
              <span className="bento-value" style={{ color: 'var(--sage-dark)' }}>{val(profileData.past_illnesses)}</span>
            </div>
          </div>

          {/* ── Baris 3: Riwayat Operasi + Penyakit Saat Ini ── */}

          {/* Bento Item 7: Riwayat Operasi */}
          <div className="medical-bento-item half-width-desktop-item" style={{ borderColor: 'rgba(196,101,58,0.15)', background: 'rgba(196,101,58,0.02)' }}>
            <div className="bento-icon-wrapper" style={{ background: 'rgba(196,101,58,0.1)', color: 'var(--accent)' }}>
              <LuScissors size={20} />
            </div>
            <div className="bento-details">
              <span className="bento-label">Riwayat Operasi / Bedah</span>
              <span className="bento-value" style={{ color: 'var(--accent-dark)' }}>{val(profileData.surgeries_history)}</span>
            </div>
          </div>

          {/* Bento Item 9: Kontak Darurat */}
          {profileData.emergency_contact_name && (
            <div className="medical-bento-item half-width-desktop-item emergency-item" style={{ borderColor: 'rgba(91,123,106,0.25)', background: 'rgba(91,123,106,0.02)' }}>
              <div className="bento-icon-wrapper" style={{ background: 'rgba(91,123,106,0.12)', color: 'var(--sage-dark)' }}>
                <LuPhoneCall size={20} />
              </div>
              <div className="bento-details emergency-details" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <div>
                  <span className="bento-label">Kontak Darurat</span>
                  <span className="bento-value" style={{ color: 'var(--sage-dark)' }}>{profileData.emergency_contact_name}</span>
                </div>
                {profileData.emergency_contact_phone && (
                  <a
                    href={`tel:${profileData.emergency_contact_phone}`}
                    className="call-emergency-btn"
                    title={`Hubungi ${profileData.emergency_contact_name}`}
                    style={{
                      background: 'var(--sage-dark)',
                      color: '#fff',
                      borderRadius: '12px',
                      padding: '8px 16px',
                      fontSize: '12px',
                      fontWeight: '800',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      textDecoration: 'none',
                      boxShadow: '0 4px 12px rgba(61,92,77,0.3)',
                    }}
                  >
                    <LuPhoneCall size={14} />
                    <span>Hubungi</span>
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Bento Item 10: Status Kepatuhan Pasien (AI) */}
          <div className="medical-bento-item half-width-desktop-item" style={{ gridColumn: 'span 2', padding: '12px' }}>
            <ComplianceBadge patientId={patientUserId} viewOnly={true} />
          </div>

        </div>
      </div>
    </div>
  );
};

export default PatientMedicalProfileCard;
