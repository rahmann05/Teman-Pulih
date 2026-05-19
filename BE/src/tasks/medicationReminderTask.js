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
        console.log('[CRON-Medication] Checking medication schedules...');
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

                    // Create scheduled date time for today
                    const scheduledTime = new Date(now);
                    scheduledTime.setHours(hours, minutes, 0, 0);

                    const diffMs = now - scheduledTime;
                    const diffMinutes = Math.round(diffMs / 60000);

                    // --- Condition A: 10 Minutes Before ---
                    if (diffMinutes >= -10 && diffMinutes < 0) {
                        // Check if already notified
                        const { data: existing } = await serviceSupabase
                            .from('notifications')
                            .select('id')
                            .eq('user_id', patient_id)
                            .eq('type', 'reminder_10m')
                            .eq('schedule_id', schedule_id)
                            .eq('time_slot', slot)
                            .eq('target_date', todayStr);

                        if (!existing || existing.length === 0) {
                            console.log(`[CRON-Medication] Sending 10m reminder for ${medication_name} to ${patient_name}`);
                            
                            // Insert database notification
                            await serviceSupabase
                                .from('notifications')
                                .insert([{
                                    user_id: patient_id,
                                    title: 'Pengingat: Minum Obat 10 Menit Lagi',
                                    message: `Persiapkan diri Anda untuk meminum ${medication_name} (${medication_dosage || ''}) dalam 10 menit (jadwal: ${slot}).`,
                                    type: 'reminder_10m',
                                    schedule_id,
                                    time_slot: slot,
                                    target_date: todayStr
                                }]);

                            // Send WhatsApp / Email
                            const patientContact = await getUserContactInfo(patient_id);
                            if (patientContact) {
                                if (patientContact.phone) {
                                    await notificationService.sendMedicationReminderWhatsApp(patientContact.phone, medication_name, slot);
                                } else if (patientContact.email) {
                                    await notificationService.sendEmail(
                                        patientContact.email,
                                        'Pengingat Minum Obat - 10 Menit Lagi',
                                        `<h3>Halo, ${patient_name}!</h3><p>Jadwal minum obat <strong>${medication_name}</strong> Anda adalah pukul <strong>${slot}</strong> (10 menit lagi).</p>`,
                                        `Halo, ${patient_name}! Jadwal minum obat ${medication_name} Anda adalah pukul ${slot} (10 menit lagi).`
                                    );
                                }
                            }
                        }
                    }

                    // --- Condition B: Exactly On Time ---
                    if (diffMinutes >= 0 && diffMinutes < 15) {
                        // Check if already notified
                        const { data: existing } = await serviceSupabase
                            .from('notifications')
                            .select('id')
                            .eq('user_id', patient_id)
                            .eq('type', 'reminder_exact')
                            .eq('schedule_id', schedule_id)
                            .eq('time_slot', slot)
                            .eq('target_date', todayStr);

                        if (!existing || existing.length === 0) {
                            console.log(`[CRON-Medication] Sending exact reminder for ${medication_name} to ${patient_name}`);
                            
                            // Insert database notification
                            await serviceSupabase
                                .from('notifications')
                                .insert([{
                                    user_id: patient_id,
                                    title: 'Waktunya Minum Obat Sekarang!',
                                    message: `Saatnya meminum obat ${medication_name} (${medication_dosage || ''}) Anda sekarang (jadwal: ${slot}). Jangan lupa mencatatnya setelah diminum.`,
                                    type: 'reminder_exact',
                                    schedule_id,
                                    time_slot: slot,
                                    target_date: todayStr
                                }]);

                            // Send WhatsApp / Email
                            const patientContact = await getUserContactInfo(patient_id);
                            if (patientContact) {
                                if (patientContact.phone) {
                                    await notificationService.sendMedicationReminderWhatsApp(patientContact.phone, medication_name, slot);
                                } else if (patientContact.email) {
                                    await notificationService.sendEmail(
                                        patientContact.email,
                                        'Waktunya Minum Obat Sekarang!',
                                        `<h3>Halo, ${patient_name}!</h3><p>Saatnya meminum obat <strong>${medication_name}</strong> Anda sekarang (jadwal: <strong>${slot}</strong>).</p>`,
                                        `Halo, ${patient_name}! Saatnya meminum obat ${medication_name} Anda sekarang (jadwal: ${slot}).`
                                    );
                                }
                            }
                        }
                    }

                    // --- Condition D: Late by > 15 Minutes ---
                    if (diffMinutes >= 15) {
                        // Check if patient has logged it as taken
                        const { data: takenLog, error: logErr } = await serviceSupabase
                            .from('medication_logs')
                            .select('id')
                            .eq('schedule_id', schedule_id)
                            .eq('time_slot', slot)
                            .eq('status', 'taken')
                            .gte('taken_at', todayStart.toISOString())
                            .lte('taken_at', todayEnd.toISOString());

                        if (!logErr && (!takenLog || takenLog.length === 0)) {
                            // Patient is LATE!
                            // Check if caregiver_late has already been notified
                            const { data: existingNotif } = await serviceSupabase
                                .from('notifications')
                                .select('id')
                                .eq('user_id', patient_id)
                                .eq('type', 'patient_late')
                                .eq('schedule_id', schedule_id)
                                .eq('time_slot', slot)
                                .eq('target_date', todayStr);

                            if (!existingNotif || existingNotif.length === 0) {
                                console.log(`[CRON-Medication] ${patient_name} is late by 15m for ${medication_name} schedule ${slot}`);

                                // 1. Notify patient
                                await serviceSupabase
                                    .from('notifications')
                                    .insert([{
                                        user_id: patient_id,
                                        title: 'Terlambat Minum Obat!',
                                        message: `Anda terlambat meminum obat ${medication_name} (${medication_dosage || ''}) lebih dari 15 menit dari jadwal (pukul ${slot}). Mohon segera diminum.`,
                                        type: 'patient_late',
                                        schedule_id,
                                        time_slot: slot,
                                        target_date: todayStr
                                    }]);

                                // 2. Query accepted caregivers
                                const { data: relations } = await serviceSupabase
                                    .from('family_relations')
                                    .select('caregiver_id')
                                    .eq('patient_id', patient_id)
                                    .eq('status', 'accepted');

                                if (relations && relations.length > 0) {
                                    for (const rel of relations) {
                                        // Insert caregiver notification
                                        await serviceSupabase
                                            .from('notifications')
                                            .insert([{
                                                user_id: rel.caregiver_id,
                                                title: `Peringatan: ${patient_name} Terlambat Minum Obat!`,
                                                message: `${patient_name} terlambat meminum obat ${medication_name} (${medication_dosage || ''}) lebih dari 15 menit dari jadwal seharusnya (pukul ${slot}).`,
                                                type: 'caregiver_late',
                                                schedule_id,
                                                time_slot: slot,
                                                target_date: todayStr
                                            }]);

                                        // Send WhatsApp/Email to caregiver
                                        const caregiverContact = await getUserContactInfo(rel.caregiver_id);
                                        if (caregiverContact) {
                                            const message = `Peringatan: ${patient_name} terlambat meminum obat ${medication_name} lebih dari 15 menit dari jadwal seharusnya (pukul ${slot}).`;
                                            if (caregiverContact.phone) {
                                                await notificationService.sendWhatsApp(caregiverContact.phone, message);
                                            } else if (caregiverContact.email) {
                                                await notificationService.sendEmail(
                                                    caregiverContact.email,
                                                    `Peringatan: ${patient_name} Terlambat Minum Obat!`,
                                                    `<h3>Peringatan Hubungan Pendamping</h3><p>${message}</p>`,
                                                    message
                                                );
                                            }
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
