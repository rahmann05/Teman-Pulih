/**
 * MedicationProgressBar — shows dose completion as a filled bar + text.
 * @param {number} taken  - number of doses taken
 * @param {number} total  - total dose slots
 * @param {number|null} daysLeft - remaining days (null = no end date)
 */
const MedicationProgressBar = ({ taken = 0, total = 0, daysLeft = null }) => {
  const pct = total > 0 ? Math.min((taken / total) * 100, 100) : 0;

  return (
    <div className="med-progress-container">
      <div
        className="med-progress-bar-bg"
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${taken} dari ${total} dosis diminum`}
      >
        <div className="med-progress-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="med-progress-text">
        <span className="med-progress-taken">{taken}/{total} diminum</span>
        {daysLeft !== null && (
          <span>{daysLeft > 0 ? `Sisa ${daysLeft} hari` : 'Selesai'}</span>
        )}
      </div>
    </div>
  );
};

export default MedicationProgressBar;
