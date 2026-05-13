import { HiOutlineArrowRight } from 'react-icons/hi2';
import { Link } from 'react-router-dom';
import Navbar from '../../layout/Navbar';
import heroImg from '../../../assets/images/hero-recovery.png';
import HeroCard from '../../ui/HeroCard';

const LandingHero = () => {
  return (
    <section className="hero">
      <HeroCard backgroundImage={heroImg} className="hero-container-ui" overlay={true}>
        <Navbar />

        <div className="hero-content">
          <div className="hero-tag">
            <span className="hero-tag-line" aria-hidden="true" />
            Pendamping pemulihan
          </div>
          <h1 className="hero-title">
            Pulih Lebih<br />Aman & Terarah
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
      </HeroCard>
    </section>
  );
};

export default LandingHero;
