import { motion } from 'framer-motion';
const img1 = 'https://placehold.co/800x1000/3D5C4D/F4F1ED?text=Gallery+1';
const img2 = 'https://placehold.co/600x800/C4653A/F4F1ED?text=Gallery+2';
const img3 = 'https://placehold.co/1000x800/3D5C4D/F4F1ED?text=Gallery+3';
const img4 = 'https://placehold.co/800x1200/C4653A/F4F1ED?text=Gallery+4';

const PelajariGallery = () => (
  <section className="p-gallery-section" data-theme="light">
    <motion.div
      className="p-gallery-intro"
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
    >
      <h2>Kualitas yang terasa di setiap sentuhan.</h2>
      <p>
        Setiap piksel dirancang dengan penuh perhatian — dari antarmuka yang bersih
        hingga alur yang intuitif — mencerminkan komitmen kami terhadap kesehatan Anda.
      </p>
    </motion.div>

    <div className="p-gallery-grid">
      {[img1, img2, img3, img4].map((src, i) => (
        <motion.div
          key={i}
          className={`p-gallery-item p-gallery-item-${i + 1}`}
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 1, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
        >
          <img src={src} alt={`Gallery ${i + 1}`} />
        </motion.div>
      ))}
    </div>
  </section>
);

export default PelajariGallery;
