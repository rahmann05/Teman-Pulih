import RequestCard from '../../ui/family/RequestCard';

const FamilyRequestCard = ({ request, onApprove, onReject, isProcessing }) => (
  <RequestCard
    initials={request.initials}
    name={request.name}
    email={request.email}
    dateLabel={request.dateLabel}
    onApprove={() => onApprove(request.id)}
    onReject={() => onReject(request.id)}
    isProcessing={isProcessing}
  />
);

export default FamilyRequestCard;
