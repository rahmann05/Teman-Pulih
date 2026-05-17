import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import imgHero from '../../../assets/images/dashboard-hero-patient.png';

const PelajariHero = () => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });

  // Parallax effects
  const textY = useTransform(scrollYProgress, [0, 1], ['0%', '-30%']);
  const imgY = useTransform(scrollYProgress, [0, 1], ['0%', '20%']);
  
  return (
    <section ref={ref} className="p-hero-sustainability" data-theme="light">
      <div className="p-hero-sus-content">
        <motion.div 
          className="p-hero-sus-text"
          style={{ y: textY }}
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.16,1,0.3,1], delay: 0.2 }}
            className="p-hero-sus-pill"
          >
            Pusat Pengetahuan
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: [0.16,1,0.3,1], delay: 0.3 }}
            className="p-hero-sus-heading"
          >
            Merancang<br />
            ruang untuk<br />
            pemulihan.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: [0.16,1,0.3,1], delay: 0.4 }}
            className="p-hero-sus-desc"
          >
            Pelajari bagaimana ekosistem digital kami didesain khusus 
            menggunakan prinsip psikologi klinis untuk mendukung perjalanan mental Anda.
          </motion.p>
        </motion.div>

        <div className="p-hero-sus-visual">
          <div className="p-hero-sus-img-container">
            <motion.img
              src={imgHero}
              alt="Editorial"
              style={{ y: imgY }}
              initial={{ scale: 1.1, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 1.5, ease: [0.16,1,0.3,1] }}
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default PelajariHero;
