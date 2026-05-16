import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import ProfileAvatarCard from '../../components/domain/profile/ProfileAvatarCard';
import ProfileFamilySection from '../../components/domain/profile/ProfileFamilySection';
import ProfileHeader from '../../components/domain/profile/ProfileHeader';
import ProfileInfoSection from '../../components/domain/profile/ProfileInfoSection';
import ProfileLogoutButton from '../../components/domain/profile/ProfileLogoutButton';
import ProfileSettingsSection from '../../components/domain/profile/ProfileSettingsSection';
import EMROnboardingModal from '../../components/layout/EMROnboardingModal';
import { useAuth } from '../../hooks/useAuth';
import { useProfile } from '../../hooks/useProfile';
import { FiClipboard } from 'react-icons/fi';
import { getInitials } from '../../services/dashboardHelpers';
import '../../styles/features/Profile.css';

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

  const role = profile?.role || user?.role || 'patient';
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

        <ProfileAvatarCard
          initials={initials}
          name={displayName}
          email={displayEmail}
          roleLabel={caregiverMode ? 'Caregiver' : 'Pasien'}
          roleClassName={roleBadgeClass}
        />

        <ProfileInfoSection
          isEditing={isEditing}
          formData={formData}
          infoFields={infoFields}
          onFieldChange={handleInputChange}
          onEdit={() => toggleEdit(true)}
          onSave={handleSave}
          isSaving={isSaving}
        />

        {/* EMR Section */}
        <div className="profile-emr-section">
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

        <ProfileFamilySection
          members={familyCards}
          emptyMessage="Belum ada keluarga terhubung."
        />

        <ProfileSettingsSection
          notificationsEnabled={notificationsEnabled}
          onToggleNotifications={() => setNotificationsEnabled((prev) => !prev)}
        />

        <ProfileLogoutButton onLogout={handleLogout} />
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
