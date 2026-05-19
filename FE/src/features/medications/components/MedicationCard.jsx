import { LuPill, LuChevronRight } from 'react-icons/lu';
import MedicationProgressBar from '@/features/medications/components/MedicationProgressBar';

const parseTimeSlots = (rawSlots) => {
  if (!rawSlots) return [];
  if (Array.isArray(rawSlots)) return rawSlots.map(s => String(s).trim());
  
  let str = String(rawSlots).trim();
  
  if (str.startsWith('[') && str.endsWith(']')) {
    try {
      const parsed = JSON.parse(str);
      if (Array.isArray(parsed)) {
        return parsed.map(s => String(s).trim());
      }
    } catch (e) {
      // fallback
    }
  }
  
  return str
    .split(',')
    .map(item => item.replace(/[\[\]"'\s]/g, '').trim())
    .filter(Boolean);
};

/**
 * Compute how many unique time slots a medication has in total.
 */
const getTotalSlots = (schedules = []) => {
  return schedules.reduce((sum, s) => {
    const slots = parseTimeSlots(s.time_slots);
    return sum + slots.length;
  }, 0);
};

/**
 * Compute how many days remain until the schedule ends.
 */
const getDaysRemaining = (schedules = []) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const ends = schedules
    .filter((s) => s.end_date)
    .map((s) => new Date(s.end_date));
  if (!ends.length) return null;
  const maxEnd = new Date(Math.max(...ends));
  const diff = Math.ceil((maxEnd - today) / (1000 * 60 * 60 * 24));
  return diff;
};

/**
 * MedicationCard — displays one medication with name, dosage, progress bar, and days left.
 * @param {object} med - Medication data object.
 * @param {Array}  logs - Dose log entries for progress calculation.
 * @param {Function} onClick - Navigate to detail page.
 */
const MedicationCard = ({ med, logs = [], onClick }) => {
  const totalSlots = getTotalSlots(med.medication_schedules);
  const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local
  const takenToday = logs.filter((l) => {
    const logDate = l.taken_at ? new Date(l.taken_at).toLocaleDateString('en-CA') : null;
    return (
      l.medication_id === med.id &&
      l.status === 'taken' &&
      logDate === todayStr &&
      l.time_slot // Ensure time_slot is not null
    );
  });
  // Use a Set to ensure we count unique time slots
  const takenCount = new Set(takenToday.map((l) => l.time_slot)).size;
  const daysLeft = getDaysRemaining(med.medication_schedules);

  const isActiveToday = med.medication_schedules?.some((s) => {
    const today = new Date().toISOString().split('T')[0];
    const start = s.start_date?.split('T')[0];
    const end = s.end_date?.split('T')[0];
    if (!start) return false;
    if (end) return today >= start && today <= end;
    return today >= start;
  });

  return (
    <article
      className={`med-card${isActiveToday ? ' active-today' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`Detail obat ${med.name}`}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      data-testid={`med-card-${med.id}`}
    >
      <div className="med-card-header">
        <div className="med-card-icon" aria-hidden="true">
          <LuPill size={20} />
        </div>
        <div className="med-card-info">
          <span className="med-card-name">{med.name}</span>
          <span className="med-card-dosage">
            {med.dosage}
            {med.medication_schedules?.[0]?.frequency && (
              <> &bull; {med.medication_schedules[0].frequency}</>
            )}
          </span>
        </div>
        <LuChevronRight size={16} className="med-card-chevron" aria-hidden="true" />
      </div>

      <MedicationProgressBar taken={takenCount} total={totalSlots} daysLeft={daysLeft} />
    </article>
  );
};

export default MedicationCard;
