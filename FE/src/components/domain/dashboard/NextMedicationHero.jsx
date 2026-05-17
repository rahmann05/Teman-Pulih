import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { LuPill } from 'react-icons/lu';
import heroImg from '../../../assets/images/feature-medication.png';

const NextMedicationHero = ({
  time,
  medName,
  instruction,
  id,
  medicationId,
  scheduleId,
  onMarkTaken
}) => {
  const containerRef = useRef(null);
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'] // Tailored for top-of-page bento hero
  });

  // Moderated parallax calculations for a smooth, balanced effect on the image
  const imgY = useTransform(scrollYProgress, [0, 1], ['-22%', '22%']);

  return (
    <div ref={containerRef} className="split-bento-hero" data-testid="next-med-hero">
      <div className="hero-glass-content-pane">
        <div className="hero-content-header">
          <div className="hero-badge-pill">
            <LuPill />
            <span>OBAT BERIKUTNYA</span>
          </div>
          {medName !== 'Tidak ada obat terjadwal' && <span className="hero-status-dot"></span>}
        </div>
        
        <div className="hero-main-typography">
          <h2 className="hero-giant-time">{time}</h2>
          <h3 className="hero-med-name">{medName}</h3>
          <p className="hero-med-desc">{instruction}</p>
        </div>
        
        {id && (
          <div className="hero-action-footer">
            <button
              className="btn-primary"
              type="button"
              onClick={() => onMarkTaken && onMarkTaken(id, medicationId, scheduleId)}
            >
              Sudah Diminum
            </button>
          </div>
        )}
      </div>

      <div className="hero-image-pane">
        <motion.img 
          style={{ y: imgY, scale: 1.35 }} 
          src={heroImg} 
          alt="Medication illustration" 
          className="hero-bento-img" 
        />
      </div>
    </div>
  );
};

export default NextMedicationHero;
