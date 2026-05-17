import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { HiOutlineArrowDownRight } from 'react-icons/hi2';
import featureScan from '../../../assets/images/feature-scan.png';
import featureMeds from '../../../assets/images/feature-medication.png';
import featureChat from '../../../assets/images/feature-chatbot.png';

const FEATURES = [
  {
    label: 'Deep OCR',
    title: 'Scan Resep Obat',
    desc: 'Ekstraksi otomatis nama obat dan dosis langsung dari foto resep dokter Anda.',
    link: '#scan',
    image: featureScan,
    alt: 'Scan resep',
  },
  {
    label: 'Otomatis',
    title: 'Pengingat Obat',
    desc: 'Jadwal yang diatur secara pintar. Tidak ada lagi dosis yang terlewat atau tertukar.',
    link: '#reminder',
    image: featureMeds,
    alt: 'Pengingat obat',
    reverse: true,
  },
  {
    label: 'Asisten AI',
    title: 'Chatbot Medis',
    desc: 'Dukungan 24/7 untuk menjawab pertanyaan seputar interaksi obat dan keluhan ringan.',
    link: '#chat',
    image: featureChat,
    alt: 'Chatbot medis AI',
  },
];

/* ─── Desktop/Tablet Row with Parallax ─── */
const FeatureRow = ({ feature, index }) => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  // Image layer moves down (enhanced parallax depth)
  const imgY = useTransform(scrollYProgress, [0, 1], ['-18%', '18%']);
  // Content layer shifts slightly in opposite direction
  const contentY = useTransform(scrollYProgress, [0, 1], ['6%', '-6%']);

  return (
    <div
      ref={ref}
      className={`editorial-row reveal${feature.reverse ? ' reverse' : ''}`}
    >
      <motion.div style={{ y: contentY }} className="ed-content">
        <span className="ed-label">{feature.label}</span>
        <h3 className="ed-title">{feature.title}</h3>
        <p className="ed-desc">{feature.desc}</p>
        <a href={feature.link} className="ed-link">
          Pelajari lebih lanjut <HiOutlineArrowDownRight size={20} />
        </a>
      </motion.div>
      <div className="ed-visual">
        <motion.img
          style={{ y: imgY }}
          src={feature.image}
          alt={feature.alt}
          loading="lazy"
        />
      </div>
    </div>
  );
};

/* ─── Mobile Overlay Card with Background Parallax ─── */
const MobileFeatureCard = ({ feature, index }) => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const imgY = useTransform(scrollYProgress, [0, 1], ['-15%', '15%']);

  return (
    <a
      ref={ref}
      href={feature.link}
      className={`f-card reveal d${index + 1}`}
      style={{ overflow: 'hidden' }}
    >
      <motion.img
        style={{ y: imgY }}
        src={feature.image}
        alt={feature.alt}
        className="f-card-img"
        loading="lazy"
      />
      <div className="f-card-overlay" />
      <div className="f-card-body">
        <span className="f-card-label">{feature.label}</span>
        <h3 className="f-card-title">{feature.title}</h3>
      </div>
      <div className="f-card-arrow">
        <HiOutlineArrowDownRight size={20} />
      </div>
    </a>
  );
};

const LandingFeatureGrid = () => {
  return (
    <section className="features-editorial" id="services">
      <div className="editorial-header reveal">
        <h2 className="section-huge-title">Layanan Utama</h2>
        <p className="section-subtitle">Merancang pemulihan yang lebih baik ↓</p>
      </div>

      {/* ── Desktop/Tablet: Editorial split-rows with Parallax ── */}
      <div className="editorial-stack">
        {FEATURES.map((f, i) => (
          <FeatureRow key={i} feature={f} index={i} />
        ))}
      </div>

      {/* ── Mobile: Image overlay cards with Parallax ── */}
      <div className="features-mobile-cards">
        {FEATURES.map((f, i) => (
          <MobileFeatureCard key={i} feature={f} index={i} />
        ))}
      </div>
    </section>
  );
};

export default LandingFeatureGrid;
