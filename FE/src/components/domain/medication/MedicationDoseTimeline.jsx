import MedicationDoseItem from './MedicationDoseItem';

/**
 * Determine status of a time slot based on today's logs.
 */
const resolveStatus = (time, medId, logs) => {
  const log = logs.find(
    (l) => l.medication_id === medId && l.time_slot === time
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
    const times = schedule.time_slots
      ? (typeof schedule.time_slots === 'string'
          ? schedule.time_slots.split(',').map((t) => t.trim())
          : schedule.time_slots)
      : [];
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
