import { useRef, useState, useEffect } from 'react';
import { motion, useInView } from 'framer-motion';

import imgOcr from '../../../assets/images/feature-ocr-scan-v2.png';
import imgMed from '../../../assets/images/feature-med-schedule-v2.png';
import imgChat from '../../../assets/images/feature-ai-chatbot-v2.png';
import imgSync from '../../../assets/images/feature-family-sync.png';

const features = [
  {
    id: '01', label: 'Deep OCR',
    title: 'Scan Resep Cerdas.',
    img: imgOcr,
    fact: 'Mengekstrak instruksi dokter dalam hitungan detik tanpa input manual.',
    desc: 'Ucapkan selamat tinggal pada kerumitan memasukkan nama obat satu per satu. Dengan teknologi Deep OCR, cukup potret resep atau kemasan obat Anda, dan TemanPulih akan secara otomatis membaca, mengkategorikan, dan menjadwalkan dosis Anda dengan akurasi klinis.'
  },
  {
    id: '02', label: 'Otomatis',
    title: 'Pengingat Obat.',
    img: imgMed,
    fact: '80% pasien TemanPulih berhasil menjaga kepatuhan dosis secara konsisten.',
    desc: 'Pemulihan sangat bergantung pada kepatuhan. Algoritma kami memastikan tidak ada dosis yang terlewat dengan notifikasi berlapis. Dari obat harian hingga resep sementara, jadwal diatur secara pintar menyesuaikan ritme sirkadian dan jam biologis Anda.'
  },
  {
    id: '03', label: 'Asisten AI',
    title: 'Chatbot Medis 24/7.',
    img: imgChat,
    fact: 'Respons instan berdasarkan basis data medis tervalidasi.',
    desc: 'Punya pertanyaan jam 2 pagi tentang efek samping atau interaksi obat? Asisten AI kami dilatih khusus untuk menganalisis kekhawatiran ringan, memberikan panduan interaksi farmasi, dan menenangkan Anda di momen kritis kapan pun Anda butuhkan.'
  },
  {
    id: '04', label: 'Sinkronisasi',
    title: 'Airy Family Sync.',
    img: imgSync,
    fact: 'Pantau pemulihan orang terkasih dari jarak jauh, secara real-time.',
    desc: 'Pemulihan adalah proses komunal. Hubungkan ekosistem medis Anda dengan anggota keluarga atau pengasuh. Mereka akan menerima pembaruan kepatuhan obat dan peringatan kritis, memastikan Anda tidak pernah berjalan sendirian menuju kesembuhan.'
  },
];

const FeatureBlock = ({ feature, index, setActiveIndex }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { margin: "-50% 0px -50% 0px" });

  useEffect(() => {
    if (isInView) {
      setActiveIndex(index);
    }
  }, [isInView, index, setActiveIndex]);

  return (
    <div ref={ref} className="p-feature-block">
      <div className="p-feature-block-img-wrapper">
        <img src={feature.img} alt={feature.title} />
      </div>
      <div className="p-feature-block-content">
        <h3 className="p-feature-block-title">{feature.title}</h3>
        <p className="p-feature-block-desc">{feature.desc}</p>
        <div className="p-feature-sneak">
          <strong>Wawasan Arsitektur Medis</strong>
          {feature.fact}
        </div>
      </div>
    </div>
  );
};

const PelajariFeaturesSlider = () => {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <section className="p-features-split" data-theme="light">
      <div className="p-features-left">
        <div className="p-features-nav">
          <h2 className="p-features-nav-title">Ekosistem Fitur.</h2>
          <ul className="p-features-list">
            {features.map((f, i) => (
              <li key={f.id} className={`p-features-list-item ${i === activeIndex ? 'active' : ''}`}>
                <span className="p-features-list-num">{f.id}</span>
                {f.label}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="p-features-right">
        {features.map((f, i) => (
          <FeatureBlock key={f.id} feature={f} index={i} setActiveIndex={setActiveIndex} />
        ))}
      </div>
    </section>
  );
};

export default PelajariFeaturesSlider;
