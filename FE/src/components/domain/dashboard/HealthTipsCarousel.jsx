import { useEffect, useMemo, useRef, useState } from 'react';

const TIPS = [
  {
    id: 1,
    text: 'Pentingnya minum air putih setelah minum obat antibiotik.',
    image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=1200&q=85',
  },
  {
    id: 2,
    text: 'Latihan pernapasan ringan untuk mempercepat pemulihan.',
    image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&q=85',
  },
  {
    id: 3,
    text: 'Tidur cukup 7–8 jam agar proses pemulihan berjalan optimal.',
    image: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1200&q=85',
  },
];

const HealthTipsCarousel = () => {
  const tips = useMemo(() => TIPS, []);
  const [activeIndex, setActiveIndex] = useState(() => Math.floor(Math.random() * tips.length));
  const containerRef = useRef(null);
  const [visibleCount, setVisibleCount] = useState(1);

  useEffect(() => {
    if (tips.length <= 1) return undefined;
    const intervalId = setInterval(() => {
      setActiveIndex((prev) => {
        let nextIndex = prev;
        while (nextIndex === prev) {
          nextIndex = Math.floor(Math.random() * tips.length);
        }
        return nextIndex;
      });
    }, 4000);
    return () => clearInterval(intervalId);
  }, [tips.length]);

  // Resize observer to decide how many cards to show (1..3)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;

    const CARD_MAX = 260; // match CSS max-width
    const GAP = 16; // approximate gap (var(--space-4))

    const compute = () => {
      const w = el.clientWidth || el.getBoundingClientRect().width || 0;
      if (w >= CARD_MAX * 3 + GAP * 2) setVisibleCount(3);
      else if (w >= CARD_MAX * 2 + GAP) setVisibleCount(2);
      else setVisibleCount(1);
    };

    compute();
    let ro;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => compute());
      ro.observe(el);
    } else {
      window.addEventListener('resize', compute);
    }

    return () => {
      if (ro) ro.disconnect();
      else window.removeEventListener('resize', compute);
    };
  }, []);

  const activeTip = tips[activeIndex];

  // Build array of tips to render based on visibleCount, centering activeIndex when possible
  const itemsToShow = [];
  const half = Math.floor(visibleCount / 2);
  let start = activeIndex - half;
  // Ensure start is within 0..len-1 via modulo logic
  for (let i = 0; i < visibleCount; i += 1) {
    const idx = (start + i + tips.length) % tips.length;
    itemsToShow.push(tips[idx]);
  }

  return (
    <div className="dashboard-section tips-section" data-testid="health-tips">
      <div className="section-header">
        <h3 className="section-title">Tips Pemulihan</h3>
      </div>
      <div className="carousel-container" ref={containerRef}>
        <div className="carousel-inner">
          {itemsToShow.map((tip) => {
            const isActive = tip.id === activeTip.id;
            return (
              <div key={tip.id} className={`tip-card ${isActive ? 'is-active' : ''}`} aria-hidden={!isActive}>
                <img src={tip.image} alt={tip.text} className="tip-bg-image" loading="lazy" />
                <div className="tip-content">
                  <span className="tip-eyebrow">Tips</span>
                  <p className="tip-text">{tip.text}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default HealthTipsCarousel;
