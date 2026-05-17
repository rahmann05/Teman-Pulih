import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import '../../styles/features/Footer.css';

const Footer = () => {
  return (
    <footer className="footer-sus" data-theme="light">
      <div className="footer-sus-content">
        <div className="footer-sus-top">
          <motion.h2
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="footer-sus-heading"
          >
            mulai perjalanan<br />
            pemulihan anda.
          </motion.h2>
          
          <Link to="/register" className="footer-sus-arrow">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        </div>

        <div className="footer-sus-links-grid">
          <div className="footer-sus-col">
            <p className="footer-sus-title">Platform</p>
            <nav>
              <Link to="/">Fitur</Link>
              <Link to="/pelajari">Cara Kerja</Link>
              <Link to="/login">Akses Masuk</Link>
            </nav>
          </div>
          <div className="footer-sus-col">
            <p className="footer-sus-title">Perusahaan</p>
            <nav>
              <a href="#">Tentang</a>
              <a href="#">Karir</a>
              <a href="#">Kontak</a>
            </nav>
          </div>
          <div className="footer-sus-col">
            <p className="footer-sus-title">Legal</p>
            <nav>
              <a href="#">Privasi</a>
              <a href="#">Ketentuan</a>
            </nav>
          </div>
          <div className="footer-sus-col">
            <p className="footer-sus-title">Ikuti</p>
            <nav>
              <a href="#">Instagram</a>
              <a href="#">LinkedIn</a>
            </nav>
          </div>
        </div>

        <div className="footer-sus-bottom">
          <span>© 2026 TemanPulih · Tim CC26-PSU347</span>
          <span>Aman & Terenkripsi</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
