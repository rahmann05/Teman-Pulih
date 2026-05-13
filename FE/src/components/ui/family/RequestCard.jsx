/* src/components/ui/family/RequestCard.jsx */

const RequestCard = ({ initials, name, email, dateLabel, onApprove, onReject, isProcessing }) => (
  <div className="family-request-card">
    <div className="family-request-header">
      <div className="family-request-avatar">{initials}</div>
      <div className="family-request-info">
        <div className="family-request-name">{name}</div>
        <div className="family-request-email">{email || '-'}</div>
        {dateLabel && (
          <div className="family-request-date">{dateLabel}</div>
        )}
      </div>
    </div>

    <div className="family-request-actions">
      <button
        type="button"
        className="family-approve-btn"
        onClick={onApprove}
        disabled={isProcessing}
      >
        Setujui
      </button>
      <button
        type="button"
        className="family-reject-btn"
        onClick={onReject}
        disabled={isProcessing}
      >
        Tolak
      </button>
    </div>
  </div>
);

export default RequestCard;
