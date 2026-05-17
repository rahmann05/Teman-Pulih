import { LuLogOut } from 'react-icons/lu';

const ProfileLogoutButton = ({ onLogout }) => (
  <section>
    <button type="button" className="profile-logout-btn" onClick={onLogout}>
      <LuLogOut size={18} />
      Keluar
    </button>
  </section>
);

export default ProfileLogoutButton;
