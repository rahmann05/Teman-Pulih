import { useNavigate } from 'react-router-dom';
import FamilySyncLayout from '@/shared/layouts/FamilySyncLayout';
import FamilyInviteCard from '@/features/family-sync/components/FamilyInviteCard';
import FamilyMemberList from '@/features/family-sync/components/FamilyMemberList';
import FamilyPendingSection from '@/features/family-sync/components/FamilyPendingSection';
import FamilyHeader from '@/features/family-sync/components/FamilyHeader';
import FamilySyncProvider from '@/features/family-sync/context/FamilySyncProvider';
import { useFamilySyncContext } from '@/features/family-sync/hooks/useFamilySyncContext';
import VerificationModal from '@/features/family-sync/components/VerificationModal';
import FamilyComplaintsSection from '@/features/family-sync/components/FamilyComplaintsSection';
import FamilyCheckinsHistorySection from '@/features/family-sync/components/FamilyCheckinsHistorySection';
import '@/features/family-sync/family-sync.css';


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
    isVerificationOpen,
    setIsVerificationOpen,
    verificationError,
    verificationLoading,
    handleVerifySubmit,
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
      <div className="family-dashboard-grid">
        <FamilyHeader title="Sinkronisasi Keluarga" onBack={handleBack} />

        {error && <div className="family-error">{error}</div>}

        <div className="family-col-left">
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
          {pendingCards.length > 0 && (
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
        </div>

        <div className="family-col-right">
          <FamilyCheckinsHistorySection caregiverMode={caregiverMode} members={memberCards} />
          <FamilyComplaintsSection caregiverMode={caregiverMode} members={memberCards} />
        </div>
      </div>

      <VerificationModal
        isOpen={isVerificationOpen}
        onClose={() => setIsVerificationOpen(false)}
        onSubmit={handleVerifySubmit}
        error={verificationError}
        isLoading={verificationLoading}
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
