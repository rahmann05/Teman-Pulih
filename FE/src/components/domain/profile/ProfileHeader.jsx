import { LuArrowLeft } from 'react-icons/lu';

const ProfileHeader = ({ title, onBack }) => (
  <header className="profile-header">
    <button type="button" className="profile-back-btn" onClick={onBack} aria-label="Kembali">
      <LuArrowLeft size={20} />
    </button>
    <h1 className="profile-header-title">{title}</h1>
  </header>
);

export default ProfileHeader;
