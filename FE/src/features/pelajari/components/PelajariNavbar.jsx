import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LuHeartPulse } from 'react-icons/lu';

const PelajariNavbar = () => {
  const [isDark, setIsDark] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      const darkSections = document.querySelectorAll('[data-theme="dark"]');
      let isOverDark = false;
      darkSections.forEach(section => {
        const rect = section.getBoundingClientRect();
        if (rect.top <= 40 && rect.bottom >= 40) isOverDark = true;
      });
      setIsDark(isOverDark);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav
      className="p-navbar"
      style={{ color: isDark ? '#FFFFFF' : 'var(--text)' }}
    >
      <Link to="/" className="p-navbar-logo">
        <LuHeartPulse className="p-navbar-logo-icon" size={24} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
        <span style={{ verticalAlign: 'middle' }}>TemanPulih.</span>
      </Link>
      <button className="p-navbar-back-btn" onClick={() => navigate('/')} aria-label="Kembali">
        Kembali
      </button>
    </nav>
  );
};

export default PelajariNavbar;
