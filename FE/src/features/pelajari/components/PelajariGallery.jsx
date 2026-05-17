import { motion } from 'framer-motion';

import img1 from '../../../assets/images/hero-doctor-consult.png';
import img2 from '../../../assets/images/feature-family-sync.png';
import img3 from '../../../assets/images/hero-medical-3d.png';

const PelajariGallery = () => (
  <section className="p-gallery-sus" data-theme="light">
    <div className="p-gallery-sus-intro">
      <motion.h2
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      >
        Kualitas yang terasa di setiap sentuhan.
      </motion.h2>
    </div>

    <div className="p-gallery-sus-grid">
      <motion.div 
        className="p-gallery-sus-item wide"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      >
        <img src={img3} alt="TemanPulih 3D Medical" />
      </motion.div>

      <motion.div 
        className="p-gallery-sus-item"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
      >
        <img src={img1} alt="Konsultasi Medis" />
      </motion.div>

      <motion.div 
        className="p-gallery-sus-item"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
      >
        <img src={img2} alt="Family Sync" />
      </motion.div>
    </div>
  </section>
);

export default PelajariGallery;
