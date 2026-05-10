import { useState, useEffect } from 'react';
import { LuX } from 'react-icons/lu';

/**
 * EditMedicationModal — pre-filled bottom-sheet form for updating a medication.
 * Only allows editing name, dosage, and instructions (backend PATCH).
 * @param {boolean}  isOpen
 * @param {object}   medication - Current medication data to pre-fill the form
 * @param {Function} onClose
 * @param {Function} onSubmit   - async ({ name, dosage, instructions }) => void
 */
const EditMedicationModal = ({ isOpen, medication, onClose, onSubmit }) => {
  const [form, setForm] = useState({ name: '', dosage: '', instructions: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Sync form when medication prop changes
  useEffect(() => {
    if (medication) {
      setForm({
        name: medication.name || '',
        dosage: medication.dosage || '',
        instructions: medication.instructions || '',
      });
    }
  }, [medication]);

  const handleField = (field, value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Nama obat wajib diisi.'); return; }
    try {
      setSubmitting(true);
      setError(null);
      await onSubmit({
        name: form.name.trim(),
        dosage: form.dosage.trim(),
        instructions: form.instructions.trim(),
      });
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal memperbarui obat.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="med-modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="med-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="med-modal-handle" aria-hidden="true" />

        <div className="med-modal-header">
          <h2 id="edit-modal-title" className="med-modal-title">Edit Obat</h2>
          <button className="med-modal-close-btn" type="button" onClick={onClose} aria-label="Tutup">
            <LuX size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="med-form" noValidate>
          <div className="med-form-field">
            <label className="med-form-label" htmlFor="edit-name">Nama Obat *</label>
            <input
              id="edit-name"
              className="med-form-input"
              value={form.name}
              onChange={(e) => handleField('name', e.target.value)}
              required
            />
          </div>
          <div className="med-form-field">
            <label className="med-form-label" htmlFor="edit-dosage">Dosis</label>
            <input
              id="edit-dosage"
              className="med-form-input"
              value={form.dosage}
              onChange={(e) => handleField('dosage', e.target.value)}
            />
          </div>
          <div className="med-form-field">
            <label className="med-form-label" htmlFor="edit-instructions">Instruksi</label>
            <textarea
              id="edit-instructions"
              className="med-form-textarea"
              value={form.instructions}
              onChange={(e) => handleField('instructions', e.target.value)}
            />
          </div>

          {error && <p className="med-form-error" role="alert">{error}</p>}

          <button
            type="submit"
            className="scan-submit-btn"
            disabled={submitting}
          >
            {submitting ? 'Menyimpan…' : 'Simpan Perubahan'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default EditMedicationModal;
