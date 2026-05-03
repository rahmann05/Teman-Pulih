import React from 'react';
import { LuPill } from 'react-icons/lu';

const NextMedicationHero = ({ time, medName, instruction }) => {
  return (
    <div className="hero-card" data-testid="next-med-hero">
      <div className="hero-card-top">
        <LuPill className="hero-icon" />
        <span>{time}</span>
      </div>
      <div className="hero-card-middle">
        <h2 className="med-name">{medName}</h2>
        <p className="med-instruction">{instruction}</p>
      </div>
      <button className="glass-btn">Sudah Diminum</button>
    </div>
  );
};

export default NextMedicationHero;
