import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LuPlus, LuSearch } from 'react-icons/lu';
import DashboardLayout from '@/shared/layouts/DashboardLayout';
import MedicationCard from '@/features/medications/components/MedicationCard';
import MedicationFilterChips from '@/features/medications/components/MedicationFilterChips';
import MedicationPatientSelector from '@/features/medications/components/MedicationPatientSelector';
import MedicationEmptyState from '@/features/medications/components/MedicationEmptyState';
import AddMedicationModal from '@/features/medications/pages/AddMedicationModal';
import { useMedications } from '@/features/medications/hooks/useMedications';
import { useAuth } from '@/shared/hooks/useAuth';
import '@/features/medications/medications.css';

/**
 * MedicationListPage — /medications
 * Supports patient self-view and caregiver multi-patient view.
 * Redesigned with Floema Editorial aesthetic to match Dashboard + Landing Page.
 */
const MedicationListPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isCaregiver = user?.role === 'caregiver';

  const location = useLocation();
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalPrefill, setModalPrefill] = useState(null);

  // Buka modal dengan pre-fill jika datang dari halaman scan result
  useEffect(() => {
    if (location.state?.openAddModal) {
      setModalPrefill(location.state.prefill || null);
      setShowAddModal(true);
      // Bersihkan state agar tidak re-trigger jika user navigasi ulang
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const {
    medications,
    filteredMedications,
    logs,
    loading,
    error,
    activeFilter,
    setActiveFilter,
    addMedication,
    fetchAll,
  } = useMedications(isCaregiver ? selectedPatientId : undefined);

  /**
   * Hitung persentase kepatuhan nyata:
   * = total slot "taken" yang ter-log / total slot yang seharusnya diminum (sejak start_date jadwal aktif sampai hari ini)
   */
  const calculateCompliance = () => {
    if (!medications || medications.length === 0) return 0;

    const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD

    let totalExpected = 0;
    let totalTaken = 0;

    medications.forEach((med) => {
      const schedules = med.medication_schedules || [];
      schedules.forEach((sched) => {
        const startStr = sched.start_date?.split('T')[0];
        const endStr   = sched.end_date?.split('T')[0];
        if (!startStr) return; // jadwal tanpa start_date diabaikan

        // Hitung jumlah hari aktif dari start_date sampai min(endStr, today)
        const start   = new Date(startStr);
        const end     = new Date(endStr && endStr < todayStr ? endStr : todayStr);
        if (end < start) return;

        const daysDiff = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
        const slots    = Array.isArray(sched.time_slots)
          ? sched.time_slots
          : String(sched.time_slots || '').split(',').map(s => s.replace(/[[\]"'\s]/g, '').trim()).filter(Boolean);

        // Expected = jumlah slot per hari × jumlah hari aktif
        const expected = slots.length * daysDiff;
        totalExpected += expected;

        // Taken = log dengan status 'taken' untuk jadwal ini
        const taken = logs.filter(l =>
          l.medication_id === med.id &&
          l.schedule_id === sched.id &&
          l.status === 'taken'
        ).length;
        totalTaken += Math.min(taken, expected); // cap agar tidak melebihi expected
      });
    });

    if (totalExpected === 0) return 0;
    return Math.round((totalTaken / totalExpected) * 100);
  };


  const handleAdd = async (data) => {
    await addMedication(data);
  };

  return (
    <DashboardLayout caregiverMode={isCaregiver}>
      <div className="med-list-container" data-testid="medication-list-page">

        {/* ── Editorial Header ── */}
        <header className="med-list-header">
          <div className="med-list-header-left">
            <p className="med-list-eyebrow">Kesehatan Anda</p>
            <h1 className="med-list-title">Jadwal Obat</h1>
          </div>
          <div className="med-header-actions">
            <button
              className="med-search-btn"
              type="button"
              aria-label="Cari obat"
            >
              <LuSearch size={18} />
            </button>
            <button
              className="med-add-btn"
              type="button"
              onClick={() => setShowAddModal(true)}
              aria-label="Tambah obat baru"
            >
              <LuPlus size={16} />
              <span>Tambah Obat</span>
            </button>
          </div>
        </header>

        {/* ── Caregiver: Patient selector ── */}
        {isCaregiver && (
          <MedicationPatientSelector
            patients={user?.linked_patients || []}
            selectedId={selectedPatientId}
            onSelect={setSelectedPatientId}
          />
        )}

        {/* ── Bento Overview Banner ── */}
        <div className="med-overview-banner">
          <div className="med-overview-stat">
            <div className="med-overview-value">{medications.length}</div>
            <div className="med-overview-label">Total Obat</div>
          </div>
          <div className="med-overview-divider" />
          <div className="med-overview-stat">
            <div className="med-overview-value med-compliance-value">{calculateCompliance()}%</div>
            <div className="med-overview-label">Kepatuhan</div>
          </div>
          <div className="med-overview-divider" />
          <div className="med-overview-stat">
            <div className="med-overview-value">
              {medications.filter(m => m.medication_schedules?.length > 0).length}
            </div>
            <div className="med-overview-label">Berjadwal</div>
          </div>
        </div>

        {/* ── Filter Chips ── */}
        <MedicationFilterChips
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
        />

        {/* ── Content ── */}
        {loading ? (
          <div className="med-skeleton">
            {[1, 2, 3].map((n) => (
              <div key={n} className="skeleton-block" style={{ height: 120, borderRadius: 'var(--radius-xl)' }} />
            ))}
          </div>
        ) : error ? (
          <MedicationEmptyState type="error" message={error} onRetry={fetchAll} />
        ) : filteredMedications.length === 0 ? (
          <MedicationEmptyState type="empty" />
        ) : (
          <div className="med-card-list">
            {filteredMedications.map((med) => (
              <MedicationCard
                key={med.id}
                med={med}
                logs={logs}
                onClick={() => navigate(`/medications/${med.id}`)}
              />
            ))}
          </div>
        )}

        {/* ── Log History Section ── */}
        {!loading && logs.length > 0 && (
          <section className="med-history-section">
            <h2 className="med-section-title">Riwayat Aktivitas</h2>
            <div className="med-history-list">
              {logs.slice(0, 10).map((log) => {
                const med = medications.find((m) => m.id === log.medication_id);
                return (
                  <div key={log.id} className="med-history-item">
                    <div className={`med-history-status ${log.status}`}>
                      {log.status === 'taken' ? 'Diminum' : log.status === 'missed' ? 'Terlewat' : 'Lewati'}
                    </div>
                    <div className="med-history-info">
                      <span className="med-history-name">{med?.name || 'Obat'}</span>
                      <span className="med-history-time">
                        {new Date(log.taken_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {log.time_slot}
                      </span>
                    </div>
                    <div className="med-history-date">
                      {new Date(log.taken_at).toLocaleDateString([], { day: 'numeric', month: 'short' })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <AddMedicationModal
          isOpen={showAddModal}
          onClose={() => { setShowAddModal(false); setModalPrefill(null); }}
          onSubmit={handleAdd}
          patientId={isCaregiver ? selectedPatientId : undefined}
          prefill={modalPrefill}
        />
      </div>
    </DashboardLayout>
  );
};

export default MedicationListPage;
