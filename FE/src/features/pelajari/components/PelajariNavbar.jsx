import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const PelajariNavbar = () => {
  const [isDark, setIsDark] = useState(false);

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
      <Link to="/" className="p-navbar-logo">TemanPulih.</Link>
      <button className="p-navbar-menu" aria-label="Menu">
        <span className="p-navbar-line" />
        <span className="p-navbar-line" />
      </button>
    </nav>
  );
};

export default PelajariNavbar;
