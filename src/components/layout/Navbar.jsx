import { LuHeartPulse } from 'react-icons/lu'

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
        <button className="btn-ghost" type="button">Masuk</button>
        <button className="btn-solid" type="button">Daftar</button>
      </div>
    </nav>
  )
}

export default Navbar
