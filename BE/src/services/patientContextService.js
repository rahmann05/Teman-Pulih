/**
 * patientContextService.js
 *
 * Single Responsibility: Membangun snapshot perilaku klinis pasien secara real-time
 * dari berbagai sumber data (log obat, penyakit, kepatuhan, interaksi caregiver).
 *
 * Output: systemPromptInjection — string yang disuntikkan ke system prompt chatbot Asep
 * setiap kali sesi baru dimulai (karena history chat dihapus setiap logout).
 *
 * Data yang dikumpulkan:
 *  1. Tingkat kepatuhan minum obat (% taken dari 30 hari terakhir)
 *  2. Frekuensi keterlambatan (jumlah notifikasi patient_late)
 *  3. Daftar obat aktif beserta dosis
 *  4. Daftar penyakit aktif yang sedang diderita
 *  5. Kelas hasil analisis kepatuhan AI (adherence, behaviour, perception)
 *  6. Frekuensi interaksi dengan caregiver (berapa sering caregiver merespons)
 */

const db = require('../config/db');
const { supabase } = require('../config/db');

/**
 * Membangun konteks perilaku klinis pasien untuk disuntikkan ke chatbot Asep.
 *
 * @param {number} patientId - ID pasien dari tabel users
 * @returns {string} systemPromptInjection - teks siap pakai untuk system prompt
 */
const buildPatientBehaviorContext = async (patientId) => {
    const [
        adherenceStats,
        activeMedications,
        activeIllnesses,
        latestCompliance,
        caregiverInteractionFreq
    ] = await Promise.allSettled([
        fetchAdherenceStats(patientId),
        fetchActiveMedications(patientId),
        fetchActiveIllnesses(patientId),
        fetchLatestComplianceClasses(patientId),
        fetchCaregiverInteractionFreq(patientId)
    ]);

    const stats    = adherenceStats.status       === 'fulfilled' ? adherenceStats.value       : null;
    const meds     = activeMedications.status    === 'fulfilled' ? activeMedications.value    : [];
    const illnesses = activeIllnesses.status     === 'fulfilled' ? activeIllnesses.value      : [];
    const classes  = latestCompliance.status     === 'fulfilled' ? latestCompliance.value     : null;
    const caregiver = caregiverInteractionFreq.status === 'fulfilled' ? caregiverInteractionFreq.value : null;

    return assembleSystemPromptInjection({ stats, meds, illnesses, classes, caregiver });
};

// ─── Data Fetchers ────────────────────────────────────────────────────────────

/**
 * 1. Tingkat kepatuhan & keterlambatan — dari medication_logs 30 hari terakhir
 */
const fetchAdherenceStats = async (patientId) => {
    const query = `
        SELECT
            COUNT(*) FILTER (WHERE ml.status = 'taken')                           AS total_taken,
            COUNT(*) FILTER (WHERE ml.status = 'missed')                          AS total_missed,
            COUNT(*)                                                               AS total_scheduled,
            -- Keterlambatan: log dimana taken_at lebih dari 15 menit setelah waktu jadwal
            COUNT(*) FILTER (
                WHERE ml.status = 'taken'
                AND ml.taken_at IS NOT NULL
                AND ml.time_slot IS NOT NULL
                AND EXTRACT(EPOCH FROM (
                    ml.taken_at::timestamptz - (ml.taken_at::date + ml.time_slot::time)
                )) / 60 > 15
            )                                                                     AS total_late,
            -- Rata-rata keterlambatan dalam menit
            ROUND(AVG(
                CASE
                    WHEN ml.status = 'taken'
                    AND ml.taken_at IS NOT NULL
                    AND ml.time_slot IS NOT NULL
                    THEN GREATEST(0, EXTRACT(EPOCH FROM (
                        ml.taken_at::timestamptz - (ml.taken_at::date + ml.time_slot::time)
                    )) / 60)
                END
            )::numeric, 1)                                                        AS avg_late_minutes
        FROM medication_logs ml
        JOIN medications m ON ml.medication_id = m.id
        WHERE m.user_id = $1
          AND ml.created_at >= NOW() - INTERVAL '30 days'
    `;
    const { rows } = await db.query(query, [patientId]);
    const row = rows[0];
    if (!row || Number(row.total_scheduled) === 0) return null;

    const taken     = Number(row.total_taken)    || 0;
    const missed    = Number(row.total_missed)   || 0;
    const scheduled = Number(row.total_scheduled)|| 0;
    const late      = Number(row.total_late)     || 0;
    const avgLate   = Number(row.avg_late_minutes) || 0;

    const adherenceRate = scheduled > 0 ? Math.round((taken / scheduled) * 100) : 0;

    return { taken, missed, late, scheduled, adherenceRate, avgLate };
};

/**
 * 2. Daftar obat aktif beserta dosis & jadwal
 */
const fetchActiveMedications = async (patientId) => {
    const query = `
        SELECT
            m.name,
            m.dosage,
            m.unit,
            m.instructions,
            ms.time_slots,
            ms.frequency
        FROM medications m
        LEFT JOIN medication_schedules ms ON ms.medication_id = m.id
        WHERE m.user_id = $1
          AND m.deleted_at IS NULL
          AND (ms.end_date IS NULL OR ms.end_date >= CURRENT_DATE)
        ORDER BY m.name
    `;
    const { rows } = await db.query(query, [patientId]);
    return rows;
};

/**
 * 3. Penyakit aktif yang sedang diderita
 */
const fetchActiveIllnesses = async (patientId) => {
    const { data, error } = await supabase
        .from('illness_history')
        .select('illness_name, notes, diagnosed_at')
        .eq('user_id', patientId)
        .eq('is_active', true)
        .order('diagnosed_at', { ascending: false });

    if (error || !data) return [];
    return data;
};

/**
 * 4. Kelas hasil analisis kepatuhan AI terbaru (adherence, behaviour, perception)
 */
const fetchLatestComplianceClasses = async (patientId) => {
    const query = `
        SELECT
            adherence_class,
            behaviour_class,
            perception_class,
            adherence_score,
            created_at
        FROM compliance_assessments
        WHERE patient_id = $1
        ORDER BY created_at DESC
        LIMIT 1
    `;
    const { rows } = await db.query(query, [patientId]);
    if (rows.length === 0) return null;

    const row = rows[0];
    const testedDaysAgo = Math.floor((Date.now() - new Date(row.created_at)) / (1000 * 60 * 60 * 24));

    return {
        adherence_class:  row.adherence_class,
        behaviour_class:  row.behaviour_class,
        perception_class: row.perception_class,
        adherence_score:  row.adherence_score,
        testedDaysAgo
    };
};

/**
 * 5. Frekuensi interaksi caregiver — berapa kali notifikasi caregiver_taken/caregiver_late
 *    dikirim dalam 30 hari terakhir (proxy: seberapa sering caregiver terlibat)
 */
const fetchCaregiverInteractionFreq = async (patientId) => {
    // Ambil caregiver yang terhubung
    const { data: relations } = await supabase
        .from('family_relations')
        .select('caregiver_id')
        .eq('patient_id', patientId)
        .eq('status', 'accepted');

    if (!relations || relations.length === 0) {
        return { hasCaregivers: false, totalAlerts: 0, caregiverCount: 0 };
    }

    const caregiverIds = relations.map(r => r.caregiver_id);

    // Hitung total notifikasi caregiver_late dalam 30 hari (proxy keterlibatan)
    const query = `
        SELECT COUNT(*) AS total_alerts
        FROM notifications
        WHERE user_id = ANY($1::uuid[])
          AND type IN ('caregiver_late', 'caregiver_taken', 'compliance_alert')
          AND created_at >= NOW() - INTERVAL '30 days'
    `;
    const { rows } = await db.query(query, [caregiverIds]);
    const totalAlerts = Number(rows[0]?.total_alerts) || 0;

    return {
        hasCaregivers: true,
        caregiverCount: caregiverIds.length,
        totalAlerts
    };
};

// ─── Assembler ────────────────────────────────────────────────────────────────

const ADHERENCE_LABELS = { 0: 'Low (Tidak Patuh)', 1: 'High (Patuh)' };
const BEHAVIOUR_LABELS = { 0: 'Negatif (Rutinitas Buruk)', 1: 'Positif (Rutinitas Baik)' };
const PERCEPTION_LABELS = {
    0: 'Negatif (Pesimis / Ragu / Merasa Terbebani)',
    1: 'Netral (Belum Sadar Penuh)',
    2: 'Positif (Optimis / Memahami Pentingnya Obat)'
};

const assembleSystemPromptInjection = ({ stats, meds, illnesses, classes, caregiver }) => {
    const lines = ['--- KONTEKS KLINIS PASIEN (Real-time, Diperbarui Setiap Sesi) ---'];

    // ── Penyakit aktif ──
    if (illnesses.length > 0) {
        lines.push('\nDIAGNOSIS AKTIF PASIEN:');
        illnesses.forEach(ill => {
            lines.push(`  - ${ill.illness_name}${ill.notes ? ` (catatan: ${ill.notes})` : ''}`);
        });
    } else {
        lines.push('\nDIAGNOSIS AKTIF: Tidak ada data diagnosis aktif tercatat.');
    }

    // ── Obat aktif ──
    if (meds.length > 0) {
        lines.push('\nOBAT-OBATAN YANG SEDANG DIKONSUMSI:');
        meds.forEach(med => {
            const schedule = med.time_slots ? `(jadwal: ${med.time_slots})` : '';
            lines.push(`  - ${med.name} ${med.dosage || ''} ${med.unit || ''} ${schedule} — Instruksi: ${med.instructions || 'tidak ada'}`);
        });
        lines.push(`Total jenis obat aktif: ${meds.length} jenis`);
    } else {
        lines.push('\nOBAT-OBATAN: Belum ada obat yang terdaftar.');
    }

    // ── Statistik kepatuhan riil dari log ──
    if (stats) {
        const lateLabel = stats.late === 0
            ? 'tidak pernah terlambat'
            : stats.late <= 3
                ? 'jarang terlambat'
                : stats.late <= 10
                    ? 'cukup sering terlambat'
                    : 'sangat sering terlambat';

        const adherenceLabel = stats.adherenceRate >= 90
            ? 'Sangat Patuh'
            : stats.adherenceRate >= 70
                ? 'Cukup Patuh'
                : stats.adherenceRate >= 50
                    ? 'Kurang Patuh'
                    : 'Tidak Patuh';

        lines.push('\nSTATISTIK PERILAKU MINUM OBAT (30 Hari Terakhir):');
        lines.push(`  - Tingkat kepatuhan riil: ${stats.adherenceRate}% (${adherenceLabel})`);
        lines.push(`  - Total diminum tepat waktu: ${stats.taken} dari ${stats.scheduled} jadwal`);
        lines.push(`  - Total terlewat (missed): ${stats.missed} kali`);
        lines.push(`  - Frekuensi keterlambatan: ${stats.late} kali (${lateLabel})`);
        if (stats.avgLate > 0) {
            lines.push(`  - Rata-rata keterlambatan: ${stats.avgLate} menit`);
        }
    } else {
        lines.push('\nSTATISTIK PERILAKU: Belum ada data log minum obat.');
    }

    // ── Kelas kepatuhan AI ──
    if (classes) {
        lines.push(`\nHASIL ANALISIS AI KEPATUHAN (${classes.testedDaysAgo} hari lalu):`);
        lines.push(`  - Adherence: ${ADHERENCE_LABELS[classes.adherence_class] ?? '-'} (skor: ${(classes.adherence_score * 100).toFixed(0)}%)`);
        lines.push(`  - Behaviour: ${BEHAVIOUR_LABELS[classes.behaviour_class] ?? '-'}`);
        lines.push(`  - Perception: ${PERCEPTION_LABELS[classes.perception_class] ?? '-'}`);
    } else {
        lines.push('\nHASIL ANALISIS AI KEPATUHAN: Pasien belum pernah mengisi kuesioner analisis kepatuhan.');
    }

    // ── Keterlibatan caregiver ──
    if (caregiver) {
        if (!caregiver.hasCaregivers) {
            lines.push('\nCAREGIVER: Pasien tidak memiliki pendamping/caregiver yang terhubung.');
        } else {
            const engagementLabel = caregiver.totalAlerts === 0
                ? 'belum ada peringatan dikirim (patuh atau belum ada data cukup)'
                : caregiver.totalAlerts <= 5
                    ? 'tingkat interaksi rendah'
                    : caregiver.totalAlerts <= 15
                        ? 'tingkat interaksi sedang'
                        : 'tingkat interaksi tinggi — caregiver sering dinotifikasi';

            lines.push(`\nKETERLIBATAN CAREGIVER (30 Hari Terakhir):`);
            lines.push(`  - Jumlah caregiver aktif: ${caregiver.caregiverCount} orang`);
            lines.push(`  - Total peringatan dikirim ke caregiver: ${caregiver.totalAlerts} kali (${engagementLabel})`);
        }
    }

    // ── Instruksi untuk Asep ──
    lines.push(`
INSTRUKSI UNTUK ASEP BERDASARKAN KONTEKS INI:
- Gunakan data di atas untuk memahami kondisi klinis pasien sebelum merespons.
- Jika pasien bertanya tentang obatnya, rujuk daftar obat aktif di atas.
- Jika pasien mengungkapkan kekhawatiran, sesuaikan empati dengan tingkat kepatuhan dan persepsinya.
- Jangan secara eksplisit menyebut angka statistik internal kepada pasien kecuali relevan dan diminta.
- Selalu arahkan pertanyaan dosis/penghentian obat ke dokter atau tenaga kesehatan.
--- AKHIR KONTEKS KLINIS PASIEN ---`);

    return lines.join('\n');
};

module.exports = { buildPatientBehaviorContext };
