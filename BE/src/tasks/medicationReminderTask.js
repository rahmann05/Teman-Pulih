const cron = require('node-cron');
const { supabase: serviceSupabase } = require('../config/db');
const db = require('../config/db');
const notificationService = require('../services/notificationService');

/**
 * Helper to get patient/caregiver contact info
 */
const getUserContactInfo = async (userId) => {
    try {
        const query = `
            SELECT u.id, u.name, u.email, p.phone 
            FROM users u 
            LEFT JOIN profiles p ON u.id = p.user_id 
            WHERE u.id = $1
        `;
        const { rows } = await db.query(query, [userId]);
        return rows[0] || null;
    } catch (err) {
        console.error('[ReminderTask Contact Query Error]:', err.message);
        return null;
    }
};

/**
 * Medication Reminder Task
 * Runs every minute to check schedules and dispatch notifications
 */
const initReminderTasks = () => {
    // Schedule: every minute
    cron.schedule('* * * * *', async () => {
        // Silenced to keep dev logs clean
        const now = new Date();
        const todayStr = now.toLocaleDateString('en-CA'); // YYYY-MM-DD local

        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(now);
        todayEnd.setHours(23, 59, 59, 999);

        try {
            // 1. Get all ongoing/active schedules for today
            const query = `
                SELECT 
                    ms.id as schedule_id,
                    ms.time_slots,
                    m.name as medication_name,
                    m.dosage as medication_dosage,
                    m.user_id as patient_id,
                    u.name as patient_name,
                    u.email as patient_email
                FROM medication_schedules ms
                JOIN medications m ON ms.medication_id = m.id
                JOIN users u ON m.user_id = u.id
                WHERE (ms.start_date IS NULL OR ms.start_date <= $1)
                  AND (ms.end_date IS NULL OR ms.end_date >= $1)
                  AND m.deleted_at IS NULL
            `;
            const { rows: schedules } = await db.query(query, [todayStr]);

            for (const schedule of schedules) {
                const { schedule_id, time_slots, medication_name, medication_dosage, patient_id, patient_name } = schedule;
                if (!time_slots) continue;

                // Parse time slots (handles both legacy comma-separated string and JSON array strings)
                let slots = [];
                try {
                    if (time_slots.startsWith('[') && time_slots.endsWith(']')) {
                        slots = JSON.parse(time_slots);
                    } else {
                        slots = time_slots.split(',').map(s => s.trim());
                    }
                } catch (e) {
                    slots = time_slots.split(',').map(s => s.trim());
                }

                // Standardize and clean each slot
                slots = (Array.isArray(slots) ? slots : [slots]).map(s => {
                    if (typeof s !== 'string') return '';
                    return s.replace(/[\[\]"']/g, '').trim();
                }).filter(Boolean);

                for (const slot of slots) {
                    const [hours, minutes] = slot.split(':').map(Number);
                    if (Number.isNaN(hours) || Number.isNaN(minutes)) continue;

                    const scheduledTime = new Date(now);
                    scheduledTime.setHours(hours, minutes, 0, 0);

                    const diffMs = now - scheduledTime;
                    const diffMinutes = Math.round(diffMs / 60000);

                    // We only process if diffMinutes matches one of our trigger times
                    const isBefore15 = diffMinutes === -15;
                    const isBefore10 = diffMinutes === -10;
                    const isBefore5 = diffMinutes === -5;
                    const isExact = diffMinutes === 0;
                    const isLate15 = diffMinutes === 15;
                    const isLateHourly = diffMinutes > 15 && diffMinutes % 60 === 15; // e.g. 75, 135
                    const isLate15Min = diffMinutes > 15 && diffMinutes % 15 === 0;   // e.g. 30, 45, 60

                    if (!isBefore15 && !isBefore10 && !isBefore5 && !isExact && !isLate15 && !isLateHourly && !isLate15Min) {
                        continue;
                    }

                    // Determine Compliance Level
                    const { data: assessments } = await serviceSupabase
                        .from('compliance_assessments')
                        .select('global_score')
                        .eq('patient_id', patient_id)
                        .order('created_at', { ascending: false })
                        .limit(1);

                    let score = 1.0;
                    if (assessments && assessments.length > 0) {
                        score = assessments[0].global_score ?? 1.0;
                    }

                    let complianceLevel = 'baik';
                    if (score < 0.50) complianceLevel = 'mengkhawatirkan';
                    else if (score < 0.75) complianceLevel = 'menengah';

                    // WA Toggle Config (Fallback to True if not exist)
                    const { data: prefs } = await serviceSupabase
                        .from('reminder_preferences')
                        .select('enabled')
                        .eq('user_id', patient_id)
                        .limit(1);
                    const isWaEnabledSetting = prefs && prefs.length > 0 ? prefs[0].enabled : true;

                    // If menengah/mengkhawatirkan -> WA is always ON (Cannot be turned off).
                    const shouldSendWa = complianceLevel !== 'baik' || isWaEnabledSetting;

                    // Check if rule applies
                    let shouldTrigger = false;
                    let notifType = '';
                    let title = '';
                    let msg = '';
                    let isLate = false;

                    if (isBefore15 && complianceLevel === 'mengkhawatirkan') {
                        shouldTrigger = true; notifType = 'reminder_15m';
                        title = 'Pengingat: Minum Obat 15 Menit Lagi';
                        msg = `Persiapkan diri Anda untuk meminum ${medication_name} (${medication_dosage || ''}) dalam 15 menit (jadwal: ${slot}).`;
                    } else if (isBefore10) { // All levels
                        shouldTrigger = true; notifType = 'reminder_10m';
                        title = 'Pengingat: Minum Obat 10 Menit Lagi';
                        msg = `Persiapkan diri Anda untuk meminum ${medication_name} (${medication_dosage || ''}) dalam 10 menit (jadwal: ${slot}).`;
                    } else if (isBefore5 && (complianceLevel === 'menengah' || complianceLevel === 'mengkhawatirkan')) {
                        shouldTrigger = true; notifType = 'reminder_5m';
                        title = 'Pengingat: Minum Obat 5 Menit Lagi';
                        msg = `Persiapkan diri Anda untuk meminum ${medication_name} (${medication_dosage || ''}) dalam 5 menit (jadwal: ${slot}).`;
                    } else if (isExact) { // All levels
                        shouldTrigger = true; notifType = 'reminder_exact';
                        title = 'Waktunya Minum Obat Sekarang!';
                        msg = `Saatnya meminum obat ${medication_name} (${medication_dosage || ''}) Anda sekarang (jadwal: ${slot}). Jangan lupa mencatatnya setelah diminum.`;
                    } else if (isLate15) { // All levels
                        shouldTrigger = true; notifType = 'patient_late'; isLate = true;
                        title = 'Terlambat Minum Obat!';
                        msg = `Anda terlambat meminum obat ${medication_name} (${medication_dosage || ''}) lebih dari 15 menit dari jadwal (pukul ${slot}). Mohon segera diminum.`;
                    } else if (isLateHourly && complianceLevel === 'menengah') {
                        shouldTrigger = true; notifType = `patient_late_hourly_${diffMinutes}`; isLate = true;
                        title = 'Peringatan Lanjutan: Anda Belum Minum Obat';
                        msg = `Sudah lewat ${Math.floor(diffMinutes / 60)} jam dari jadwal minum obat ${medication_name}. Kesehatan Anda sangat penting, segera minum sekarang.`;
                    } else if (isLate15Min && complianceLevel === 'mengkhawatirkan') {
                        shouldTrigger = true; notifType = `patient_late_15min_${diffMinutes}`; isLate = true;
                        title = 'Peringatan Darurat: Segera Minum Obat Anda';
                        msg = `Anda sangat terlambat meminum ${medication_name}. Mohon jangan ditunda lagi untuk hasil pemulihan optimal!`;
                    }

                    if (!shouldTrigger) continue;

                    // If it's a late notification, ensure they haven't actually taken it yet
                    if (isLate) {
                        const { data: takenLogs, error: logErr } = await serviceSupabase
                            .from('medication_logs')
                            .select('id, taken_at')
                            .eq('schedule_id', schedule_id)
                            .eq('time_slot', slot)
                            .eq('status', 'taken');

                        const hasBeenTakenToday = !logErr && takenLogs && takenLogs.some(l => {
                            const logDate = l.taken_at ? new Date(l.taken_at).toLocaleDateString('en-CA') : null;
                            return logDate === todayStr;
                        });
                        
                        if (hasBeenTakenToday) continue; // Skip since they already took it!
                    }

                    // Check if already notified
                    const { data: existing } = await serviceSupabase
                        .from('notifications')
                        .select('id')
                        .eq('user_id', patient_id)
                        .eq('type', notifType)
                        .eq('schedule_id', schedule_id)
                        .eq('time_slot', slot)
                        .eq('target_date', todayStr);

                    if (!existing || existing.length === 0) {
                        console.log(`[CRON-Medication] Sending ${notifType} to ${patient_name}`);
                        
                        // 1. Notify patient
                        await serviceSupabase
                            .from('notifications')
                            .insert([{
                                user_id: patient_id,
                                title,
                                message: msg,
                                type: notifType,
                                schedule_id,
                                time_slot: slot,
                                target_date: todayStr
                            }]);

                        // Send WhatsApp / Email to Patient (Obeying WA Config)
                        const patientContact = await getUserContactInfo(patient_id);
                        if (patientContact) {
                            if (patientContact.phone && shouldSendWa) {
                                await notificationService.sendWhatsApp(patientContact.phone, msg);
                            } else if (patientContact.email) {
                                await notificationService.sendEmail(patientContact.email, title, `<h3>${title}</h3><p>${msg}</p>`, msg);
                            }
                        }

                        // 2. Notify Caregiver if it's a late warning (inheriting patient's frequency)
                        if (isLate) {
                            const { data: relations } = await serviceSupabase
                                .from('family_relations')
                                .select('caregiver_id')
                                .eq('patient_id', patient_id)
                                .eq('status', 'accepted');

                            if (relations && relations.length > 0) {
                                for (const rel of relations) {
                                    const cgNotifType = `cg_${notifType}`;
                                    
                                    await serviceSupabase
                                        .from('notifications')
                                        .insert([{
                                            user_id: rel.caregiver_id,
                                            title: `Peringatan: ${patient_name} Belum Minum Obat!`,
                                            message: `${patient_name} belum meminum obat ${medication_name} (jadwal: ${slot}).`,
                                            type: cgNotifType,
                                            schedule_id,
                                            time_slot: slot,
                                            target_date: todayStr
                                        }]);

                                    const caregiverContact = await getUserContactInfo(rel.caregiver_id);
                                    if (caregiverContact) {
                                        const cgMsg = `Peringatan: ${patient_name} belum meminum obat ${medication_name} dari jadwal seharusnya (pukul ${slot}). Mohon segera hubungi pasien.`;
                                        if (caregiverContact.phone) { // Caregiver WA is always sent for late warnings
                                            await notificationService.sendWhatsApp(caregiverContact.phone, cgMsg);
                                        } else if (caregiverContact.email) {
                                            await notificationService.sendEmail(caregiverContact.email, `Peringatan: ${patient_name} Terlambat Minum Obat!`, `<p>${cgMsg}</p>`, cgMsg);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        } catch (err) {
            console.error('[CRON-Medication Error]:', err.message);
        }
    });

    console.log('[CRON] Medication Reminder task scheduled for every minute.');
};

module.exports = { initReminderTasks };
