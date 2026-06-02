import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LuPlus, LuChevronRight, LuActivity, LuPill } from 'react-icons/lu';
import DashboardLayout from '@/shared/layouts/DashboardLayout';
import MedicationEmptyState from '@/features/medications/components/MedicationEmptyState';
import AddMedicationModal from '@/features/medications/pages/AddMedicationModal';
import { useAuth } from '@/shared/hooks/useAuth';
import { getFamilyMembers } from '@/features/family-sync/services/familyService';
import { getMedications, getMedicationLogs, createMedication } from '@/features/medications/services/medicationService';
import '@/features/medications/medications.css';

/**
 * CaregiverMedicationListPage — Special view for caregivers.
 * Displays all active patient schedules in a premium and clean grid format.
 * Accommodates stats, active drugs, and recent activities per patient.
 */
const CaregiverMedicationListPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [showAddModal, setShowAddModal] = useState(false);
  const [modalPrefill, setModalPrefill] = useState(null);

  // Caregiver patient schedule states
  const [patients, setPatients] = useState([]);
  const [caregiverData, setCaregiverData] = useState([]);
  const [caregiverLoading, setCaregiverLoading] = useState(false);
  const [caregiverError, setCaregiverError] = useState(null);
  const [addingPatientId, setAddingPatientId] = useState(null);

  // Check for pre-fill state (e.g. from OCR scanning)
  useEffect(() => {
    if (location.state?.openAddModal) {
      setModalPrefill(location.state.prefill || null);
      setShowAddModal(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Fetch all caregiver patients' medications and logs in parallel
  const fetchCaregiverData = useCallback(async () => {
    try {
      setCaregiverLoading(true);
      setCaregiverError(null);
      
      const membersRes = await getFamilyMembers();
      const allRelations = membersRes.data?.members || [];
      const activeRels = allRelations.filter(r => r.status === 'accepted');
      const patientsList = activeRels.map(r => r.patient).filter(Boolean);
      setPatients(patientsList);

      const fullData = await Promise.all(
        patientsList.map(async (p) => {
          try {
            const [medsRes, logsRes] = await Promise.all([
              getMedications(p.id),
              getMedicationLogs(p.id),
            ]);
            return {
              patient: p,
              medications: medsRes.data?.data || [],
              logs: logsRes.data?.data || [],
              error: null,
            };
          } catch (err) {
            return {
              patient: p,
              medications: [],
              logs: [],
              error: 'Gagal memuat data obat pasien.',
            };
          }
        })
      );
      setCaregiverData(fullData);
    } catch (err) {
      console.error('Error loading caregiver patient data:', err);
      setCaregiverError('Gagal memuat data pasien terhubung.');
    } finally {
      setCaregiverLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCaregiverData();
  }, [fetchCaregiverData]);

  /**
   * Hitung persentase kepatuhan nyata:
   * = total slot "taken" yang ter-log / total slot yang seharusnya diminum (sejak start_date jadwal aktif sampai hari ini)
   */
  const calculateComplianceForPatient = (patientMeds, patientLogs) => {
    if (!patientMeds || patientMeds.length === 0) return 0;

    const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD

    let totalExpected = 0;
    let totalTaken = 0;

    patientMeds.forEach((med) => {
      const schedules = med.medication_schedules || [];
      schedules.forEach((sched) => {
        const startStr = sched.start_date?.split('T')[0];
        const endStr   = sched.end_date?.split('T')[0];
        if (!startStr) return; // jadwal tanpa start_date diabaikan

        const start   = new Date(startStr);
        const end     = new Date(endStr && endStr < todayStr ? endStr : todayStr);
        if (end < start) return;

        const daysDiff = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
        const slots    = Array.isArray(sched.time_slots)
          ? sched.time_slots
          : String(sched.time_slots || '').split(',').map(s => s.replace(/[[\]"'\s]/g, '').trim()).filter(Boolean);

        const expected = slots.length * daysDiff;
        totalExpected += expected;

        const taken = patientLogs.filter(l =>
          l.medication_id === med.id &&
          l.schedule_id === sched.id &&
          l.status === 'taken'
        ).length;
        totalTaken += Math.min(taken, expected);
      });
    });

    if (totalExpected === 0) return 0;
    return Math.round((totalTaken / totalExpected) * 100);
  };

  const handleAdd = async (data) => {
    try {
      const payload = addingPatientId ? { ...data, patient_id: addingPatientId } : data;
      await createMedication(payload);
      await fetchCaregiverData();
      setShowAddModal(false);
      setAddingPatientId(null);
    } catch (err) {
      console.error('Error adding medication:', err);
      alert('Gagal menyimpan obat baru.');
    }
  };

  return (
    <DashboardLayout caregiverMode={true}>
      <div className="med-list-container" data-testid="medication-list-page">
        
        {/* ── Editorial Header ── */}
        <header className="med-list-header">
          <div className="med-list-header-left">
            <p className="med-list-eyebrow">Pemantauan Caregiver</p>
            <h1 className="med-list-title">Jadwal Pasien</h1>
          </div>
        </header>

        {/* ── Patient Cards Grid ── */}
        {caregiverLoading ? (
          <div className="med-skeleton" style={{ padding: '0 var(--space-5)' }}>
            {[1, 2].map((n) => (
              <div key={n} className="skeleton-block" style={{ height: 280, borderRadius: 28, marginBottom: 20 }} />
            ))}
          </div>
        ) : caregiverError ? (
          <MedicationEmptyState type="error" message={caregiverError} onRetry={fetchCaregiverData} />
        ) : caregiverData.length === 0 ? (
          <MedicationEmptyState type="empty" message="Belum ada pasien yang terhubung." />
        ) : (
          <div className="caregiver-patients-grid">
            {caregiverData.map((p) => {
              const compliance = calculateComplianceForPatient(p.medications, p.logs);
              const initials = p.patient.name ? p.patient.name.substring(0, 2).toUpperCase() : 'PS';
              
              return (
                <div key={p.patient.id} className="caregiver-patient-card">
                  
                  {/* Card Header: Patient Profile Section */}
                  <div className="patient-card-header">
                    <div className="patient-profile-section">
                      <div className="patient-avatar">{initials}</div>
                      <div className="patient-meta">
                        <h2 className="patient-meta-name">{p.patient.name || 'Pasien'}</h2>
                        <span className="patient-meta-role">Pasien Terhubung</span>
                      </div>
                    </div>
                    
                    <button
                      className="patient-add-med-btn"
                      type="button"
                      onClick={() => {
                        setAddingPatientId(p.patient.id);
                        setShowAddModal(true);
                      }}
                      aria-label={`Tambah obat untuk ${p.patient.name}`}
                    >
                      <LuPlus size={14} />
                      <span>Tambah Obat</span>
                    </button>
                  </div>

                  {/* Overview Stats Row */}
                  <div className="patient-stats-banner">
                    <div className="patient-stat-item">
                      <div className="patient-stat-value">{p.medications.length}</div>
                      <div className="patient-stat-label">Total Obat</div>
                    </div>
                    <div className="patient-stats-divider" />
                    <div className="patient-stat-item">
                      <div className="patient-stat-value compliance">{compliance}%</div>
                      <div className="patient-stat-label">Kepatuhan</div>
                    </div>
                    <div className="patient-stats-divider" />
                    <div className="patient-stat-item">
                      <div className="patient-stat-value">
                        {p.medications.filter(m => m.medication_schedules?.length > 0).length}
                      </div>
                      <div className="patient-stat-label">Berjadwal</div>
                    </div>
                  </div>

                  {/* Medications List Section */}
                  <div className="patient-meds-section">
                    <h3 className="patient-section-subtitle">
                      <LuPill size={14} />
                      Obat yang Dikonsumsi
                    </h3>
                    
                    {p.medications.length === 0 ? (
                      <div className="mini-log-empty">
                        Belum ada obat yang didaftarkan.
                      </div>
                    ) : (
                      <div className="patient-meds-list">
                        {p.medications.slice(0, 4).map((med) => {
                          const schedText = med.medication_schedules?.map(s => s.frequency).join(', ') || 'Tanpa jadwal';
                          return (
                            <button
                              key={med.id}
                              type="button"
                              className="patient-med-subcard"
                              onClick={() => navigate(`/medications/${med.id}?patientId=${p.patient.id}`, { state: { patientId: p.patient.id } })}
                            >
                              <div className="patient-med-icon">
                                <LuPill size={16} />
                              </div>
                              <div className="patient-med-info">
                                <span className="patient-med-name">{med.name}</span>
                                <span className="patient-med-desc">{med.dosage || '1 Dosis'} • {schedText}</span>
                              </div>
                               <LuChevronRight size={16} className="patient-med-chevron" />
                            </button>
                          );
                        })}
                        {p.medications.length > 4 && (
                          <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 650, marginTop: '2px' }}>
                            + {p.medications.length - 4} obat lainnya
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Activity History Section */}
                  <div className="patient-history-section">
                    <h3 className="patient-section-subtitle">
                      <LuActivity size={14} />
                      Riwayat Aktivitas Terakhir
                    </h3>
                    
                    {p.logs.length === 0 ? (
                      <div className="mini-log-empty">
                        Belum ada aktivitas minum obat.
                      </div>
                    ) : (
                      <div className="patient-history-list">
                        {p.logs.slice(0, 3).map((log) => {
                          const med = p.medications.find(m => m.id === log.medication_id);
                          const formattedTime = new Date(log.taken_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                          const formattedDate = new Date(log.taken_at).toLocaleDateString([], { day: 'numeric', month: 'short' });
                          
                          return (
                            <div key={log.id} className="mini-log-item">
                              <div className="mini-log-left">
                                <span className="mini-log-medname">{med?.name || 'Obat'}</span>
                                <span className="mini-log-time">{formattedDate} • {formattedTime} ({log.time_slot})</span>
                              </div>
                              <span className={`mini-log-badge ${log.status}`}>
                                {log.status === 'taken' ? 'Diminum' : log.status === 'missed' ? 'Terlewat' : 'Dilewati'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}

        <AddMedicationModal
          isOpen={showAddModal}
          onClose={() => { setShowAddModal(false); setAddingPatientId(null); setModalPrefill(null); }}
          onSubmit={handleAdd}
          patientId={addingPatientId || undefined}
          prefill={modalPrefill}
        />
      </div>
    </DashboardLayout>
  );
};

export default CaregiverMedicationListPage;
