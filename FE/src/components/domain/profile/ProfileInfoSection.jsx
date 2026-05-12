import { LuUser } from 'react-icons/lu';
import ProfileSectionTitle from '../../ui/profile/ProfileSectionTitle';

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
      {isEditing ? (
        <>
          <div className="profile-field">
            <label className="profile-field-label" htmlFor="profile-phone">Telepon</label>
            <input
              id="profile-phone"
              className="profile-field-input"
              type="tel"
              value={formData.phone}
              onChange={onFieldChange('phone')}
              placeholder="08... atau +62..."
            />
          </div>

          <div className="profile-field">
            <label className="profile-field-label" htmlFor="profile-address">Alamat</label>
            <textarea
              id="profile-address"
              className="profile-field-input profile-field-textarea"
              value={formData.address}
              onChange={onFieldChange('address')}
              placeholder="Masukkan alamat"
              rows={3}
            />
          </div>

          <div className="profile-field">
            <label className="profile-field-label" htmlFor="profile-birth">Tanggal Lahir</label>
            <input
              id="profile-birth"
              className="profile-field-input"
              type="date"
              value={formData.birth_date}
              onChange={onFieldChange('birth_date')}
            />
          </div>

          <div className="profile-field">
            <label className="profile-field-label" htmlFor="profile-gender">Jenis Kelamin</label>
            <select
              id="profile-gender"
              className="profile-field-select"
              value={formData.gender}
              onChange={onFieldChange('gender')}
            >
              <option value="">Pilih</option>
              <option value="Laki-laki">Laki-laki</option>
              <option value="Perempuan">Perempuan</option>
              <option value="Lainnya">Lainnya</option>
            </select>
          </div>
        </>
      ) : (
        infoFields.map((field) => (
          <div key={field.label} className="profile-field">
            <span className="profile-field-label">{field.label}</span>
            <span className={`profile-field-value${field.isEmpty ? ' empty' : ''}`}>
              {field.value}
            </span>
          </div>
        ))
      )}
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
