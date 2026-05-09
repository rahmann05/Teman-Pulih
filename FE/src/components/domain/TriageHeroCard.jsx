import React from 'react';
import { FiAlertTriangle, FiCheckCircle } from "react-icons/fi";

const TriageHeroCard = ({ status, message }) => {
  const isAlert = status === 'alert';

  return (
    <div className={`triage-card ${isAlert ? 'alert' : 'safe'}`} data-testid="triage-hero-card">
      <div className="triage-card-top">
        {isAlert ?         <FiAlertTriangle className="triage-icon triage-alert" size={24} /> :         <FiCheckCircle className="triage-icon triage-normal" size={24} />}
        <span>{isAlert ? 'Perhatian diperlukan' : 'Status Terkini'}</span>
      </div>
      <h2 className="triage-message">{message}</h2>
      {isAlert && <button className="glass-btn">Kirim Pengingat</button>}
    </div>
  );
};

export default TriageHeroCard;
