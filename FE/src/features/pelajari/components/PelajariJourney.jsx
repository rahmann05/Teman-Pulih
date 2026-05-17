import { motion } from 'framer-motion';

const steps = [
  {
    id: '01',
    title: 'Pindai Resep Tanpa Celah',
    desc: 'Pemulihan Anda dimulai dengan menghilangkan friksi. Unggah atau potret resep Anda menggunakan teknologi Deep OCR, dan saksikan seluruh nama obat serta instruksi dosis ditarik secara otomatis dengan akurasi terkalibrasi tinggi.'
  },
  {
    id: '02',
    title: 'Jadwal Pintar Bekerja',
    desc: 'Bukan sekadar alarm. Mesin pengingat obat kami mengelola rutinitas Anda berdasarkan rekomendasi waktu medis terbaik, memastikan interval antar obat dipatuhi, meminimalisir risiko interaksi, dan membangun kepatuhan yang solid.'
  },
  {
    id: '03',
    title: 'Eksplorasi Medis Berbasis AI',
    desc: 'Apakah obat ini aman diminum dengan kopi? Chatbot Medis 24/7 kami hadir untuk menjawab setiap pertanyaan Anda secara instan, dirancang secara eksklusif berdasarkan data farmasi yang valid, aman, dan dapat diandalkan.'
  },
  {
    id: '04',
    title: 'Dukungan Lingkaran Dalam',
    desc: 'Melalui fitur Airy Family Sync, perjalanan ini tak lagi sepi. Berikan akses pantau kepada keluarga atau wali Anda agar mereka dapat melihat kepatuhan dosis secara langsung, merajut harmoni dan kedamaian batin bagi semua pihak.'
  }
];

const PelajariJourney = () => {
  return (
    <section className="p-journey-sus" data-theme="dark">
      <div className="p-journey-sus-header">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          Konvergensi harmonis antara AI, kemudahan akses, dan dukungan keluarga dalam satu tapak jalan.
        </motion.h2>
      </div>

      <div className="p-journey-sus-grid">
        {steps.map((step, i) => {
          const isRight = i % 2 !== 0;
          return (
            <motion.div
              key={step.id}
              className={`p-journey-sus-block ${isRight ? 'block-right' : 'block-left'}`}
              initial={{ opacity: 0, y: 100 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-10% 0px -10% 0px' }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="p-journey-sus-num">{step.id}</div>
              <div className="p-journey-sus-content">
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
};

export default PelajariJourney;
