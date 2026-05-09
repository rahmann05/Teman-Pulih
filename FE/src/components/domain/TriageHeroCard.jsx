import { LuTriangleAlert, LuCircleCheck } from 'react-icons/lu';
import heroImg from '../../assets/images/hero-recovery.png';

const TriageHeroCard = ({ status, message }) => {
  const isAlert = status === 'alert';

  return (
    <div
      className={`triage-card ${isAlert ? 'alert' : 'safe'}`}
      data-testid="triage-hero-card"
    >
      <img
        src={heroImg}
        alt=""
        className="triage-card-bg"
        aria-hidden="true"
        loading="eager"
      />
      <div className="triage-card-overlay" aria-hidden="true" />
      <div className="triage-card-body">
        <div className="triage-card-top">
          {isAlert ? (
            <LuTriangleAlert className="triage-icon" aria-hidden="true" />
          ) : (
            <LuCircleCheck className="triage-icon" aria-hidden="true" />
          )}
          <span>{isAlert ? 'Perhatian diperlukan' : 'Status Terkini'}</span>
        </div>
        <h2 className="triage-message">{message}</h2>
        {isAlert && (
          <button className="glass-btn" type="button">
            Kirim Pengingat
          </button>
        )}
      </div>
    </div>
  );
};

export default TriageHeroCard;
