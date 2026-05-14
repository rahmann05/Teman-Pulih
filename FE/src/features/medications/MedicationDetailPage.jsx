import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LuArrowLeft, LuPencil, LuTrash2 } from 'react-icons/lu';
import DashboardLayout from '../../components/layout/DashboardLayout';
import MedicationDoseTimeline from '../../components/domain/medication/MedicationDoseTimeline';
import MedicationEmptyState from '../../components/domain/medication/MedicationEmptyState';
import EditMedicationModal from './EditMedicationModal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useMedications } from '../../hooks/useMedications';
import { useAuth } from '../../hooks/useAuth';
import '../../styles/features/Medications.css';

/**
 * Format a date string to a readable Indonesian date.
 */
const formatDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
};

/**
 * MedicationDetailPage — /medications/:id
 */
const MedicationDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isCaregiver = user?.role === 'caregiver';

  const [showEdit, setShowEdit]       = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    medications,
    logs,
    loading,
    error,
    editMedication,
    removeMedication,
    logDose,
    fetchAll,
  } = useMedications();

  const medication = medications.find((m) => String(m.id) === String(id));
  const schedule   = medication?.medication_schedules?.[0];

  const handleDelete = async () => {
    await removeMedication(id);
    navigate('/medications', { replace: true });
  };

  const handleEdit = async (data) => {
    await editMedication(id, data);
  };

  // Loading skeleton
  if (loading) {
    return (
      <DashboardLayout caregiverMode={isCaregiver}>
        <div className="med-detail-container">
          <header className="med-list-header">
            <button className="scan-back-btn" onClick={() => navigate('/medications')} aria-label="Kembali">
              <LuArrowLeft size={20} />
            </button>
            <div className="skeleton-block" style={{ height: 28, width: 160, borderRadius: 8 }} />
          </header>
          <div className="med-skeleton" style={{ padding: '0 var(--space-5)' }}>
            <div className="skeleton-block" style={{ height: 160, borderRadius: 24 }} />
            <div className="skeleton-block" style={{ height: 200, borderRadius: 24 }} />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !medication) {
    return (
      <DashboardLayout caregiverMode={isCaregiver}>
        <div className="med-detail-container">
          <header className="med-list-header">
            <button className="scan-back-btn" onClick={() => navigate('/medications')} aria-label="Kembali">
              <LuArrowLeft size={20} />
            </button>
          </header>
          <MedicationEmptyState
            type="error"
            message={error || 'Obat tidak ditemukan.'}
            onRetry={fetchAll}
          />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout caregiverMode={isCaregiver}>
      <div className="med-detail-container" data-testid="medication-detail-page">

        {/* Header */}
        <header className="med-list-header">
          <button
            className="scan-back-btn"
            onClick={() => navigate('/medications')}
            aria-label="Kembali ke daftar obat"
          >
            <LuArrowLeft size={20} />
          </button>
          <h1 className="med-list-title">{medication.name}</h1>
        </header>

        {/* Detail Grid (Desktop Split Layout) */}
        <div className="med-detail-grid">
          {/* Info Grid (Left Side) */}
          <section className="med-detail-info" aria-label="Informasi obat">
            <div className="med-detail-field">
              <span className="med-detail-label">Dosis</span>
              <span className="med-detail-value">{medication.dosage || '—'}</span>
            </div>
            <div className="med-detail-field">
              <span className="med-detail-label">Instruksi</span>
              <span className="med-detail-value">{medication.instructions || '—'}</span>
            </div>
            {schedule && (
              <>
                <div className="med-detail-field">
                  <span className="med-detail-label">Frekuensi</span>
                  <span className="med-detail-value">{schedule.frequency || '—'}</span>
                </div>
                <div className="med-detail-field">
                  <span className="med-detail-label">Waktu</span>
                  <span className="med-detail-value">
                    {Array.isArray(schedule.time_slots)
                      ? schedule.time_slots.join(', ')
                      : schedule.time_slots || '—'}
                  </span>
                </div>
                <div className="med-detail-field">
                  <span className="med-detail-label">Periode</span>
                  <span className="med-detail-value">
                    {formatDate(schedule.start_date)} – {formatDate(schedule.end_date)}
                  </span>
                </div>
              </>
            )}
          </section>

          {/* Right Side */}
          <div className="med-detail-right">
            {/* Today's Dose Timeline */}
            <MedicationDoseTimeline
              medication={medication}
              logs={logs}
              onLog={logDose}
            />

            {/* Action Buttons */}
            <div className="med-detail-actions">
              <button
                className="med-edit-btn"
                type="button"
                onClick={() => setShowEdit(true)}
                aria-label="Edit obat"
              >
                <LuPencil size={16} /> Edit
              </button>
              <button
                className="med-delete-btn"
                type="button"
                onClick={() => setShowConfirm(true)}
                aria-label="Hapus obat"
              >
                <LuTrash2 size={16} /> Hapus
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <EditMedicationModal
        isOpen={showEdit}
        medication={medication}
        onClose={() => setShowEdit(false)}
        onSubmit={handleEdit}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={showConfirm}
        title="Hapus Obat"
        message={`Apakah Anda yakin ingin menghapus "${medication.name}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Hapus"
        cancelText="Batal"
        danger
        onConfirm={handleDelete}
        onCancel={() => setShowConfirm(false)}
      />
    </DashboardLayout>
  );
};

export default MedicationDetailPage;
