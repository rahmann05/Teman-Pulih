/* src/hooks/useCaregiverDashboard.js */
import { useState, useEffect, useCallback } from 'react';
import { getProfile } from '@/features/profile/services/profileService';
import { getFamilyMembers, getIllnessHistory } from '@/features/family-sync/services/familyService';
import { getMedications, getMedicationLogs } from '@/features/medications/services/medicationService';
import { useAuth } from '@/shared/hooks/useAuth';
import { getInitials, buildRoster, buildCaregiverTimeline as buildTimeline } from '@/features/dashboard/utils/dashboardHelpers';

export const useCaregiverDashboard = () => {
  const { user } = useAuth();
  
  // Dashboard overall shell states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [caregiverName, setCaregiverName] = useState('Caregiver');
  const [initials, setInitials] = useState('CG');
  
  // Patient list / switcher states
  const [relations, setRelations] = useState([]);
  const [roster, setRoster] = useState([]);
  const [acceptedPatients, setAcceptedPatients] = useState([]);
  const [activePatientId, setActivePatientId] = useState(null);
  
  // Active patient data states
  const [loadingPatientData, setLoadingPatientData] = useState(false);
  const [activePatientProfile, setActivePatientProfile] = useState(null);
  const [medications, setMedications] = useState([]);
  const [logs, setLogs] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [activeIllnesses, setActiveIllnesses] = useState([]);
  
  // Triage status for active patient
  const [triageStatus, setTriageStatus] = useState('safe');
  const [triageMessage, setTriageMessage] = useState('Belum ada pasien yang terhubung.');

  // Load baseline caregiver details and list of family relations on mount
  useEffect(() => {
    let cancelled = false;

    const loadBaseDashboard = async () => {
      try {
        setLoading(true);
        const [profileResponse, membersResponse] = await Promise.all([
          getProfile(),
          getFamilyMembers(),
        ]);

        if (cancelled) return;

        const caregiverProfile = profileResponse.data?.profile || {};
        const name = profileResponse.data?.name || caregiverProfile.name || user?.name || 'Caregiver';
        setCaregiverName(name);
        setInitials(getInitials(name));

        const allRelations = membersResponse.data?.members || [];
        setRelations(allRelations);
        
        const rosterData = buildRoster(allRelations);
        setRoster(rosterData);

        // Filter for accepted patients
        const activeRels = allRelations.filter(r => r.status === 'accepted');
        const patients = activeRels.map(r => r.patient).filter(Boolean);
        setAcceptedPatients(patients);

        // Set initial active patient if available
        if (patients.length > 0) {
          setActivePatientId(patients[0].id);
        } else {
          setLoading(false);
        }
      } catch (err) {
        if (cancelled) return;
        console.error('[CaregiverDashboard] Error loading base data:', err);
        setError(err.response?.data?.error || 'Gagal memuat data dashboard.');
        setLoading(false);
      }
    };

    loadBaseDashboard();

    return () => {
      cancelled = true;
    };
  }, [user?.name]);

  // Load patient-specific detailed info dynamically whenever activePatientId changes
  useEffect(() => {
    if (!activePatientId) return;

    let cancelled = false;

    const loadPatientData = async () => {
      try {
        setLoadingPatientData(true);
        
        // Fetch detailed profile, medications, logs, and illness history in parallel
        const [profileRes, medsRes, logsRes, illnessRes] = await Promise.all([
          getProfile(activePatientId),
          getMedications(activePatientId),
          getMedicationLogs(activePatientId),
          getIllnessHistory(activePatientId).catch(() => ({ data: [] })),
        ]);

        if (cancelled) return;

        const activePatient = acceptedPatients.find(p => p.id === activePatientId) || {};
        const activeName = activePatient.name || 'Pasien';

        const patientProfile = profileRes.data || {};
        setActivePatientProfile(patientProfile);

        const medsList = medsRes.data?.data || [];
        const logsList = logsRes.data?.data || [];
        setMedications(medsList);
        setLogs(logsList);

        const illnessList = illnessRes.data || [];
        setActiveIllnesses(illnessList.filter(i => i.is_active));

        // Compute timeline & triage
        const computedTimeline = buildTimeline(medsList, logsList, activeName);
        setTimeline(computedTimeline);

        const latestMissedLog = logsList.find((log) => log.status === 'missed');
        setTriageStatus(latestMissedLog ? 'alert' : 'safe');
        setTriageMessage(
          latestMissedLog
            ? `${activeName} belum meminum ${latestMissedLog.medications?.name || 'obat'}${latestMissedLog.taken_at ? ` (${new Date(latestMissedLog.taken_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })})` : ''}`
            : `Semua jadwal ${activeName} terpantau aman`
        );

        setLoadingPatientData(false);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        console.error(`[CaregiverDashboard] Error loading patient data for ${activePatientId}:`, err);
        setLoadingPatientData(false);
        setLoading(false);
      }
    };

    loadPatientData();

    return () => {
      cancelled = true;
    };
  }, [activePatientId, acceptedPatients]);

  // Expose function to switch patient
  const switchPatient = useCallback((patientId) => {
    setActivePatientId(patientId);
  }, []);

  const activePatientName = acceptedPatients.find(p => p.id === activePatientId)?.name || '';

  return {
    loading,
    error,
    caregiverName,
    initials,
    roster,
    acceptedPatients,
    activePatientId,
    activePatientName,
    activePatientProfile,
    loadingPatientData,
    medications,
    logs,
    timeline,
    triageStatus,
    triageMessage,
    activeIllnesses,
    switchPatient,
  };
};
