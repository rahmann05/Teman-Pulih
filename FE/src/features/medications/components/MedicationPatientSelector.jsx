/**
 * MedicationPatientSelector — caregiver-mode dropdown to select linked patient.
 * @param {Array}    patients       - [{ id, name }] from /api/family/members
 * @param {string}   selectedId     - currently selected patient ID
 * @param {Function} onSelect       - (patientId) => void
 */
const MedicationPatientSelector = ({ patients = [], selectedId, onSelect }) => {
  if (!patients.length) return null;

  return (
    <select
      className="med-patient-selector"
      value={selectedId || ''}
      onChange={(e) => onSelect(e.target.value || null)}
      aria-label="Pilih pasien"
    >
      <option value="">— Pilih Pasien —</option>
      {patients.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name || p.full_name || `Pasien ${p.id}`}
        </option>
      ))}
    </select>
  );
};

export default MedicationPatientSelector;
