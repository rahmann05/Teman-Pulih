import { LuCircleCheck, LuCircleX, LuClock } from 'react-icons/lu';

/**
 * MedicationDoseItem — single row in the today's dose timeline.
 * @param {string}   time       - e.g. "08:00"
 * @param {string}   status     - 'taken' | 'missed' | 'pending'
 * @param {string}   medId      - medication ID (for logging)
 * @param {string}   scheduleId - schedule ID (for logging)
 * @param {Function} onLog      - (medId, scheduleId, status) => void
 */
const STATUS_META = {
  taken:   { icon: LuCircleCheck, label: 'Sudah diminum',  cls: 'taken' },
  missed:  { icon: LuCircleX,     label: 'Tidak diminum', cls: 'missed' },
  pending: { icon: LuClock,       label: 'Belum',          cls: 'pending' },
};

const MedicationDoseItem = ({ time, status = 'pending', medId, scheduleId, onLog }) => {
  const meta = STATUS_META[status] || STATUS_META.pending;
  const Icon = meta.icon;

  return (
    <div className="med-dose-item" data-testid={`dose-item-${time}`}>
      <span className="med-dose-time">{time}</span>

      <span className={`med-dose-status-icon ${meta.cls}`} aria-hidden="true">
        <Icon size={16} />
      </span>

      <span className="med-dose-label">{meta.label}</span>

      {status === 'pending' && onLog && (
        <button
          className="med-dose-action-btn"
          type="button"
          aria-label={`Tandai ${time} sudah diminum`}
          onClick={() => onLog(medId, scheduleId, 'taken')}
        >
          Tandai Diminum
        </button>
      )}
    </div>
  );
};

export default MedicationDoseItem;
