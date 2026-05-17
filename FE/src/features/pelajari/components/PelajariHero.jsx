import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import img1 from '../../../assets/images/pelajari/hero-1.png';
import img2 from '../../../assets/images/pelajari/hero-2.png';
import img3 from '../../../assets/images/pelajari/hero-3.png';
import hero3d from '../../../assets/images/pelajari/hero-3d.png';
const PelajariHero = () => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });

  const titleY   = useTransform(scrollYProgress, [0, 1], ['0%', '-40%']);
  const img1Y    = useTransform(scrollYProgress, [0, 1], ['0%', '-25%']);
  const img2Y    = useTransform(scrollYProgress, [0, 1], ['0%', '-15%']);
  const img3Y    = useTransform(scrollYProgress, [0, 1], ['0%', '-35%']);
  const objectY  = useTransform(scrollYProgress, [0, 1], ['0%', '-20%']);
  const objectSc = useTransform(scrollYProgress, [0, 1], [1, 1.18]);

  return (
    <section ref={ref} className="p-hero" data-theme="light">
      {/* Floating Images — contained within hero overflow:hidden */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 2 }}>
        <motion.img
          src={img1}
          alt=""
          aria-hidden
          className="p-hero-img p-hero-img-1"
          style={{ y: img1Y }}
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1.2, delay: 0.4, ease: [0.16,1,0.3,1] }}
        />
        <motion.img
          src={img2}
          alt=""
          aria-hidden
          className="p-hero-img p-hero-img-2"
          style={{ y: img2Y }}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1.2, delay: 0.6, ease: [0.16,1,0.3,1] }}
        />
        <motion.img
          src={img3}
          alt=""
          aria-hidden
          className="p-hero-img p-hero-img-3"
          style={{ y: img3Y }}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.8, ease: [0.16,1,0.3,1] }}
        />
      </div>


      {/* 3D Centerpiece */}
      <motion.img
        src={hero3d}
        alt=""
        aria-hidden
        style={{ y: objectY, scale: objectSc, position: 'absolute', zIndex: 5,
          width: 'clamp(280px, 30vw, 480px)',
          filter: 'drop-shadow(0 40px 80px rgba(196,101,58,0.18))',
          pointerEvents: 'none'
        }}
      />

      {/* Giant Title */}
      <motion.h1
        className="p-hero-title"
        style={{ y: titleY }}
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.4, ease: [0.16,1,0.3,1] }}
      >
        Merancang ruang<br />untuk pemulihan.
      </motion.h1>

      {/* Narrative — bottom left */}
      <motion.div
        className="p-hero-narrative"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.8, ease: [0.16,1,0.3,1] }}
      >
        <p>
          Pemulihan medis seringkali terasa sepi dan membingungkan.
          TemanPulih hadir sebagai pendamping persisten yang mendesain
          ulang cara Anda merawat diri.
        </p>
      </motion.div>

      {/* Scroll Indicator */}
      <div className="p-hero-scroll-indicator" aria-hidden>
        <span>Gulir ke bawah</span>
        <div className="p-hero-scroll-line" />
      </div>
    </section>
  );
};

export default PelajariHero;
