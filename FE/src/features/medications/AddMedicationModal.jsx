import { useState, useCallback } from 'react';
import { LuX, LuPlus, LuTrash2 } from 'react-icons/lu';

/**
 * ScheduleField — one schedule row inside the Add/Edit form.
 */
const ScheduleField = ({ index, schedule, onChange, onRemove, showRemove }) => (
  <div className="med-schedule-field">
    <div className="med-schedule-field-header">
      <span className="med-schedule-label">Jadwal {index + 1}</span>
      {showRemove && (
        <button
          type="button"
          className="med-schedule-remove-btn"
          onClick={onRemove}
          aria-label={`Hapus jadwal ${index + 1}`}
        >
          <LuTrash2 size={14} />
        </button>
      )}
    </div>
    <div className="med-form-field">
      <label className="med-form-label" htmlFor={`frequency-${index}`}>Frekuensi</label>
      <input
        id={`frequency-${index}`}
        className="med-form-input"
        placeholder="cth. 3x sehari"
        value={schedule.frequency}
        onChange={(e) => onChange(index, 'frequency', e.target.value)}
      />
    </div>
    <div className="med-form-field">
      <label className="med-form-label" htmlFor={`slots-${index}`}>Waktu Minum (pisahkan dengan koma)</label>
      <input
        id={`slots-${index}`}
        className="med-form-input"
        placeholder="cth. 08:00,14:00,20:00"
        value={schedule.time_slots}
        onChange={(e) => onChange(index, 'time_slots', e.target.value)}
      />
    </div>
    <div className="med-form-row">
      <div className="med-form-field">
        <label className="med-form-label" htmlFor={`start-${index}`}>Tanggal Mulai</label>
        <input
          id={`start-${index}`}
          type="date"
          className="med-form-input"
          value={schedule.start_date}
          onChange={(e) => onChange(index, 'start_date', e.target.value)}
        />
      </div>
      <div className="med-form-field">
        <label className="med-form-label" htmlFor={`end-${index}`}>Tanggal Selesai</label>
        <input
          id={`end-${index}`}
          type="date"
          className="med-form-input"
          value={schedule.end_date}
          onChange={(e) => onChange(index, 'end_date', e.target.value)}
        />
      </div>
    </div>
  </div>
);

const EMPTY_SCHEDULE = { frequency: '', time_slots: '', start_date: '', end_date: '' };
const EMPTY_FORM     = { name: '', dosage: '', instructions: '', schedules: [{ ...EMPTY_SCHEDULE }] };

/**
 * AddMedicationModal — bottom-sheet / dialog for creating a new medication.
 * @param {boolean}  isOpen
 * @param {Function} onClose
 * @param {Function} onSubmit  - async (formData) => void
 */
const AddMedicationModal = ({ isOpen, onClose, onSubmit }) => {
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleField = (field, value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSchedule = useCallback((index, field, value) => {
    setForm((prev) => {
      const schedules = [...prev.schedules];
      schedules[index] = { ...schedules[index], [field]: value };
      return { ...prev, schedules };
    });
  }, []);

  const addSchedule = () =>
    setForm((prev) => ({ ...prev, schedules: [...prev.schedules, { ...EMPTY_SCHEDULE }] }));

  const removeSchedule = (index) =>
    setForm((prev) => ({ ...prev, schedules: prev.schedules.filter((_, i) => i !== index) }));

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
        schedules: form.schedules.map((s) => ({
          ...s,
          time_slots: s.time_slots.split(',').map((t) => t.trim()).filter(Boolean),
        })),
      });
      setForm(EMPTY_FORM);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal menyimpan obat.');
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
        aria-labelledby="add-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="med-modal-handle" aria-hidden="true" />

        <div className="med-modal-header">
          <h2 id="add-modal-title" className="med-modal-title">Tambah Obat</h2>
          <button className="med-modal-close-btn" type="button" onClick={onClose} aria-label="Tutup">
            <LuX size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="med-form" noValidate>
          <div className="med-form-field">
            <label className="med-form-label" htmlFor="add-name">Nama Obat *</label>
            <input
              id="add-name"
              className="med-form-input"
              placeholder="cth. Amoxicillin"
              value={form.name}
              onChange={(e) => handleField('name', e.target.value)}
              required
            />
          </div>
          <div className="med-form-field">
            <label className="med-form-label" htmlFor="add-dosage">Dosis</label>
            <input
              id="add-dosage"
              className="med-form-input"
              placeholder="cth. 500mg"
              value={form.dosage}
              onChange={(e) => handleField('dosage', e.target.value)}
            />
          </div>
          <div className="med-form-field">
            <label className="med-form-label" htmlFor="add-instructions">Instruksi</label>
            <textarea
              id="add-instructions"
              className="med-form-textarea"
              placeholder="cth. Diminum setelah makan"
              value={form.instructions}
              onChange={(e) => handleField('instructions', e.target.value)}
            />
          </div>

          <div className="med-schedules-section">
            <span className="med-schedules-title">Jadwal Minum</span>
            {form.schedules.map((s, i) => (
              <ScheduleField
                key={i}
                index={i}
                schedule={s}
                onChange={handleSchedule}
                onRemove={() => removeSchedule(i)}
                showRemove={form.schedules.length > 1}
              />
            ))}
            <button type="button" className="med-add-schedule-btn" onClick={addSchedule}>
              <LuPlus size={16} /> Tambah Jadwal
            </button>
          </div>

          {error && <p className="med-form-error" role="alert">{error}</p>}

          <button
            type="submit"
            className="scan-submit-btn"
            disabled={submitting}
          >
            {submitting ? 'Menyimpan…' : 'Simpan Obat'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddMedicationModal;
