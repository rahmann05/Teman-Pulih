import { LuHeartPulse } from 'react-icons/lu';
import { Link } from 'react-router-dom';

const Navbar = () => {
  return (
    <nav className="nav" aria-label="Main">
      <div className="logo">
        <div className="logo-mark">
          <LuHeartPulse size={18} />
        </div>
        <span className="logo-text">Teman Pulih</span>
      </div>
      <div className="nav-actions">
        <Link to="/login" className="btn-ghost">Masuk</Link>
        <Link to="/register" className="btn-solid">Daftar</Link>
      </div>
    </nav>
  );
};

export default Navbar;
