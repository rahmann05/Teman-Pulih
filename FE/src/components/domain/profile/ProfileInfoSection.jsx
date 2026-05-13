import { LuUser } from 'react-icons/lu';
import ProfileSectionTitle from '../../ui/profile/ProfileSectionTitle';
import ProfileField from '../../ui/profile/ProfileField';

const GENDER_OPTIONS = [
  { value: 'Laki-laki', label: 'Laki-laki' },
  { value: 'Perempuan', label: 'Perempuan' },
  { value: 'Lainnya', label: 'Lainnya' },
];

const ProfileInfoSection = ({
  isEditing,
  formData,
  infoFields,
  onFieldChange,
  onEdit,
  onSave,
  isSaving,
}) => (
  <section>
    <ProfileSectionTitle icon={LuUser} title="Informasi Pribadi" />

    <div className="profile-info-card">
      <ProfileField
        label="Telepon"
        id="profile-phone"
        type="tel"
        value={isEditing ? formData.phone : (infoFields.find(f => f.label === 'Telepon')?.value)}
        isEditing={isEditing}
        onChange={onFieldChange('phone')}
        placeholder="08... atau +62..."
      />

      <ProfileField
        label="Alamat"
        id="profile-address"
        type="textarea"
        value={isEditing ? formData.address : (infoFields.find(f => f.label === 'Alamat')?.value)}
        isEditing={isEditing}
        onChange={onFieldChange('address')}
        placeholder="Masukkan alamat"
        rows={3}
      />

      <ProfileField
        label="Tanggal Lahir"
        id="profile-birth"
        type="date"
        value={isEditing ? formData.birth_date : (infoFields.find(f => f.label === 'Tanggal Lahir')?.value)}
        isEditing={isEditing}
        onChange={onFieldChange('birth_date')}
      />

      <ProfileField
        label="Jenis Kelamin"
        id="profile-gender"
        type="select"
        value={isEditing ? formData.gender : (infoFields.find(f => f.label === 'Jenis Kelamin')?.value)}
        isEditing={isEditing}
        onChange={onFieldChange('gender')}
        options={GENDER_OPTIONS}
      />
    </div>

    <button
      type="button"
      className={`profile-edit-btn ${isEditing ? 'profile-edit-btn--save' : 'profile-edit-btn--edit'}`}
      onClick={isEditing ? onSave : onEdit}
      disabled={isSaving}
    >
      {isSaving ? 'Menyimpan...' : isEditing ? 'Simpan Profil' : 'Edit Profil'}
    </button>
  </section>
);

export default ProfileInfoSection;
