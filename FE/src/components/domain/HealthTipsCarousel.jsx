import React from 'react';

const HealthTipsCarousel = () => {
  const tips = [
    { id: 1, text: 'Pentingnya minum air putih setelah minum obat antibiotik.', image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=400&q=80' },
    { id: 2, text: 'Latihan pernapasan ringan untuk mempercepat pemulihan.', image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=400&q=80' },
  ];

  return (
    <div className="timeline-section" data-testid="health-tips">
      <div className="section-header">
        <h3 className="section-title">Tips Pemulihan</h3>
      </div>
      <div className="carousel-container">
        {tips.map((tip) => (
          <div key={tip.id} className="tip-card">
            <img src={tip.image} alt="" className="tip-bg-image" loading="lazy" />
            <div className="tip-overlay"></div>
            <div className="tip-text">{tip.text}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HealthTipsCarousel;
