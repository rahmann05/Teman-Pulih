import { useState, useCallback } from 'react';
import { LuX, LuPlus, LuTrash2 } from 'react-icons/lu';
 
const FREQUENCY_OPTIONS = [
  '1x sehari',
  '2x sehari',
  '3x sehari',
  '4x sehari',
  'Setiap 8 jam',
  'Sesuai kebutuhan'
];

/**
 * ScheduleField — one schedule row inside the Add/Edit form.
 */
const ScheduleField = ({ 
  index, 
  schedule, 
  onChange, 
  onRemove, 
  showRemove,
  onTimeChange,
  onAddTime,
  onRemoveTime
}) => (
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
      <label className="med-form-label">Frekuensi</label>
      <div className="med-frequency-options">
        {FREQUENCY_OPTIONS.map((opt) => (
          <button
            key={opt}
            type="button"
            className={`med-freq-btn ${schedule.frequency === opt ? 'active' : ''}`}
            onClick={() => onChange(index, 'frequency', opt)}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>

    <div className="med-form-field">
      <label className="med-form-label">Waktu Minum</label>
      <div className="med-time-slots-grid">
        {schedule.time_slots.map((time, slotIdx) => (
          <div key={slotIdx} className="med-time-input-wrapper">
            <input
              type="time"
              className="med-time-input"
              value={time}
              onChange={(e) => onTimeChange(index, slotIdx, e.target.value)}
              aria-label={`Waktu ${slotIdx + 1}`}
            />
            {schedule.time_slots.length > 1 && (
              <button
                type="button"
                className="med-time-remove-btn"
                onClick={() => onRemoveTime(index, slotIdx)}
                aria-label="Hapus waktu"
              >
                <LuTrash2 size={14} />
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          className="med-time-add-btn"
          onClick={() => onAddTime(index)}
          aria-label="Tambah waktu"
        >
          <LuPlus size={18} />
        </button>
      </div>
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
 
const EMPTY_SCHEDULE = { frequency: '', time_slots: [''], start_date: '', end_date: '' };
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

  const handleTimeSlot = useCallback((schedIdx, slotIdx, value) => {
    setForm((prev) => {
      const schedules = [...prev.schedules];
      const time_slots = [...schedules[schedIdx].time_slots];
      time_slots[slotIdx] = value;
      schedules[schedIdx] = { ...schedules[schedIdx], time_slots };
      return { ...prev, schedules };
    });
  }, []);

  const addTimeSlot = useCallback((schedIdx) => {
    setForm((prev) => {
      const schedules = [...prev.schedules];
      const time_slots = [...schedules[schedIdx].time_slots, ''];
      schedules[schedIdx] = { ...schedules[schedIdx], time_slots };
      return { ...prev, schedules };
    });
  }, []);

  const removeTimeSlot = useCallback((schedIdx, slotIdx) => {
    setForm((prev) => {
      const schedules = [...prev.schedules];
      const time_slots = schedules[schedIdx].time_slots.filter((_, i) => i !== slotIdx);
      schedules[schedIdx] = { ...schedules[schedIdx], time_slots };
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
    
    // Check if any schedule has empty time slots
    const hasEmptyTime = form.schedules.some(s => s.time_slots.some(t => !t));
    if (hasEmptyTime) {
      setError('Harap isi semua waktu minum atau hapus kolom waktu yang kosong.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await onSubmit({
        name: form.name.trim(),
        dosage: form.dosage.trim(),
        instructions: form.instructions.trim(),
        schedules: form.schedules.map((s) => ({
          ...s,
          // Clean up time slots (already an array now)
          time_slots: s.time_slots.map((t) => t.trim()).filter(Boolean),
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
 
        <div className="med-modal-body">
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
                  onTimeChange={handleTimeSlot}
                  onAddTime={addTimeSlot}
                  onRemoveTime={removeTimeSlot}
                />
              ))}
              <button type="button" className="med-add-schedule-btn" onClick={addSchedule}>
                <LuPlus size={16} /> Tambah Jadwal
              </button>
            </div>
  
            {error && <p className="med-form-error" role="alert">{error}</p>}
  
            <button
              type="submit"
              className="med-form-submit-btn"
              disabled={submitting}
            >
              {submitting ? 'Menyimpan…' : 'Simpan Obat'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
 
export default AddMedicationModal;
