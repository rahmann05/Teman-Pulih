import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/shared/layouts/DashboardLayout';
import ProfileAvatarCard from '@/features/profile/components/ProfileAvatarCard';
import ProfileFamilySection from '@/features/profile/components/ProfileFamilySection';
import ProfileHeader from '@/features/profile/components/ProfileHeader';
import ProfileInfoSection from '@/features/profile/components/ProfileInfoSection';
import ProfileLogoutButton from '@/features/profile/components/ProfileLogoutButton';
import ProfileSettingsSection from '@/features/profile/components/ProfileSettingsSection';
import EMROnboardingModal from '@/shared/layouts/EMROnboardingModal';
import { useAuth } from '@/shared/hooks/useAuth';
import { useProfile } from '@/features/profile/hooks/useProfile';
import { FiClipboard } from 'react-icons/fi';
import { LuActivity, LuCircleCheck, LuTriangleAlert, LuBrainCircuit } from 'react-icons/lu';
import * as complianceService from '@/features/compliance/services/complianceService';
import { getInitials } from '@/features/dashboard/utils/dashboardHelpers';
import '@/features/profile/profile.css';
import '@/features/compliance/compliance.css';


const statusMap = {
  accepted: { label: 'Aktif', className: 'profile-status-badge--active' },
  pending: { label: 'Menunggu', className: 'profile-status-badge--pending' },
};

const formatDate = (value) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const {
    profile,
    familyMembers,
    loading,
    error,
    isEditing,
    isSaving,
    formData,
    setFormData,
    toggleEdit,
    saveProfile,
  } = useProfile();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isEMRModalOpen, setIsEMRModalOpen] = useState(false);
  const [latestCompliance, setLatestCompliance] = useState(null);
  const [complianceEligibility, setComplianceEligibility] = useState(null);
  const [complianceLoading, setComplianceLoading] = useState(true);

  const role = profile?.role || user?.role || 'patient';

  useEffect(() => {
    if (role === 'patient') {
      Promise.all([
        complianceService.getLatest().catch(() => null),
        complianceService.getEligibility().catch(() => null)
      ]).then(([latestRes, eligibilityRes]) => {
        if (latestRes?.data?.data) {
          setLatestCompliance(latestRes.data.data);
        }
        if (eligibilityRes?.data?.data) {
          setComplianceEligibility(eligibilityRes.data.data);
        }
      }).catch(err => {
        console.error('[ProfilePage] Error fetching compliance:', err);
      }).finally(() => {
        setComplianceLoading(false);
      });
    } else {
      setComplianceLoading(false);
    }
  }, [role]);
  const caregiverMode = role === 'caregiver';
  const displayName = profile?.name || user?.name || 'Teman Pulih';
  const displayEmail = profile?.email || user?.email || '-';
  const initials = getInitials(displayName);

  const infoFields = useMemo(() => ([
    {
      label: 'Telepon',
      value: profile?.phone || 'Belum diisi',
      isEmpty: !profile?.phone,
    },
    {
      label: 'Alamat',
      value: profile?.address || 'Belum diisi',
      isEmpty: !profile?.address,
    },
    {
      label: 'Tanggal Lahir',
      value: profile?.birth_date ? formatDate(profile.birth_date) : 'Belum diisi',
      isEmpty: !profile?.birth_date,
    },
    {
      label: 'Jenis Kelamin',
      value: profile?.gender || 'Belum diisi',
      isEmpty: !profile?.gender,
    },
  ]), [profile]);

  const familyCards = useMemo(() => {
    return familyMembers.map((member) => {
      const relationPerson = role === 'caregiver' ? member.patient : member.caregiver;
      const status = statusMap[member.status] || statusMap.pending;
      const roleLabel = role === 'caregiver' ? 'Pasien' : 'Caregiver';
      return {
        id: member.id,
        name: relationPerson?.name || 'Belum tersedia',
        email: relationPerson?.email || '',
        initials: getInitials(relationPerson?.name || 'Teman Pulih'),
        roleLine: `${roleLabel}${relationPerson?.email ? ` - ${relationPerson.email}` : ''}`,
        statusLabel: status.label,
        statusClass: status.className,
      };
    });
  }, [familyMembers, role]);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate(caregiverMode ? '/caregiver/dashboard' : '/dashboard');
  };

  const handleInputChange = (field) => (event) => {
    const { value } = event.target;
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    await saveProfile(formData);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const roleBadgeClass = caregiverMode
    ? 'profile-role-badge--caregiver'
    : 'profile-role-badge--patient';

  if (loading) {
    return (
      <DashboardLayout caregiverMode={caregiverMode}>
        <div className="profile-container">
          <div className="dashboard-skeleton">
            <div className="skeleton-block" style={{ height: 48 }} />
            <div className="skeleton-block" style={{ height: 220 }} />
            <div className="skeleton-block" style={{ height: 220 }} />
            <div className="skeleton-block" style={{ height: 160 }} />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout caregiverMode={caregiverMode}>
      <div className="profile-container" data-testid="profile-page">
        <ProfileHeader title="Profil Saya" onBack={handleBack} />

        {error && <div className="profile-error">{error}</div>}

        <div className="profile-dashboard-grid">
          {/* Hero Section (Spans full width of the grid on desktop) */}
          <div className="profile-hero-wrapper">
            <ProfileAvatarCard
              initials={initials}
              name={displayName}
              email={displayEmail}
              roleLabel={caregiverMode ? 'Caregiver' : 'Pasien'}
              roleClassName={roleBadgeClass}
            />
          </div>

          {/* Column 1: Info & Settings */}
          <div className="profile-col-left">
            <div className="bento-card">
              <ProfileInfoSection
                isEditing={isEditing}
                formData={formData}
                infoFields={infoFields}
                onFieldChange={handleInputChange}
                onEdit={() => toggleEdit(true)}
                onSave={handleSave}
                isSaving={isSaving}
              />
            </div>
            
            <div className="bento-card">
              <ProfileSettingsSection
                notificationsEnabled={notificationsEnabled}
                onToggleNotifications={() => setNotificationsEnabled((prev) => !prev)}
              />
            </div>
          </div>

          {/* Column 2: EMR & Family */}
          <div className="profile-col-right">
            {/* EMR Section (Bento Card style) - only for patients, not caregiver */}
            {!caregiverMode && (
              <div className="bento-card profile-emr-section">
                <div className="profile-emr-header">
                  <span className="profile-section-title-icon">
                    <FiClipboard />
                  </span>
                  <h3 className="profile-section-title">Rekam Medis Elektronik</h3>
                </div>
                <p className="profile-emr-text">
                  Lihat atau perbarui riwayat penyakit, alergi, dan data medis Anda.
                </p>
                <button
                  type="button"
                  className="profile-emr-btn"
                  onClick={() => setIsEMRModalOpen(true)}
                >
                  Buka Rekam Medis
                </button>
              </div>
            )}

            {!caregiverMode && (
              <div className="bento-card profile-compliance-section" style={{ marginTop: '0' }}>
                <div className="profile-emr-header">
                  <span className="profile-section-title-icon">
                    <LuBrainCircuit size={20} style={{ color: 'var(--accent)' }} />
                  </span>
                  <h3 className="profile-section-title">Status Kepatuhan AI</h3>
                </div>

                {complianceLoading ? (
                  <div className="skeleton-block" style={{ height: 120, width: '100%', borderRadius: 16 }} />
                ) : latestCompliance ? (
                  <div className="profile-compliance-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--accent-tint)', padding: '12px 16px', borderRadius: '16px', border: '1px solid var(--accent-light)' }}>
                      <div>
                        <p style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--accent-dark)', letterSpacing: '0.05em' }}>Skor Keseluruhan</p>
                        <p style={{ fontSize: '20px', fontWeight: 900, color: 'var(--accent)', margin: 0 }}>{(latestCompliance.adherence_score * 100).toFixed(0)}%</p>
                      </div>
                      <span className={`compliance-status-badge ${latestCompliance.adherence_class === 1 ? 'active' : 'danger'}`} style={{
                        padding: '6px 14px',
                        borderRadius: '100px',
                        fontSize: '11px',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        background: latestCompliance.adherence_class === 1 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        color: latestCompliance.adherence_class === 1 ? 'var(--success)' : 'var(--error)'
                      }}>
                        {latestCompliance.adherence_class === 1 ? 'Sangat Patuh' : 'Butuh Intervensi'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'var(--bg-muted)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border-light)' }}>
                      {/* Adherence */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Kedisiplinan Obat</span>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: latestCompliance.adherence_class === 1 ? 'var(--success)' : 'var(--error)' }}>
                          {latestCompliance.adherence_class === 1 ? 'Sangat Patuh' : 'Kurang Patuh'}
                        </span>
                      </div>

                      {/* Behaviour */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Perilaku Rutinitas</span>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: latestCompliance.behaviour_class === 1 ? 'var(--success)' : 'var(--error)' }}>
                          {latestCompliance.behaviour_class === 1 ? 'Baik (Positif)' : 'Perlu Koreksi'}
                        </span>
                      </div>

                      {/* Perception */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Persepsi Khasiat</span>
                        <span style={{
                          fontSize: '13px',
                          fontWeight: 700,
                          color: latestCompliance.perception_class === 2 ? 'var(--success)' : latestCompliance.perception_class === 1 ? 'var(--warning)' : 'var(--error)'
                        }}>
                          {latestCompliance.perception_class === 2 ? 'Positif (Yakin)' : latestCompliance.perception_class === 1 ? 'Netral/Cukup' : 'Negatif (Ragu)'}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                      <button
                        type="button"
                        className="profile-emr-btn"
                        style={{ flex: 1, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', textAlign: 'center', padding: '10px 12px' }}
                        onClick={() => navigate('/compliance/result')}
                      >
                        Lihat Intervensi
                      </button>
                      
                      <button
                        type="button"
                        className="profile-emr-btn"
                        style={{ flex: 1.2, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', background: 'var(--accent)', color: '#fff', textAlign: 'center', padding: '10px 12px' }}
                        onClick={() => navigate('/compliance')}
                      >
                        Uji Kepatuhan Lagi
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="profile-compliance-empty" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <p className="profile-emr-text" style={{ marginBottom: '8px' }}>
                      Anda belum menguji tingkat kepatuhan medis Anda minggu ini. Uji sekarang untuk mendapatkan analisis kepatuhan berbasis AI dan bimbingan adaptif.
                    </p>
                    <button
                      type="button"
                      className="profile-emr-btn"
                      style={{ background: 'var(--accent)', color: '#fff', alignSelf: 'stretch' }}
                      onClick={() => navigate('/compliance')}
                    >
                      Mulai Uji Kepatuhan AI
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="bento-card">
              <ProfileFamilySection
                members={familyCards}
                emptyMessage="Belum ada keluarga terhubung."
              />
            </div>
          </div>
          
          {/* Footer Grid / Full Width */}
          <div className="profile-footer-wrapper">
            <ProfileLogoutButton onLogout={handleLogout} />
          </div>
        </div>
      </div>

      <EMROnboardingModal
        isOpen={isEMRModalOpen}
        onClose={() => setIsEMRModalOpen(false)}
        onSuccess={() => {
          setIsEMRModalOpen(false);
          window.location.reload(); // Reload untuk mendapatkan data profil terbaru
        }}
        initialData={profile}
      />
    </DashboardLayout>
  );
};

export default ProfilePage;
