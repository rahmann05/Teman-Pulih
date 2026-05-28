import React, { useState, useEffect } from 'react';
import { LuArrowRight, LuChevronLeft, LuChevronRight, LuSparkles, LuX, LuGithub, LuLinkedin } from 'react-icons/lu';

const AboutCarousel = ({ teamMembers, initialActiveIndex = 0 }) => {
  const [activeIndex, setActiveIndex] = useState(initialActiveIndex);
  const [flippedCards, setFlippedCards] = useState({}); // Stores flipped state per card index

  // Auto flip back cards when active card changes (next, prev, or clicking another card)
  useEffect(() => {
    setFlippedCards({});
  }, [activeIndex]);

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % teamMembers.length);
  };

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + teamMembers.length) % teamMembers.length);
  };

  const handleCardClick = (index) => {
    if (index === activeIndex) {
      // Toggle flip only for active center card
      setFlippedCards((prev) => ({
        ...prev,
        [index]: !prev[index]
      }));
    } else {
      // Shift clicked card to center
      setActiveIndex(index);
    }
  };

  const getCardClass = (index) => {
    const diff = (index - activeIndex + teamMembers.length) % teamMembers.length;
    if (diff === 0) return 'active';
    if (diff === 1) return 'next';
    if (diff === 2) return 'far-next';
    if (diff === teamMembers.length - 1) return 'prev';
    if (diff === teamMembers.length - 2) return 'far-prev';
    return 'hidden';
  };

  return (
    <section className="a-carousel-section">
      <h2 className="a-carousel-title">Anggota Tim Teman Pulih</h2>
      <div className="a-carousel-subtitle">
        <LuSparkles size={14} /> Klik kartu untuk Flip
      </div>

      {/* Viewport contains 3D transformed deck */}
      <div className="a-carousel-viewport">
        {teamMembers.map((member, idx) => {
          const cardClass = getCardClass(idx);
          const isFlipped = !!flippedCards[idx];

          return (
            <div
              key={member.id}
              className={`a-card-stage ${cardClass}`}
              onClick={() => handleCardClick(idx)}
            >
              <div className="a-card-container">
                <div className={`a-card-inner ${isFlipped ? 'is-flipped' : ''}`}>

                  {/* CARD FRONT: Portrait, Name, Role & Bio */}
                  <div className="a-card-front">
                    <div className="a-card-badge">{member.path}</div>
                    <div className="a-card-image-section">
                      <img src={member.img} alt={member.name} className={`a-member-img-${member.id}`} />
                    </div>
                    <div className="a-card-info-section">
                      <div className="a-card-heading">
                        <h3 className="a-card-name">{member.name}</h3>
                        <span className="a-card-role">{member.role}</span>
                      </div>
                      <p className="a-card-bio">"{member.bio}"</p>
                      <div className="a-card-footer-action">
                        <span>Balik Kartu (Flip)</span>
                        <LuArrowRight size={16} />
                      </div>
                    </div>
                  </div>

                  {/* CARD BACK: Developer Profile, Stack & Links */}
                  <div className="a-card-back" onClick={(e) => e.stopPropagation()}>
                    <div className="a-card-back-header">
                      <div>
                        <h4 className="a-card-back-name">{member.name}</h4>
                        <span className="a-card-back-role">{member.role}</span>
                      </div>
                      <button
                        className="a-card-back-close"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFlippedCards(prev => ({ ...prev, [idx]: false }));
                        }}
                        aria-label="Kembali"
                      >
                        <LuX size={16} />
                      </button>
                    </div>

                    <div className="a-card-back-content">
                      <p className="a-card-quote">
                        "{member.quote}"
                      </p>

                      <div>
                        <h5 className="a-card-stack-title">Keahlian &amp; Tech Stack</h5>
                        <div className="a-tech-tags">
                          {member.techStack.map((tech, tIdx) => (
                            <span key={tIdx} className="a-tag">{tech}</span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="a-card-back-footer">
                      <a href={member.linkedin} target="_blank" rel="noreferrer" className="a-social-btn linkedin">
                        <LuLinkedin size={16} /> Hubungkan di LinkedIn
                      </a>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Carousel Controls */}
      <div className="a-carousel-controls">
        <button className="a-carousel-btn" onClick={handlePrev} aria-label="Sebelumnya">
          <LuChevronLeft size={24} />
        </button>
        <div className="a-carousel-indicator">
          <span>{activeIndex + 1}</span> / {teamMembers.length}
        </div>
        <button className="a-carousel-btn" onClick={handleNext} aria-label="Selanjutnya">
          <LuChevronRight size={24} />
        </button>
      </div>
    </section>
  );
};

export default AboutCarousel;
