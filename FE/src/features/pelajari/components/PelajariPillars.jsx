import { motion } from 'framer-motion';

const pillars = [
  {
    id: '01',
    title: 'Privasi Terenkripsi',
    desc: 'Setiap data rekam medis dan jurnal personal diamankan dengan standar enkripsi medis tertinggi. Kepercayaan Anda adalah fondasi kami.',
  },
  {
    id: '02',
    title: 'Pendekatan Empatik',
    desc: 'Sistem pengingat dan peringatan dirancang untuk terasa seperti dorongan dari sahabat, bukan teguran dari mesin.',
  },
  {
    id: '03',
    title: 'Aksesibilitas Total',
    desc: 'Dari pengaturan kontras tinggi hingga tipografi ramah-baca, kami memastikan TemanPulih dapat digunakan oleh semua lapisan pengguna.',
  },
];

const PelajariPillars = () => (
  <section className="p-pillars-section" data-theme="dark">
    <motion.h2
      className="p-pillars-title"
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
    >
      Dirancang di atas fondasi<br />kepercayaan medis.
    </motion.h2>

    <div className="p-pillars-list">
      {pillars.map((p, i) => (
        <motion.div
          key={p.id}
          className="p-pillar-row"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.8, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="p-pillar-id-title">
            <span className="p-pillar-num">{p.id}.</span>
            <h3 className="p-pillar-title">{p.title}</h3>
          </div>
          <p className="p-pillar-desc">{p.desc}</p>
        </motion.div>
      ))}
    </div>
  </section>
);

export default PelajariPillars;
