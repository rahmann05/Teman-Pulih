import React from 'react';
import { 
  LuHeart, 
  LuActivity, 
  LuScale, 
  LuShieldAlert, 
  LuStethoscope, 
  LuPhoneCall, 
  LuUsers 
} from 'react-icons/lu';
import '@/features/dashboard/caregiver-dashboard.css';

const PatientMedicalProfileCard = ({ activePatientProfile, activePatientName, loading }) => {
  const profileData = activePatientProfile?.profile || {};

  if (loading) {
    return (
      <div className="dashboard-section">
        <div className="section-header" style={{ padding: 0 }}>
          <h3 className="section-title">Detail Pasien</h3>
        </div>
        <div className="medical-profile-card bento-card loading-shimmer" style={{ height: '240px' }} />
      </div>
    );
  }

  if (!activePatientProfile) {
    return (
      <div className="dashboard-section">
        <div className="section-header" style={{ padding: 0 }}>
          <h3 className="section-title">Detail Pasien</h3>
        </div>
        <div className="medical-profile-card bento-card empty-profile">
          <LuUsers size={32} className="empty-state-icon" />
          <p className="empty-state-text">Silakan pilih pasien untuk melihat detail.</p>
        </div>
      </div>
    );
  }

  // Helper to fallback to '-' if empty
  const val = (field) => field || 'Tidak ada';

  return (
    <div className="dashboard-section" data-testid="patient-medical-profile">
      <div className="section-header" style={{ padding: 0 }}>
        <h3 className="section-title">Detail Pasien: {activePatientName}</h3>
      </div>

      <div className="medical-profile-card bento-card">
        <div className="medical-grid">
          
          {/* Bento Item 1: Golongan Darah */}
          <div className="medical-bento-item">
            <div className="bento-icon-wrapper blood">
              <LuHeart size={20} />
            </div>
            <div className="bento-details">
              <span className="bento-label">Gol. Darah</span>
              <span className="bento-value text-accent">{profileData.blood_type || '-'}</span>
            </div>
          </div>

          {/* Bento Item 2: Tensi Normal */}
          <div className="medical-bento-item">
            <div className="bento-icon-wrapper pressure">
              <LuActivity size={20} />
            </div>
            <div className="bento-details">
              <span className="bento-label">Tensi Normal</span>
              <span className="bento-value">{val(profileData.blood_pressure_range)}</span>
            </div>
          </div>

          {/* Bento Item 3: Tinggi & Berat */}
          <div className="medical-bento-item">
            <div className="bento-icon-wrapper scale">
              <LuScale size={20} />
            </div>
            <div className="bento-details">
              <span className="bento-label">Tinggi / Berat</span>
              <span className="bento-value">
                {profileData.height ? `${profileData.height} cm` : '-'} / {profileData.weight ? `${profileData.weight} kg` : '-'}
              </span>
            </div>
          </div>

          {/* Bento Item 4: Alergi */}
          <div className="medical-bento-item full-width-item">
            <div className="bento-icon-wrapper allergies">
              <LuShieldAlert size={20} />
            </div>
            <div className="bento-details">
              <span className="bento-label">Alergi</span>
              <span className="bento-value text-warning">{val(profileData.allergies)}</span>
            </div>
          </div>

          {/* Bento Item 5: Penyakit Kronis */}
          <div className="medical-bento-item full-width-item">
            <div className="bento-icon-wrapper chronic">
              <LuStethoscope size={20} />
            </div>
            <div className="bento-details">
              <span className="bento-label">Penyakit Kronis</span>
              <span className="bento-value text-danger">{val(profileData.chronic_conditions)}</span>
            </div>
          </div>

          {/* Bento Item 6: Kontak Darurat */}
          {profileData.emergency_contact_name && (
            <div className="medical-bento-item full-width-item emergency-item">
              <div className="bento-icon-wrapper emergency">
                <LuPhoneCall size={20} />
              </div>
              <div className="bento-details emergency-details">
                <div>
                  <span className="bento-label">Kontak Darurat</span>
                  <span className="bento-value">{profileData.emergency_contact_name}</span>
                </div>
                {profileData.emergency_contact_phone && (
                  <a 
                    href={`tel:${profileData.emergency_contact_phone}`} 
                    className="call-emergency-btn"
                    title={`Hubungi ${profileData.emergency_contact_name}`}
                  >
                    <LuPhoneCall size={14} />
                    <span>Hubungi</span>
                  </a>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default PatientMedicalProfileCard;
