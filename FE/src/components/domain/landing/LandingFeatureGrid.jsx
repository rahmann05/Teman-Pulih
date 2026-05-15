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

const LandingFeatureGrid = () => {
  return (
    <section className="features-editorial" id="services">
      <div className="editorial-header reveal">
        <h2 className="section-huge-title">Layanan Utama</h2>
        <p className="section-subtitle">Merancang pemulihan yang lebih baik ↓</p>
      </div>

      {/* ── Desktop/Tablet: Editorial split-rows ── */}
      <div className="editorial-stack">
        {FEATURES.map((f, i) => (
          <div key={i} className={`editorial-row reveal${f.reverse ? ' reverse' : ''}`}>
            <div className="ed-content">
              <span className="ed-label">{f.label}</span>
              <h3 className="ed-title">{f.title}</h3>
              <p className="ed-desc">{f.desc}</p>
              <a href={f.link} className="ed-link">
                Pelajari lebih lanjut <HiOutlineArrowDownRight size={20} />
              </a>
            </div>
            <div className="ed-visual">
              <img src={f.image} alt={f.alt} loading="lazy" />
            </div>
          </div>
        ))}
      </div>

      {/* ── Mobile: Image overlay cards ── */}
      <div className="features-mobile-cards">
        {FEATURES.map((f, i) => (
          <a key={i} href={f.link} className={`f-card reveal d${i + 1}`}>
            <img src={f.image} alt={f.alt} className="f-card-img" loading="lazy" />
            <div className="f-card-overlay" />
            <div className="f-card-body">
              <span className="f-card-label">{f.label}</span>
              <h3 className="f-card-title">{f.title}</h3>
            </div>
            <div className="f-card-arrow">
              <HiOutlineArrowDownRight size={20} />
            </div>
          </a>
        ))}
      </div>
    </section>
  );
};

export default LandingFeatureGrid;
