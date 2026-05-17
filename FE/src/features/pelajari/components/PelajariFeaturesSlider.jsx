import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

const medImg = 'https://placehold.co/800x1200/F4F1ED/3D5C4D?text=Medication+Feature';
const syncImg = 'https://placehold.co/800x1200/F4F1ED/C4653A?text=Sync+Feature';
const eduImg = 'https://placehold.co/800x1200/F4F1ED/C4653A?text=Education+Feature';
const consoleImg = 'https://placehold.co/800x1200/F4F1ED/3D5C4D?text=Consult+Feature';

const features = [
  {
    id: '01', label: 'Medikasi',
    title: 'Pengingat Minum Obat.',
    img: medImg,
    fact: '80% pasien TemanPulih berhasil menjaga kepatuhan dosis secara konsisten.',
  },
  {
    id: '02', label: 'Sinkronisasi',
    title: 'Airy Family Sync.',
    img: syncImg,
    fact: 'Pantau orang terkasih dari mana saja, secara real-time.',
  },
  {
    id: '03', label: 'Edukasi',
    title: 'Artikel & Wawasan.',
    img: eduImg,
    fact: 'Konten medis dikurasi oleh tim psikiater bersertifikat.',
  },
  {
    id: '04', label: 'Integrasi',
    title: 'Konsultasi Profesional.',
    img: consoleImg,
    fact: 'Terhubung dengan dokter atau psikolog dalam satu platform.',
  },
];

const FeatureSlide = ({ feature, index, containerRef }) => {
  const total = features.length;
  const { scrollYProgress } = useScroll({ target: containerRef });

  const start = index / total;
  const end   = (index + 1) / total;

  // Clamp to avoid negative or >1 values which cause WAAPI error
  const s0 = Math.max(0, start - 0.04);
  const s1 = start;
  const e0 = end;
  const e1 = Math.min(1, end + 0.04);

  const y = useTransform(
    scrollYProgress,
    [s0, s1, e0, e1],
    ['100%', '0%', '0%', '-45%']
  );
  const opacity = useTransform(
    scrollYProgress,
    [s0, s1, Math.max(s1, e0 - 0.04), e0],
    [0, 1, 1, 0]
  );

  return (
    <motion.div
      className="p-feature-slide"
      style={{ y, opacity, zIndex: index }}
    >
      <div className="p-feature-bg">
        <img src={feature.img} alt={feature.title} />
        <div className="p-feature-overlay" />
      </div>

      <div className="p-feature-content">
        <div className="p-feature-pill">
          <span className="p-feature-pill-num">{feature.id}</span>
          <span>{feature.label}</span>
        </div>
        <h2 className="p-feature-title">{feature.title}</h2>
        <button className="p-feature-btn">Lihat Detail Fitur</button>
      </div>

      <div className="p-feature-sneak">
        <strong>Tahukah Anda?</strong>
        {feature.fact}
      </div>
    </motion.div>
  );
};

/* Mobile CSS-snap slider */
const MobileSlider = () => (
  <section className="p-features-section" data-theme="dark">
    <div className="p-features-mobile-slider">
      {features.map((f, i) => (
        <div key={f.id} className="p-feature-slide" style={{ zIndex: i }}>
          <div className="p-feature-bg">
            <img src={f.img} alt={f.title} />
            <div className="p-feature-overlay" />
          </div>
          <div className="p-feature-content">
            <div className="p-feature-pill">
              <span className="p-feature-pill-num">{f.id}</span>
              <span>{f.label}</span>
            </div>
            <h2 className="p-feature-title">{f.title}</h2>
            <button className="p-feature-btn">Lihat Detail</button>
          </div>
        </div>
      ))}
    </div>
  </section>
);

const PelajariFeaturesSlider = () => {
  const containerRef = useRef(null);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 900;
  if (isMobile) return <MobileSlider />;

  return (
    <section ref={containerRef} className="p-features-section" data-theme="dark">
      <div className="p-features-sticky">
        {features.map((f, i) => (
          <FeatureSlide key={f.id} feature={f} index={i} containerRef={containerRef} />
        ))}
      </div>
    </section>
  );
};

export default PelajariFeaturesSlider;
