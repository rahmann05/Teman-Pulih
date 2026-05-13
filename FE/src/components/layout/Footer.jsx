import { LuHeartPulse } from 'react-icons/lu';
import '../../styles/features/Footer.css';
import FooterColumn from '../ui/layout/FooterColumn';

const FOOTER_COLUMNS = [
  {
    title: 'Layanan',
    links: [
      { label: 'OCR Resep', href: '#' },
      { label: 'Pengingat Obat', href: '#' },
      { label: 'Chatbot Medis', href: '#' },
      { label: 'Family Care', href: '#' },
    ]
  },
  {
    title: 'Perusahaan',
    links: [
      { label: 'Tentang Kami', href: '#' },
      { label: 'Karir', href: '#' },
      { label: 'Blog', href: '#' },
      { label: 'Kontak', href: '#' },
    ]
  },
  {
    title: 'Bantuan',
    links: [
      { label: 'Pusat Bantuan', href: '#' },
      { label: 'Ketentuan Layanan', href: '#' },
      { label: 'Kebijakan Privasi', href: '#' },
    ]
  }
];

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
            {FOOTER_COLUMNS.map((col, index) => (
              <FooterColumn key={index} title={col.title} links={col.links} />
            ))}
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
