import { useNavigate } from 'react-router-dom';
import FamilySyncLayout from '../../components/layout/FamilySyncLayout';
import FamilyInviteCard from '../../components/domain/family/FamilyInviteCard';
import FamilyMemberList from '../../components/domain/family/FamilyMemberList';
import FamilyPendingSection from '../../components/domain/family/FamilyPendingSection';
import FamilyHeader from '../../components/ui/family/FamilyHeader';
import FamilySyncProvider from '../../context/FamilySyncProvider';
import { useFamilySyncContext } from '../../context/FamilySyncContext';
import '../../styles/features/FamilySync.css';

const FamilySyncContent = () => {
  const navigate = useNavigate();
  const {
    caregiverMode,
    loading,
    error,
    inviteCopy,
    inviteValue,
    inviteError,
    inviteStatus,
    isSending,
    processingRequestId,
    memberCards,
    pendingCards,
    sectionTitles,
    emptyStateMessage,
    handleInviteChange,
    handleInviteSubmit,
    handleApprove,
    handleReject,
  } = useFamilySyncContext();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate(caregiverMode ? '/caregiver/dashboard' : '/dashboard');
  };

  if (loading) {
    return (
      <FamilySyncLayout caregiverMode={caregiverMode}>
        <div className="family-skeleton">
          <div className="family-skeleton-block" style={{ height: 56 }} />
          <div className="family-skeleton-block" style={{ height: 180 }} />
          <div className="family-skeleton-block" style={{ height: 200 }} />
          <div className="family-skeleton-block" style={{ height: 200 }} />
        </div>
      </FamilySyncLayout>
    );
  }

  return (
    <FamilySyncLayout caregiverMode={caregiverMode}>
      <FamilyHeader title="Sinkronisasi Keluarga" onBack={handleBack} />

      {error && <div className="family-error">{error}</div>}

      <FamilyInviteCard
        title={inviteCopy.title}
        description={inviteCopy.description}
        placeholder={inviteCopy.placeholder}
        value={inviteValue}
        onChange={handleInviteChange}
        onSend={handleInviteSubmit}
        isSending={isSending}
        error={inviteError}
        status={inviteStatus}
        buttonLabel={inviteCopy.buttonLabel}
      />

      {!caregiverMode && (
        <FamilyPendingSection
          title={sectionTitles.pending}
          requests={pendingCards}
          onApprove={handleApprove}
          onReject={handleReject}
          processingRequestId={processingRequestId}
        />
      )}

      <FamilyMemberList
        title={sectionTitles.members}
        members={memberCards}
        emptyMessage={emptyStateMessage}
      />
    </FamilySyncLayout>
  );
};

const FamilySyncPage = () => (
  <FamilySyncProvider>
    <FamilySyncContent />
  </FamilySyncProvider>
);

export default FamilySyncPage;
