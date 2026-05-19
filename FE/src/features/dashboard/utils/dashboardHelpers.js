/* src/services/dashboardHelpers.js */

export const getInitials = (name = '') => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'TP';
  return parts.slice(0, 2).map((part) => part[0]).join('').toUpperCase();
};

export const cleanTime = (time) => {
  if (!time) return '';
  // Remove brackets and quotes that might come from stringified JSON/DB exports
  return String(time).replace(/[\[\]"]/g, '').trim();
};

export const parseTimeSlots = (timeSlots) => {
  if (!timeSlots) return [];
  
  let slots = [];
  if (Array.isArray(timeSlots)) {
    slots = timeSlots;
  } else {
    // Check if it's a stringified JSON array
    if (typeof timeSlots === 'string' && timeSlots.trim().startsWith('[') && timeSlots.trim().endsWith(']')) {
      try {
        slots = JSON.parse(timeSlots);
      } catch (e) {
        slots = timeSlots.split(',').map(s => s.trim());
      }
    } else {
      slots = String(timeSlots).split(',').map((slot) => slot.trim());
    }
  }

  return slots.map(cleanTime).filter(Boolean);
};

export const toMinutes = (time) => {
  const [hours = '0', minutes = '0'] = String(cleanTime(time)).split(':');
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
        const isTaken = takenTodaySlots.has(time);

        items.push({
          id: `${medication.id}-${schedule.id}-${time}`,
          medicationId: medication.id,
          scheduleId: schedule.id,
          time,
          medName: medication.name,
          instruction: formatInstruction(medication),
          progress: `${takenTodaySlots.size}/${totalCount} diminum`,
          state: isTaken ? 'taken' : 'upcoming',
          isTaken,
        });
      });
    });
  });

  const sortedItems = items.sort((left, right) => toMinutes(left.time) - toMinutes(right.time));
  const firstUntakenIndex = sortedItems.findIndex((item) => !item.isTaken);

  return sortedItems.map((item, index) => ({
    ...item,
    state: item.isTaken
      ? 'taken'
      : (index === firstUntakenIndex ? 'next' : 'upcoming'),
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
          isTaken: false,
        });
        return;
      }

      timeSlots.forEach((time) => {
        const isTaken = takenTodaySlots.has(time);
        items.push({
          id: `${medication.id}-${schedule.id}-${time}`,
          time,
          patient: patientName,
          name: medication.name,
          desc: formatInstruction(medication),
          progress: `${takenTodaySlots.size}/${totalCount} diminum`,
          isTaken,
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

export const buildWeeklyMedicationHistory = (medications = [], logs = [], days = []) => {
  const data = {};

  const now = new Date();
  const currentTodayStr = now.toLocaleDateString('en-CA'); // YYYY-MM-DD local
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  days.forEach((day) => {
    const dayStr = day.fullDate;
    const medsForDay = [];

    medications.forEach((medication) => {
      const schedules = medication.medication_schedules || [];
      schedules.forEach((schedule) => {
        // Cek apakah hari ini berada dalam rentang start_date dan end_date jadwal jika terdefinisi
        if (schedule.start_date && dayStr < schedule.start_date) return;
        if (schedule.end_date && dayStr > schedule.end_date) return;

        const timeSlots = parseTimeSlots(schedule.time_slots);

        timeSlots.forEach((time) => {
          // Cari log yang cocok untuk obat ini, jadwal ini, waktu ini, pada hari ini
          const matchingLogs = logs.filter((log) => {
            const logDate = log.taken_at ? new Date(log.taken_at).toLocaleDateString('en-CA') : null;
            return (
              log.medication_id === medication.id &&
              log.schedule_id === schedule.id &&
              log.time_slot === time &&
              logDate === dayStr
            );
          });

          const log = matchingLogs[0];
          let status = 'PENDING'; // Default gray

          if (log) {
            if (log.status === 'taken') {
              if (log.taken_at) {
                // Bandingkan jam & menit diambil dengan jam & menit jadwal
                const takenDate = new Date(log.taken_at);
                const actualMinutes = takenDate.getHours() * 60 + takenDate.getMinutes();
                const expectedMinutes = toMinutes(time);
                
                // Selisih menit (toleransi 1 jam / 60 menit)
                const diff = Math.abs(actualMinutes - expectedMinutes);
                status = diff <= 60 ? 'ON_TIME' : 'LATE';
              } else {
                status = 'ON_TIME';
              }
            } else {
              status = 'MISSED'; // missed or skipped
            }
          } else {
            // Jika tidak ada log, tentukan apakah jadwalnya sudah terlewat
            if (dayStr < currentTodayStr) {
              // Hari kemarin atau sebelumnya -> terlewat (merah)
              status = 'MISSED';
            } else if (dayStr === currentTodayStr) {
              // Hari ini -> cek apakah sudah lewat jam terjadwal + 60 menit toleransi
              const scheduledMinutes = toMinutes(time);
              if (scheduledMinutes + 60 < currentMinutes) {
                status = 'MISSED';
              } else {
                status = 'PENDING';
              }
            } else {
              // Hari esok / masa depan -> pending (abu-abu)
              status = 'PENDING';
            }
          }

          medsForDay.push({
            id: `${medication.id}-${schedule.id}-${dayStr}-${time}`,
            name: medication.name,
            time,
            status,
          });
        });
      });
    });

    // Urutkan obat berdasarkan waktu terjadwal di hari itu
    data[dayStr] = medsForDay.sort((left, right) => toMinutes(left.time) - toMinutes(right.time));
  });

  return data;
};
