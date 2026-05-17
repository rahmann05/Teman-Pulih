import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const testimonials = [
  {
    quote: '"TemanPulih membantu saya melacak dosis obat ayah dari luar kota. Ketenangan batin yang luar biasa."',
    name: 'Sarah K.',
    role: 'Keluarga Pasien',
    initials: 'SK',
  },
  {
    quote: '"Pengingat jadwal obatnya benar-benar mengubah rutinitas harian saya. Saya tidak pernah melewatkan dosis lagi."',
    name: 'Ahmad R.',
    role: 'Pasien Hipertensi',
    initials: 'AR',
  },
  {
    quote: '"Fitur Family Sync membuat saya bisa memantau kondisi ibu saya meskipun berbeda kota. Sangat membantu."',
    name: 'Dewi P.',
    role: 'Caregiver',
    initials: 'DP',
  },
  {
    quote: '"Antarmukanya bersih dan mudah digunakan bahkan untuk orang tua saya yang tidak terlalu melek teknologi."',
    name: 'Rizky M.',
    role: 'Pasien & Keluarga',
    initials: 'RM',
  },
];

const PelajariCTA = () => (
  <>
    {/* ── TESTIMONIALS ── */}
    <section className="p-testimonials" data-theme="light">
      <motion.h2
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      >
        Cerita Pemulihan<br />Bersama Kami.
      </motion.h2>

      <div className="p-testimonials-track">
        {testimonials.map((t, i) => (
          <motion.div
            key={i}
            className="p-testi-card"
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="p-testi-quote">{t.quote}</p>
            <div className="p-testi-author">
              <div className="p-testi-avatar">{t.initials}</div>
              <div>
                <div className="p-testi-name">{t.name}</div>
                <div className="p-testi-role">{t.role}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>

    {/* ── MEGA FOOTER (SUSTAINABILITY STYLE) ── */}
    <footer className="p-footer-sus" data-theme="light">
      <div className="p-footer-sus-content">
        <div className="p-footer-sus-top">
          <motion.h2
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="p-footer-sus-heading"
          >
            mulai perjalanan<br />
            pemulihan anda.
          </motion.h2>
          
          <Link to="/register" className="p-footer-sus-arrow">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        </div>

        <div className="p-footer-sus-links-grid">
          <div className="p-footer-sus-col">
            <p className="p-footer-sus-title">Platform</p>
            <nav>
              <a href="#">Fitur</a>
              <a href="#">Cara Kerja</a>
              <a href="#">Harga</a>
            </nav>
          </div>
          <div className="p-footer-sus-col">
            <p className="p-footer-sus-title">Perusahaan</p>
            <nav>
              <a href="#">Tentang</a>
              <a href="#">Karir</a>
              <a href="#">Kontak</a>
            </nav>
          </div>
          <div className="p-footer-sus-col">
            <p className="p-footer-sus-title">Legal</p>
            <nav>
              <a href="#">Privasi</a>
              <a href="#">Ketentuan</a>
            </nav>
          </div>
          <div className="p-footer-sus-col">
            <p className="p-footer-sus-title">Ikuti</p>
            <nav>
              <a href="#">Instagram</a>
              <a href="#">LinkedIn</a>
            </nav>
          </div>
        </div>

        <div className="p-footer-sus-bottom">
          <span>© 2024 TemanPulih</span>
          <span>Aman & Terenkripsi</span>
        </div>
      </div>
    </footer>
  </>
);

export default PelajariCTA;
