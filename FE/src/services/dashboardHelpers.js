/* src/services/dashboardHelpers.js */

export const getInitials = (name = '') => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'TP';
  return parts.slice(0, 2).map((part) => part[0]).join('').toUpperCase();
};

export const parseTimeSlots = (timeSlots) => {
  if (!timeSlots) return [];
  if (Array.isArray(timeSlots)) return timeSlots;
  return String(timeSlots)
    .split(',')
    .map((slot) => slot.trim())
    .filter(Boolean);
};

export const toMinutes = (time) => {
  const [hours = '0', minutes = '0'] = String(time).split(':');
  return Number(hours) * 60 + Number(minutes);
};

export const formatInstruction = (medication) => {
  return [medication.dosage, medication.instructions]
    .filter(Boolean)
    .join(' - ') || 'Instruksi belum tersedia';
};

/**
 * Builds timeline for Patient Dashboard
 */
export const buildPatientTimeline = (medications = [], logs = []) => {
  const items = [];

  medications.forEach((medication) => {
    const schedules = medication.medication_schedules || [];
    schedules.forEach((schedule) => {
      const timeSlots = parseTimeSlots(schedule.time_slots);
      const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local
      
      // Get unique time slots taken today for this schedule
      const takenTodaySlots = new Set(
        logs
          .filter((log) => {
            const logDate = log.taken_at ? new Date(log.taken_at).toLocaleDateString('en-CA') : null;
            return (
              log.schedule_id === schedule.id && 
              log.status === 'taken' && 
              logDate === todayStr &&
              log.time_slot // Ensure time_slot matches system
            );
          })
          .map((log) => log.time_slot)
      );

      const totalCount = Math.max(timeSlots.length, 1);

      if (timeSlots.length === 0) {
        items.push({
          id: `${medication.id}-${schedule.id}`,
          medicationId: medication.id,
          scheduleId: schedule.id,
          time: 'Belum dijadwalkan',
          medName: medication.name,
          instruction: formatInstruction(medication),
          progress: `${takenTodaySlots.size}/${totalCount} diminum`,
          state: 'upcoming',
        });
        return;
      }

      timeSlots.forEach((time) => {
        // Jika slot ini sudah diminum hari ini, jangan masukkan ke timeline dashboard utama
        if (takenTodaySlots.has(time)) return;

        items.push({
          id: `${medication.id}-${schedule.id}-${time}`,
          medicationId: medication.id,
          scheduleId: schedule.id,
          time,
          medName: medication.name,
          instruction: formatInstruction(medication),
          progress: `${takenTodaySlots.size}/${totalCount} diminum`,
          state: 'upcoming',
        });
      });
    });
  });

  return items
    .sort((left, right) => toMinutes(left.time) - toMinutes(right.time))
    .map((item, index) => ({
      ...item,
      state: index === 0 ? 'next' : 'upcoming',
    }));
};

/**
 * Builds timeline for Caregiver Dashboard
 */
export const buildCaregiverTimeline = (medications = [], logs = [], patientName = '') => {
  const items = [];

  medications.forEach((medication) => {
    const schedules = medication.medication_schedules || [];
    schedules.forEach((schedule) => {
      const timeSlots = parseTimeSlots(schedule.time_slots);
      const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local
      
      const takenTodaySlots = new Set(
        logs
          .filter((log) => {
            const logDate = log.taken_at ? new Date(log.taken_at).toLocaleDateString('en-CA') : null;
            return (
              log.schedule_id === schedule.id && 
              log.status === 'taken' && 
              logDate === todayStr &&
              log.time_slot
            );
          })
          .map((log) => log.time_slot)
      );

      const totalCount = Math.max(timeSlots.length, 1);

      if (timeSlots.length === 0) {
        items.push({
          id: `${medication.id}-${schedule.id}`,
          time: 'Belum dijadwalkan',
          patient: patientName,
          name: medication.name,
          desc: formatInstruction(medication),
          progress: `${takenTodaySlots.size}/${totalCount} diminum`,
        });
        return;
      }

      timeSlots.forEach((time) => {
        items.push({
          id: `${medication.id}-${schedule.id}-${time}`,
          time,
          patient: patientName,
          name: medication.name,
          desc: formatInstruction(medication),
          progress: `${takenTodaySlots.size}/${totalCount} diminum`,
        });
      });
    });
  });

  return items.sort((left, right) => toMinutes(left.time) - toMinutes(right.time));
};

export const buildRoster = (relations = []) => {
  return relations
    .filter((relation) => relation.status !== 'rejected')
    .map((relation) => {
      const patient = relation.patient || {};
      const statusLabel = relation.status === 'accepted'
        ? 'Pantauan aktif'
        : relation.status === 'pending'
          ? 'Menunggu persetujuan'
          : 'Hubungan tidak aktif';

      return {
        id: relation.id,
        name: patient.name || 'Pasien tanpa nama',
        initials: getInitials(patient.name || 'Pasien'),
        status: relation.status === 'accepted' ? 'safe' : 'alert',
        adherence: statusLabel,
      };
    });
};
