import FamilySectionHeader from '../../ui/family/FamilySectionHeader';
import FamilyRequestCard from './FamilyRequestCard';

const FamilyPendingSection = ({ title, requests, onApprove, onReject, processingRequestId }) => {
  if (requests.length === 0) return null;

  return (
    <section className="family-section family-pending-section">
      <FamilySectionHeader title={title} count={requests.length} />
      <div className="family-request-list">
        {requests.map((request) => (
          <FamilyRequestCard
            key={request.id}
            request={request}
            onApprove={onApprove}
            onReject={onReject}
            isProcessing={processingRequestId === request.id}
          />
        ))}
      </div>
    </section>
  );
};

export default FamilyPendingSection;
