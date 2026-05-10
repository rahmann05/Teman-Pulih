import { LuHeartPulse } from 'react-icons/lu';
import '../../styles/features/Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-main">
          <div className="footer-brand">
            <div className="footer-logo">
              <div className="footer-logo-mark">
                <LuHeartPulse size={16} />
              </div>
              <span className="footer-logo-text">Teman Pulih</span>
            </div>
            <p className="footer-tagline">
              Pendamping pemulihan kesehatan digital yang aman, terarah, dan terpercaya.
            </p>
          </div>

          <div className="footer-grid">
            <div className="footer-col">
              <h4 className="footer-title">Layanan</h4>
              <a href="#" className="footer-link">OCR Resep</a>
              <a href="#" className="footer-link">Pengingat Obat</a>
              <a href="#" className="footer-link">Chatbot Medis</a>
              <a href="#" className="footer-link">Family Care</a>
            </div>
            <div className="footer-col">
              <h4 className="footer-title">Perusahaan</h4>
              <a href="#" className="footer-link">Tentang Kami</a>
              <a href="#" className="footer-link">Karir</a>
              <a href="#" className="footer-link">Blog</a>
              <a href="#" className="footer-link">Kontak</a>
            </div>
            <div className="footer-col">
              <h4 className="footer-title">Bantuan</h4>
              <a href="#" className="footer-link">Pusat Bantuan</a>
              <a href="#" className="footer-link">Ketentuan Layanan</a>
              <a href="#" className="footer-link">Kebijakan Privasi</a>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <div className="footer-copyright">
            © 2026 Teman Pulih · Tim CC26-PSU347
          </div>
          <div className="footer-socials">
            {/* Social icons can go here */}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
