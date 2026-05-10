import { useEffect } from 'react';
import '../../styles/features/LandingPage.css';
import LandingHero from '../../components/domain/LandingHero';
import LandingServiceChips from '../../components/domain/LandingServiceChips';
import LandingFeatureGrid from '../../components/domain/LandingFeatureGrid';
import LandingStats from '../../components/domain/LandingStats';
import LandingSteps from '../../components/domain/LandingSteps';
import LandingTestimonial from '../../components/domain/LandingTestimonial';
import LandingBottomCTA from '../../components/domain/LandingBottomCTA';
import Footer from '../../components/layout/Footer';

const LandingPage = () => {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add('visible');
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -30px 0px' }
    );
    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="landing-page">
      <LandingHero />
      <LandingServiceChips />
      <LandingFeatureGrid />
      <LandingStats />
      <LandingSteps />
      <LandingTestimonial />
      <LandingBottomCTA />
      <Footer />
    </div>
  );
};

export default LandingPage;
