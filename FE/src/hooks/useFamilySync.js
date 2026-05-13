import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from './useAuth';
import {
  approveRequest,
  getFamilyMembers,
  getPendingRequests,
  inviteFamily,
  requestAccess,
} from '../services/familyService';
import { getInitials } from '../services/dashboardHelpers';
import { formatRequestDate, resolveStatusMeta, validateIdentifier } from '../utils/familySyncHelpers';

export const useFamilySync = () => {
  const { user } = useAuth();
  const role = user?.role || 'patient';
  const caregiverMode = role === 'caregiver';

  const [members, setMembers] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [inviteValue, setInviteValue] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [inviteStatus, setInviteStatus] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [processingRequestId, setProcessingRequestId] = useState(null);

  const inviteCopy = useMemo(() => ({
    title: caregiverMode ? 'Tambah Pasien' : 'Undang Caregiver',
    description: caregiverMode
      ? 'Masukkan email atau nomor telepon pasien untuk meminta akses pemantauan.'
      : 'Masukkan email atau nomor telepon caregiver untuk mulai sinkronisasi keluarga.',
    placeholder: 'Email atau No. Telepon',
    buttonLabel: caregiverMode ? 'Kirim Permintaan' : 'Kirim Undangan',
  }), [caregiverMode]);

  const sectionTitles = useMemo(() => ({
    pending: 'Permintaan Masuk',
    members: caregiverMode ? 'Pasien yang Dipantau' : 'Caregiver Terhubung',
  }), [caregiverMode]);

  const emptyStateMessage = caregiverMode
    ? 'Belum ada pasien yang terhubung.'
    : 'Belum ada caregiver yang terhubung.';

  const fetchMembers = useCallback(async () => {
    const response = await getFamilyMembers();
    setMembers(response.data?.members || []);
  }, []);

  const fetchPending = useCallback(async () => {
    if (caregiverMode) {
      setPendingRequests([]);
      return;
    }
    const response = await getPendingRequests();
    setPendingRequests(response.data?.requests || []);
  }, [caregiverMode]);

  const loadFamilySync = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      await Promise.all([fetchMembers(), fetchPending()]);
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal memuat sinkronisasi keluarga.');
    } finally {
      setLoading(false);
    }
  }, [fetchMembers, fetchPending]);

  useEffect(() => {
    loadFamilySync();
  }, [loadFamilySync]);

  const handleInviteChange = useCallback((value) => {
    setInviteValue(value);
    if (inviteError) setInviteError('');
    if (inviteStatus) setInviteStatus(null);
  }, [inviteError, inviteStatus]);

  const handleInviteSubmit = useCallback(async () => {
    const validation = validateIdentifier(inviteValue);
    if (!validation.isValid) {
      setInviteError(validation.message);
      setInviteStatus(null);
      return false;
    }

    setInviteError('');
    setInviteStatus(null);
    setIsSending(true);

    try {
      if (caregiverMode) {
        await requestAccess(validation.normalized);
      } else {
        await inviteFamily(validation.normalized);
      }

      setInviteStatus({
        type: 'success',
        message: caregiverMode
          ? 'Permintaan akses berhasil dikirim.'
          : 'Undangan caregiver berhasil dikirim.',
      });
      setInviteValue('');
      await fetchMembers();
      await fetchPending();
      return true;
    } catch (err) {
      const message = err.response?.data?.error || 'Gagal mengirim undangan.';
      setInviteStatus({ type: 'error', message });
      return false;
    } finally {
      setIsSending(false);
    }
  }, [caregiverMode, fetchMembers, fetchPending, inviteValue]);

  const handleRequestAction = useCallback(async (relationId, status) => {
    setProcessingRequestId(relationId);
    setError('');

    try {
      await approveRequest(relationId, status);
      await Promise.all([fetchMembers(), fetchPending()]);
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal memperbarui permintaan.');
    } finally {
      setProcessingRequestId(null);
    }
  }, [fetchMembers, fetchPending]);

  const handleApprove = useCallback((relationId) => {
    handleRequestAction(relationId, 'accepted');
  }, [handleRequestAction]);

  const handleReject = useCallback((relationId) => {
    handleRequestAction(relationId, 'rejected');
  }, [handleRequestAction]);

  const memberCards = useMemo(() => (
    members.map((member) => {
      const relationPerson = caregiverMode ? member.patient : member.caregiver;
      const statusMeta = resolveStatusMeta(member.status);
      const roleLabel = caregiverMode ? 'Pasien' : 'Caregiver';
      const name = relationPerson?.name || 'Belum tersedia';
      const email = relationPerson?.email || '';

      return {
        id: member.id,
        name,
        email,
        initials: getInitials(name),
        roleLine: email ? `${roleLabel} - ${email}` : roleLabel,
        statusLabel: statusMeta.label,
        statusVariant: statusMeta.variant,
        avatarVariant: caregiverMode ? 'patient' : 'caregiver',
      };
    })
  ), [caregiverMode, members]);

  const pendingCards = useMemo(() => (
    pendingRequests.map((request) => {
      const caregiver = request.caregiver || {};
      const name = caregiver.name || 'Caregiver';
      return {
        id: request.id,
        initials: getInitials(name),
        name,
        email: caregiver.email || '',
        dateLabel: formatRequestDate(request.created_at),
      };
    })
  ), [pendingRequests]);

  return {
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
  };
};
