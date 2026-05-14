import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LuPlus, LuSearch } from 'react-icons/lu';
import DashboardLayout from '../../components/layout/DashboardLayout';
import MedicationCard from '../../components/domain/medication/MedicationCard';
import MedicationFilterChips from '../../components/domain/medication/MedicationFilterChips';
import MedicationPatientSelector from '../../components/domain/medication/MedicationPatientSelector';
import MedicationEmptyState from '../../components/domain/medication/MedicationEmptyState';
import AddMedicationModal from './AddMedicationModal';
import { useMedications } from '../../hooks/useMedications';
import { useAuth } from '../../hooks/useAuth';
import '../../styles/features/Medications.css';

/**
 * MedicationListPage — /medications
 * Supports patient self-view and caregiver multi-patient view.
 */
const MedicationListPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isCaregiver = user?.role === 'caregiver';

  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

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

  // Calculate real compliance from logs
  const calculateCompliance = () => {
    if (!logs || logs.length === 0) return 0; // Reset to 0 if no data
    const taken = logs.filter(l => l.status === 'taken').length;
    return Math.round((taken / logs.length) * 100);
  };

  const handleAdd = async (data) => {
    await addMedication(data);
  };

  return (
    <DashboardLayout caregiverMode={isCaregiver}>
      <div className="med-list-container" data-testid="medication-list-page">

        {/* Header */}
        <header className="med-list-header">
          <h1 className="med-list-title">Jadwal Obat</h1>
          <button
            className="med-search-btn"
            type="button"
            aria-label="Cari obat"
          >
            <LuSearch size={20} />
          </button>
        </header>

        {/* Caregiver: Patient selector */}
        {isCaregiver && (
          <MedicationPatientSelector
            patients={user?.linked_patients || []}
            selectedId={selectedPatientId}
            onSelect={setSelectedPatientId}
          />
        )}

        {/* Filter chips */}
        <MedicationFilterChips
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
        />

        {/* Desktop Overview Banner */}
        <div className="med-overview-banner">
          <div className="med-overview-stat">
            <div className="med-overview-value">{medications.length}</div>
            <div className="med-overview-label">Total Daftar Obat</div>
          </div>
          <div className="med-overview-stat">
            <div className="med-overview-value">{calculateCompliance()}%</div>
            <div className="med-overview-label">Kepatuhan Total</div>
          </div>
          <div className="med-overview-stat">
            <div className="med-overview-value">
              {medications.filter(m => m.medication_schedules?.length > 0).length}
            </div>
            <div className="med-overview-label">Memiliki Jadwal Rutin</div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="med-skeleton">
            {[1, 2, 3].map((n) => (
              <div key={n} className="skeleton-block" style={{ height: 110, borderRadius: 24 }} />
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

        {/* Log History Section */}
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

        {/* FAB — Add Medication */}
        <button
          className="med-fab"
          type="button"
          onClick={() => setShowAddModal(true)}
          aria-label="Tambah obat baru"
        >
          <LuPlus size={24} />
        </button>

        <AddMedicationModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAdd}
        />
      </div>
    </DashboardLayout>
  );
};

export default MedicationListPage;
