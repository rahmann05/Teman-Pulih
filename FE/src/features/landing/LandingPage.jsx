import { useEffect } from 'react';
import '../../styles/features/LandingPage.css';
import LandingHero from '../../components/domain/landing/LandingHero';
import LandingServiceChips from '../../components/domain/landing/LandingServiceChips';
import LandingFeatureGrid from '../../components/domain/landing/LandingFeatureGrid';
import LandingStats from '../../components/domain/landing/LandingStats';
import LandingSteps from '../../components/domain/landing/LandingSteps';
import LandingTestimonial from '../../components/domain/landing/LandingTestimonial';
import LandingBottomCTA from '../../components/domain/landing/LandingBottomCTA';
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
