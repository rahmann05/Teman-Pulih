import { useEffect } from 'react';
import '@/features/landing/landing.css';
import LandingHero from '@/features/landing/components/LandingHero';
import LandingFeatureGrid from '@/features/landing/components/LandingFeatureGrid';
import LandingStats from '@/features/landing/components/LandingStats';
import LandingSteps from '@/features/landing/components/LandingSteps';
import LandingTestimonial from '@/features/landing/components/LandingTestimonial';
import LandingBottomCTA from '@/features/landing/components/LandingBottomCTA';
import Footer from '@/shared/layouts/Footer';

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
