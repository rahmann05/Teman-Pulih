import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LuArrowRight } from 'react-icons/lu';

import PelajariNavbar from '@/features/pelajari/components/PelajariNavbar';
import '@/features/about/about.css';

import { teamMembers, teamRoadmaps } from '../data/teamData';
import AboutHero from '../components/AboutHero';
import AboutCarousel from '../components/AboutCarousel';
import AboutTimeline from '../components/AboutTimeline';

const AboutPage = () => {
  const location = useLocation();
  const initialActiveIndex = location.state?.activeIndex ?? 0;

  useEffect(() => {
    if (location.state?.activeIndex !== undefined) {
      // Small timeout to allow component rendering before scroll
      const timer = setTimeout(() => {
        const carouselSec = document.querySelector('.a-carousel-section');
        if (carouselSec) {
          carouselSec.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      return () => clearTimeout(timer);
    } else {
      window.scrollTo(0, 0);
    }
  }, [location]);

  return (
    <div className="about-page">
      <PelajariNavbar />

      {/* ── HERO SECTION ── */}
      <AboutHero />

      {/* ── 3D DEPTH-WISE CAROUSEL SECTION ── */}
      <AboutCarousel teamMembers={teamMembers} initialActiveIndex={initialActiveIndex} />

      {/* ── DEDICATED SMART CARD TIMELINE ROADMAP SECTION ── */}
      <AboutTimeline teamMembers={teamMembers} teamRoadmaps={teamRoadmaps} />

      {/* ── FOOTER ── */}
      <footer className="a-footer-sus">
        <div className="a-footer-sus-content">
          <div className="a-footer-sus-top">
            <h2 className="a-footer-heading">
              kembali ke beranda<br />
              dan pantau kesehatan.
            </h2>
            <Link to="/" className="a-footer-btn">
              Kembali ke Beranda <LuArrowRight />
            </Link>
          </div>
          <div className="a-footer-bottom">
            <span>© 2026 TemanPulih · CC26-PSU347</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AboutPage;
