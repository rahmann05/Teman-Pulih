import { useRef, useState, useEffect, useCallback } from 'react';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';

import imgOcr from '../../../assets/images/feature-ocr-scan-v2.png';
import imgMed from '../../../assets/images/feature-med-schedule-v2.png';
import imgChat from '../../../assets/images/feature-ai-chatbot-v2.png';
import imgSync from '../../../assets/images/feature-family-sync.png';

const features = [
  {
    id: '01', label: 'Deep OCR',
    title: 'Scan Resep Cerdas.',
    img: imgOcr,
    imgPosition: 'center center',
    fact: 'Akurasi pengenalan teks medis mencapai 97.4% — setara standar farmasi internasional.',
    desc: 'Lupakan kerumitan input manual yang memakan waktu dan rentan kesalahan. Teknologi Optical Character Recognition (OCR) berbasis deep learning kami mampu membaca tulisan tangan dokter, label kemasan farmasi, hingga resep digital dengan presisi klinis. Setiap nama generik, dosis dalam miligram, frekuensi konsumsi, hingga catatan kontraindikasi — diekstrak otomatis, divalidasi silang, lalu dikonversi menjadi jadwal yang siap dieksekusi. Semua terjadi dalam hitungan detik setelah Anda memotret resep.',
  },
  {
    id: '02', label: 'Otomatis',
    title: 'Pengingat Adaptif.',
    img: imgMed,
    imgPosition: 'center center',
    fact: '80% pasien TemanPulih melaporkan peningkatan signifikan kepatuhan dosis dalam 30 hari pertama.',
    desc: 'Sistem pengingat kami jauh melampaui alarm biasa. Algoritma berbasis ritme sirkadian secara dinamis menghitung waktu ideal konsumsi setiap obat — mempertimbangkan interaksi antar zat aktif, efek samping yang harus dihindari di jam tertentu, hingga interval minimum antar dosis. Jika Anda melewatkan waktu minum, sistem tidak hanya mengingatkan, tapi juga memberikan panduan tepat apakah dosis masih bisa dikejar atau harus dilewati demi keamanan. Tidak ada lagi tebakan, hanya kepastian klinis.',
  },
  {
    id: '03', label: 'Asisten AI',
    title: 'Pendamping AI 24/7.',
    img: imgChat,
    imgPosition: 'center top',
    fact: 'Lebih dari 2.400 skenario farmasi telah dilatih ke dalam model bahasa kami.',
    desc: 'Pertanyaan medis sering muncul di momen paling tidak terduga — jam 2 pagi setelah efek samping tak terduga, atau saat berkemas untuk perjalanan dan tidak tahu cara menyimpan obat. Asisten AI TemanPulih dilatih eksklusif menggunakan korpus farmakologi klinis, panduan terapi WHO, serta data interaksi obat-obat dan obat-makanan terkini. Berbeda dari chatbot generik, respons kami terstruktur medis: konteks, mekanisme, tindakan yang disarankan, dan kapan harus segera menghubungi dokter.',
  },
  {
    id: '04', label: 'Sinkronisasi',
    title: 'Airy Family Sync.',
    img: imgSync,
    imgPosition: 'center center',
    fact: 'Pemantauan real-time lintas perangkat — tanpa batasan jarak, tanpa delay.',
    desc: 'Pemulihan adalah ekosistem, bukan perjalanan soliter. Airy Family Sync memungkinkan anggota keluarga, pasangan, atau pengasuh terkoneksi ke protokol pengobatan Anda dengan izin yang Anda kendalikan sepenuhnya. Mereka dapat memantau status kepatuhan harian, menerima notifikasi peringatan jika ada dosis terlewat tiga kali berturut-turut, hingga membaca ringkasan perkembangan mingguan. Privasi tetap terjaga — data medis sensitif tidak pernah terekspos; yang dibagikan hanyalah sinyal kesehatan yang telah Anda otorisasi. Karena orang-orang terkasih berhak hadir, meski tak selalu bisa berada di sisi Anda.',
  },
];

/* ─── Single Feature Block ────────────────────── */
const FeatureBlock = ({ feature, index, setActiveIndex }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { margin: '-45% 0px -45% 0px' });
  
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  // Image layer (deepest) moves down
  const imgY = useTransform(scrollYProgress, [0, 1], ['-15%', '15%']);
  
  // Content layer (highest) moves up
  const contentY = useTransform(scrollYProgress, [0, 1], ['15%', '-15%']);

  useEffect(() => {
    if (isInView) setActiveIndex(index);
  }, [isInView, index, setActiveIndex]);

  return (
    <motion.div
      ref={ref}
      className="p-feature-block"
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-10%' }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="p-feature-block-img-wrapper">
        <motion.img
          src={feature.img}
          alt={feature.title}
          style={{ y: imgY, objectPosition: feature.imgPosition || 'center center' }}
        />
      </div>

      <motion.div 
        className="p-feature-block-content"
        style={{ y: contentY }}
      >
        <div className="p-feature-pill-row">
          <span className="p-feature-pill-num">{feature.id}</span>
          <span className="p-feature-pill-label">{feature.label}</span>
        </div>
        <h3 className="p-feature-block-title">{feature.title}</h3>
        <p className="p-feature-block-desc">{feature.desc}</p>
        <div className="p-feature-sneak">
          <strong>Wawasan Klinis</strong>
          {feature.fact}
        </div>
      </motion.div>
    </motion.div>
  );
};

/* ─── Main Section ────────────────────────────── */
const PelajariFeaturesSlider = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const handleSetActive = useCallback((i) => setActiveIndex(i), []);

  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  // Slow upward drift for the sticky nav to give it a floating "highest layer" illusion
  const navY = useTransform(scrollYProgress, [0, 1], ['5%', '-10%']);

  return (
    <section ref={ref} className="p-features-split" data-theme="light">
      {/* LEFT — sticky nav */}
      <div className="p-features-left">
        <motion.div className="p-features-nav" style={{ y: navY }}>
          <p className="p-features-eyebrow">Platform TemanPulih</p>
          <h2 className="p-features-nav-title">Ekosistem<br />Fitur.</h2>
          <ul className="p-features-list">
            {features.map((f, i) => (
              <li key={f.id} className={`p-features-list-item ${i === activeIndex ? 'active' : ''}`}>
                <span className="p-features-list-num">{f.id}</span>
                <span className="p-features-list-label">{f.label}</span>
              </li>
            ))}
          </ul>
          <div className="p-features-progress">
            <div
              className="p-features-progress-bar"
              style={{ height: `${((activeIndex + 1) / features.length) * 100}%` }}
            />
          </div>
        </motion.div>
      </div>

      {/* RIGHT — scrolling feature blocks */}
      <div className="p-features-right">
        {features.map((f, i) => (
          <FeatureBlock key={f.id} feature={f} index={i} setActiveIndex={handleSetActive} />
        ))}
      </div>
    </section>
  );
};

export default PelajariFeaturesSlider;
