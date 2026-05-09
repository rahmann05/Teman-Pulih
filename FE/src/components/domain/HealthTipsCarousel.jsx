const TIPS = [
  {
    id: 1,
    text: 'Pentingnya minum air putih setelah minum obat antibiotik.',
    image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 2,
    text: 'Latihan pernapasan ringan untuk mempercepat pemulihan.',
    image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 3,
    text: 'Tidur cukup 7–8 jam agar proses pemulihan berjalan optimal.',
    image: 'https://images.unsplash.com/photo-1531971736651-fc83da8fded4?auto=format&fit=crop&w=400&q=80',
  },
];

const HealthTipsCarousel = () => {
  return (
    <div data-testid="health-tips">
      <div className="section-header" style={{ padding: '0 var(--space-5)' }}>
        <h3 className="section-title">Tips Pemulihan</h3>
      </div>
      <div className="carousel-container">
        {TIPS.map((tip) => (
          <div key={tip.id} className="tip-card">
            <img src={tip.image} alt="" className="tip-bg-image" loading="lazy" aria-hidden="true" />
            <div className="tip-overlay" aria-hidden="true" />
            <p className="tip-text">{tip.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HealthTipsCarousel;
