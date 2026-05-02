import { LuHeartPulse } from 'react-icons/lu';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-top">
        <div className="footer-logo">
          <div className="footer-logo-mark">
            <LuHeartPulse size={14} />
          </div>
          <span className="footer-logo-text">Teman Pulih</span>
        </div>
      </div>
      <div className="footer-links">
        <a href="#" className="footer-link">Fitur</a>
        <a href="#" className="footer-link">Cara Kerja</a>
        <a href="#" className="footer-link">Privasi</a>
        <a href="#" className="footer-link">Bantuan</a>
      </div>
      <div className="footer-bottom">
        © 2026 Teman Pulih · Tim CC26-PSU347
      </div>
    </footer>
  );
};

export default Footer;
