import { HiOutlineArrowRight, HiOutlineEnvelope } from 'react-icons/hi2';
import { Link } from 'react-router-dom';
import Navbar from '../../layout/Navbar';
import heroImg from '../../../assets/images/hero-recovery.png';
import hero3D from '../../../assets/images/hero-medical-3d.png';
import heroShadow from '../../../assets/images/hero-shadow-overlay.png';
import heroDoctor from '../../../assets/images/hero-doctor-consult.png';

const LandingHero = () => {
  return (
    <section className="hero" id="hero">
      <Navbar />

      {/* ── Mobile: Original fullscreen image hero ── */}
      <div className="hero-mobile">
        <img 
          src={heroImg} 
          className="hero-img" 
          alt="Pendamping Pemulihan" 
          loading="eager"
        />
        <div className="hero-overlay" />
        <div className="hero-content">
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
            <button className="btn-outline" type="button">
              Pelajari
            </button>
          </div>
        </div>
        <div className="hero-scroll" aria-hidden="true">
          <span className="scroll-dot" />
          <span className="scroll-dot" />
          <span className="scroll-dot" />
        </div>
      </div>

      {/* ── Desktop: Floema-style editorial hero ── */}
      <div className="hero-desktop">
        {/* Giant editorial typography */}
        <div className="hero-display-text" aria-hidden="true">
          <span className="hero-display-line">Teman</span>
          <span className="hero-display-line">Pulih<span className="hero-display-dot">.</span></span>
        </div>

        {/* Accessible h1 for screen readers */}
        <h1 className="sr-only">Teman Pulih — Pendamping Pemulihan Pasca Berobat</h1>

        {/* 3D Medical centerpiece overlapping text */}
        <div className="hero-centerpiece">
          <img 
            src={hero3D} 
            alt="Pendamping medis profesional" 
            className="hero-3d-img"
            loading="eager"
          />
        </div>

        {/* Bottom-left tagline */}
        <div className="hero-tagline">
          <p className="hero-tagline-text">
            Pendamping pemulihan<br />pasca berobat
          </p>
          <a href="#services" className="hero-scroll-cta">
            Mulai perjalanan pulih ↓
          </a>
        </div>

        {/* Bottom-right floating contact card */}
        <div className="hero-float-card">
          <div className="hero-float-card-img">
            <img src={heroDoctor} alt="Konsultasi dokter" />
          </div>
          <div className="hero-float-card-body">
            <p className="hero-float-card-text">
              Pemulihan dimulai dari percakapan yang baik.
            </p>
            <Link to="/register" className="hero-float-card-btn">
              <HiOutlineEnvelope size={16} />
              <span>MULAI SEKARANG</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandingHero;
