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

const footerLinks = {
  Produk: ['Fitur', 'Cara Kerja', 'Harga', 'Testimoni'],
  Dukungan: ['Pusat Bantuan', 'Kontak Kami', 'Komunitas', 'Status Layanan'],
  Legal: ['Syarat & Ketentuan', 'Kebijakan Privasi', 'Aksesibilitas'],
};

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

    {/* ── MEGA FOOTER ── */}
    <footer className="p-mega-footer" data-theme="light">
      <div className="p-footer-watermark" aria-hidden>TP</div>

      <div className="p-footer-content">
        {/* CTA Center */}
        <div className="p-footer-cta">
          <motion.h2
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          >
            Mulai perjalanan kesehatan mental Anda secara terarah.
          </motion.h2>
          <Link to="/register" className="btn-primary">
            Daftar TemanPulih Gratis
          </Link>
        </div>

        {/* Links Grid */}
        <div className="p-footer-grid">
          {Object.entries(footerLinks).map(([col, links]) => (
            <div key={col}>
              <p className="p-footer-col-title">{col}</p>
              <nav className="p-footer-links">
                {links.map(l => (
                  <a key={l} href="#" className="p-footer-link">{l}</a>
                ))}
              </nav>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="p-footer-bottom">
          <span>© 2024 TemanPulih. Semua hak dilindungi.</span>
          <span>halo@temanpulih.id</span>
        </div>
      </div>
    </footer>
  </>
);

export default PelajariCTA;
