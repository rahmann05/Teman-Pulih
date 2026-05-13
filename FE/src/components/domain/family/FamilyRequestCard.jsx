const FamilyRequestCard = ({ request, onApprove, onReject, isProcessing }) => (
  <div className="family-request-card">
    <div className="family-request-header">
      <div className="family-request-avatar">{request.initials}</div>
      <div className="family-request-info">
        <div className="family-request-name">{request.name}</div>
        <div className="family-request-email">{request.email || '-'}</div>
        {request.dateLabel && (
          <div className="family-request-date">{request.dateLabel}</div>
        )}
      </div>
    </div>

    <div className="family-request-actions">
      <button
        type="button"
        className="family-approve-btn"
        onClick={() => onApprove(request.id)}
        disabled={isProcessing}
      >
        Setujui
      </button>
      <button
        type="button"
        className="family-reject-btn"
        onClick={() => onReject(request.id)}
        disabled={isProcessing}
      >
        Tolak
      </button>
    </div>
  </div>
);

export default FamilyRequestCard;
