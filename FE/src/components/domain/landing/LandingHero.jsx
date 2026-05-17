// src/components/domain/landing/LandingHero.jsx
import { useRef, useState, useCallback } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { HiOutlineArrowRight } from 'react-icons/hi2';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../layout/Navbar';
import heroBG from '../../../assets/images/hero-medical-BG.png';
import heroObj from '../../../assets/images/hero-medical-object.png';
import hero3D from '../../../assets/images/hero-medical-3d.png';

const LandingHero = () => {
  const containerRef = useRef(null);
  const [isExiting, setIsExiting] = useState(false);
  const navigate = useNavigate();

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

  /**
   * Cinematic hero zoom-in transition for mobile.
   * Triggers exit animation then navigates after 650ms.
   * On desktop viewports the hero-mobile div is hidden so we
   * just navigate immediately — the standard PageTransition handles it.
   */
  const handleAuthTransition = useCallback((destination) => {
    // Ensure we are at the top so the transition perfectly aligns
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setIsExiting(true);
    // Navigate after animation completes
    setTimeout(() => {
      navigate(destination);
    }, 700);
  }, [navigate]);

  return (
    <section className={`hero${isExiting ? ' is-exiting' : ''}`} id="hero" ref={containerRef}>
      <Navbar onAuthClick={handleAuthTransition} />

      {/* ── Mobile: Cinematic fullscreen image hero ── */}
      <div className={`hero-mobile${isExiting ? ' hero-zoom-exit' : ''}`}>
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
            {/* Use button instead of Link to intercept and trigger zoom animation */}
            <button
              className="btn-primary"
              onClick={() => handleAuthTransition('/register')}
              aria-label="Mulai Sekarang"
            >
              Mulai Sekarang <HiOutlineArrowRight size={16} />
            </button>
            <div className="hero-cta-secondary">
              <button
                className="btn-outline"
                onClick={() => handleAuthTransition('/login')}
                aria-label="Masuk"
              >
                Masuk
              </button>
              <button
                className="btn-outline"
                onClick={() => navigate('/pelajari')}
                aria-label="Pelajari"
              >
                Pelajari
              </button>
            </div>
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
