import React from 'react';
import { LuAlertCircle, LuCheckCircle } from 'react-icons/lu';

const TriageHeroCard = ({ status, message }) => {
  const isAlert = status === 'alert';

  return (
    <div className={`triage-card ${isAlert ? 'alert' : 'safe'}`} data-testid="triage-hero-card">
      <div className="triage-card-top">
        {isAlert ? <LuAlertCircle className="triage-icon" /> : <LuCheckCircle className="triage-icon" />}
        <span>{isAlert ? 'Perhatian diperlukan' : 'Status Terkini'}</span>
      </div>
      <h2 className="triage-message">{message}</h2>
      {isAlert && <button className="glass-btn">Kirim Pengingat</button>}
    </div>
  );
};

export default TriageHeroCard;
