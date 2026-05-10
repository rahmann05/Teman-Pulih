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
    filteredMedications,
    logs,
    loading,
    error,
    activeFilter,
    setActiveFilter,
    addMedication,
    fetchAll,
  } = useMedications(isCaregiver ? selectedPatientId : undefined);

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
