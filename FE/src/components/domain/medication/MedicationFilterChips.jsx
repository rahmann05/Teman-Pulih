import MedicationChip from '../../ui/medication/MedicationChip';

/**
 * MedicationFilterChips — horizontal scroll filter pills for medication list.
 * @param {string}   activeFilter  - 'all' | 'today' | 'done'
 * @param {Function} onFilterChange
 */
const FILTERS = [
  { key: 'all',   label: 'Semua' },
  { key: 'today', label: 'Hari Ini' },
  { key: 'done',  label: 'Selesai' },
];

const MedicationFilterChips = ({ activeFilter, onFilterChange }) => (
  <div className="med-filter-chips" role="tablist" aria-label="Filter jadwal obat">
    {FILTERS.map(({ key, label }) => (
      <MedicationChip
        key={key}
        label={label}
        active={activeFilter === key}
        onClick={() => onFilterChange(key)}
      />
    ))}
  </div>
);

export default MedicationFilterChips;
