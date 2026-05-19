import MedicationDoseItem from '@/features/medications/components/MedicationDoseItem';

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
    .map(item => item.replace(/[\[\]"']/g, '').trim())
    .filter(Boolean);
};


/**
 * Determine status of a time slot based on today's logs.
 */
const resolveStatus = (time, medId, logs) => {
  const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local
  const log = logs.find(
    (l) => {
      const logDate = l.taken_at ? new Date(l.taken_at).toLocaleDateString('en-CA') : null;
      return l.medication_id === medId && l.time_slot === time && logDate === todayStr;
    }
  );
  return log?.status || 'pending';
};

/**
 * MedicationDoseTimeline — list of today's dose slots for a single medication.
 * @param {object}   medication - The full medication object with schedules.
 * @param {Array}    logs       - Dose log entries from useMedications.
 * @param {Function} onLog      - (medId, scheduleId, status) callback.
 */
const MedicationDoseTimeline = ({ medication, logs = [], onLog }) => {
  if (!medication?.medication_schedules?.length) {
    return (
      <p className="med-dose-empty">Tidak ada jadwal minum untuk obat ini.</p>
    );
  }

  // Collect all time slots across all schedules
  const slots = medication.medication_schedules.flatMap((schedule) => {
    const times = parseTimeSlots(schedule.time_slots);
    return times.map((time) => ({ time, scheduleId: schedule.id }));
  });

  // Sort by time
  slots.sort((a, b) => a.time.localeCompare(b.time));

  return (
    <section className="med-dose-timeline" aria-label="Jadwal minum hari ini">
      <div className="section-header" style={{ padding: '0 var(--space-5)', marginBottom: 'var(--space-3)' }}>
        <h2 className="section-title">Riwayat Hari Ini</h2>
      </div>
      {slots.map(({ time, scheduleId }) => (
        <MedicationDoseItem
          key={`${scheduleId}-${time}`}
          time={time}
          status={resolveStatus(time, medication.id, logs)}
          medId={medication.id}
          scheduleId={scheduleId}
          onLog={onLog}
        />
      ))}
    </section>
  );
};

export default MedicationDoseTimeline;
