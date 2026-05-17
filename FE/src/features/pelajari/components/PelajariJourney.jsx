import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

const steps = [
  {
    num: '01',
    title: 'Sinkronisasi Data',
    desc: 'Daftarkan profil medis dan sinkronkan jadwal resep Anda dalam hitungan detik. Sistem kami membaca pola pengobatan secara otomatis.',
  },
  {
    num: '02',
    title: 'Peringatan Cerdas',
    desc: 'Alarm berjenjang yang terasa seperti pengingat dari sahabat, bukan teguran mesin. Tidak ada dosis yang terlewat.',
  },
  {
    num: '03',
    title: 'Airy Family Sync',
    desc: 'Hubungkan wali atau keluarga dari jarak jauh. Mereka dapat memantau perkembangan tanpa mengganggu kemandirian Anda.',
  },
  {
    num: '04',
    title: 'Tinjauan Mingguan',
    desc: 'Rangkuman kepatuhan Anda dalam metrik yang indah dan mudah dipahami — siap ditunjukkan langsung kepada dokter.',
  },
];

// Detect mobile once (SSR-safe)
const isMobile = () => typeof window !== 'undefined' && window.innerWidth < 768;

const DesktopJourney = () => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref });
  const x = useTransform(scrollYProgress, [0, 1], ['0%', '-68%']);

  return (
    <section ref={ref} className="p-journey-section" data-theme="light">
      <div className="p-journey-sticky">
        <div className="p-journey-header">
          <h2>Peta Jalan<br />Pemulihan Anda.</h2>
          <p>Langkah demi langkah menuju rutinitas klinis yang konsisten.</p>
        </div>

        <motion.div className="p-journey-track" style={{ x }}>
          {steps.map(s => (
            <div key={s.num} className="p-journey-item">
              <div className="p-journey-number">{s.num}</div>
              <h3 className="p-journey-title">{s.title}</h3>
              <p className="p-journey-desc">{s.desc}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

const MobileJourney = () => (
  <section className="p-journey-section" data-theme="light">
    <div className="p-journey-sticky">
      <div className="p-journey-header">
        <h2>Peta Jalan Pemulihan Anda.</h2>
        <p>Langkah demi langkah menuju rutinitas klinis yang konsisten.</p>
      </div>
      <div className="p-journey-track">
        {steps.map(s => (
          <div key={s.num} className="p-journey-item">
            <div className="p-journey-number">{s.num}</div>
            <h3 className="p-journey-title">{s.title}</h3>
            <p className="p-journey-desc">{s.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const PelajariJourney = () => {
  if (isMobile()) return <MobileJourney />;
  return <DesktopJourney />;
};

export default PelajariJourney;
