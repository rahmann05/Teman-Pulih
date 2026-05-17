import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { HiOutlineArrowRight, HiOutlineShieldCheck, HiOutlineHeart, HiOutlineStar } from 'react-icons/hi2';
import { Link } from 'react-router-dom';

const TRUST_SIGNALS = [
  { icon: HiOutlineShieldCheck, text: 'Data terenkripsi penuh' },
  { icon: HiOutlineHeart, text: 'Gratis selamanya' },
  { icon: HiOutlineStar, text: 'Dinilai 4.9/5 pengguna' },
];

const LandingBottomCTA = () => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  // Calculate diverse parallax travel metrics for decorative rings and badge
  const ring1Y = useTransform(scrollYProgress, [0, 1], ['-30px', '30px']);
  const ring2Y = useTransform(scrollYProgress, [0, 1], ['40px', '-40px']);
  const ring3Y = useTransform(scrollYProgress, [0, 1], ['-50px', '50px']);
  const badgeY = useTransform(scrollYProgress, [0, 1], ['20px', '-20px']);
  const badgeRotate = useTransform(scrollYProgress, [0, 1], [-8, 8]);

  return (
    <section ref={ref} className="cta-section">
      <div className="cta-card reveal">
        {/* Left: Text Content */}
        <div className="cta-content">
          <span className="cta-eyebrow">Mulai sekarang, gratis</span>
          <h2 className="cta-title">
            Siap Memulai<br />Pemulihan Anda?
          </h2>
          <p className="cta-desc">
            Bergabung dengan ribuan pasien dan caregiver yang telah mempercayakan pemulihan mereka bersama Teman Pulih. Tidak perlu kartu kredit.
          </p>
          <div className="cta-actions">
            <Link to="/register" className="cta-btn-primary">
              Daftar Gratis <HiOutlineArrowRight size={18} />
            </Link>
            <Link to="/pelajari" className="cta-btn-secondary">
              Lihat Cara Kerja
            </Link>
          </div>

          <div className="cta-trust">
            {TRUST_SIGNALS.map((s, i) => (
              <div key={i} className="cta-trust-item">
                <s.icon size={16} />
                <span>{s.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Decorative accent block with Parallax */}
        <div className="cta-visual" aria-hidden="true">
          <motion.div style={{ y: ring1Y }} className="cta-visual-ring cta-visual-ring--1" />
          <motion.div style={{ y: ring2Y }} className="cta-visual-ring cta-visual-ring--2" />
          <motion.div style={{ y: ring3Y }} className="cta-visual-ring cta-visual-ring--3" />
          <motion.div
            style={{ y: badgeY, rotate: badgeRotate }}
            className="cta-visual-badge"
          >
            <HiOutlineShieldCheck size={40} />
            <span>Terpercaya</span>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default LandingBottomCTA;

