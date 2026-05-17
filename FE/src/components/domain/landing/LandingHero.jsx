import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { HiOutlineArrowRight } from 'react-icons/hi2';
import { Link } from 'react-router-dom';
import Navbar from '../../layout/Navbar';
import heroBG from '../../../assets/images/hero-medical-BG.png';
import heroObj from '../../../assets/images/hero-medical-object.png';
import hero3D from '../../../assets/images/hero-medical-3d.png';

const LandingHero = () => {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  });

  // Parallax offsets for mobile
  const yMobileObj = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const yMobileContent = useTransform(scrollYProgress, [0, 1], [0, -80]);

  // Parallax offsets for desktop
  const yDesktopBgText = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const yDesktopCenterpiece = useTransform(scrollYProgress, [0, 1], [0, -150]);
  const yDesktopTagline = useTransform(scrollYProgress, [0, 1], [0, -50]);

  return (
    <section className="hero" id="hero" ref={containerRef}>
      <Navbar />

      {/* ── Mobile: Original fullscreen image hero ── */}
      <div className="hero-mobile">
        <div className="hero-visual-card">
          <img 
            src={heroBG} 
            className="hero-visual-bg" 
            alt="Pendamping Pemulihan" 
            loading="eager"
          />
          <motion.img 
            src={heroObj} 
            className="hero-visual-obj" 
            style={{ y: yMobileObj }}
            alt="" 
            aria-hidden="true"
          />
        </div>
        <div className="hero-overlay" />
        <motion.div className="hero-content" style={{ y: yMobileContent }}>
          <div className="hero-tag">
            <span className="hero-tag-line" aria-hidden="true" />
            Pendamping pemulihan
          </div>
          <h1 className="hero-title">
            Pulih Lebih<br />Aman &amp; Terarah
          </h1>
          <p className="hero-desc">
            Kelola jadwal obat, scan resep dengan AI, dan konsultasi chatbot medis — dalam satu genggaman.
          </p>
          <div className="hero-cta">
            <Link to="/register" className="btn-primary">
              Mulai Sekarang <HiOutlineArrowRight size={16} />
            </Link>
            <Link to="/pelajari" className="btn-outline">
              Pelajari
            </Link>
          </div>
        </motion.div>
        <div className="hero-scroll" aria-hidden="true">
          <span className="scroll-dot" />
          <span className="scroll-dot" />
          <span className="scroll-dot" />
        </div>
      </div>

      {/* ── Desktop: Floema-style editorial hero ── */}
      <div className="hero-desktop">
        <div className="hero-main-visual">
          {/* Giant display typography centered */}
          <motion.div className="hero-display-text" style={{ y: yDesktopBgText }} aria-hidden="true">
            <span className="hero-display-line">Teman</span>
            <span className="hero-display-line">Pulih<span className="hero-display-dot">.</span></span>
          </motion.div>

          {/* 3D Medical centerpiece - Centered and slightly lower */}
          <motion.div className="hero-centerpiece" style={{ y: yDesktopCenterpiece }}>
            <img 
              src={hero3D} 
              alt="Pendamping medis profesional" 
              className="hero-3d-img"
              loading="eager"
            />
          </motion.div>
        </div>

        {/* Left side: Tagline and CTA */}
        <motion.div className="hero-tagline" style={{ y: yDesktopTagline }}>
          <p className="hero-tagline-text">
            Rethinking recovery<br />beyond expectations
          </p>
          <div className="hero-line-short"></div>
          <a href="#services" className="hero-scroll-cta">
            Mulai perjalanan pulih ↓
          </a>
        </motion.div>
      </div>
    </section>
  );
};

export default LandingHero;
