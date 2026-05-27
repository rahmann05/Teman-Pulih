/**
 * interventionEngine.js
 *
 * Single Responsibility: Menerjemahkan hasil klasifikasi multi-task AI
 * (adherence, behaviour, perception) menjadi:
 *   1. activeModes — daftar mode perilaku UI/UX yang diaktifkan
 *   2. actions     — tindakan konkret yang dilakukan oleh sistem
 *   3. chatbotContext — konteks yang disuntikkan ke system prompt chatbot Asep
 *                       agar ia merespons secara adaptif terhadap kondisi pasien
 *
 * Tidak ada "tips" teks statis — pendekatan berbasis mode & chatbot adaptif
 * lebih efektif untuk pasien yang tidak akan membaca teks panjang.
 */

// ─── Daftar Mode Intervensi Aplikasi ─────────────────────────────────────────
// Setiap mode mengubah perilaku UI secara programatik.

const MODES = {
    // ADHERENCE MODES
    INTENSIVE_REMINDER:     'INTENSIVE_REMINDER',     // Alarm ganda WA + in-app
    STANDARD_REMINDER:      'STANDARD_REMINDER',       // Alarm normal

    // BEHAVIOUR MODES
    MANDATORY_CHECKIN:      'MANDATORY_CHECKIN',       // Konfirmasi dosis wajib dari notifikasi
    PREVENTIVE_ALERT:       'PREVENTIVE_ALERT',        // Notifikasi jika dosis >1 jam terlewat
    TRAVEL_MODE_PROMPT:     'TRAVEL_MODE_PROMPT',      // Prompt siapkan obat cadangan saat bepergian

    // PERCEPTION MODES
    FORCE_EDUCATION_GATE:   'FORCE_EDUCATION_GATE',    // Wajib baca artikel konfirmasi sebelum lanjut
    SIDE_EFFECT_COACHING:   'SIDE_EFFECT_COACHING',    // Push artikel efek samping & pentingnya konsistensi
    NEUTRAL_EDUCATION:      'NEUTRAL_EDUCATION',       // Rekomendasi artikel ringan non-paksa
    GAMIFICATION_STREAK:    'GAMIFICATION_STREAK',     // Streak visual harian aktif di dasbor
    POSITIVE_REINFORCEMENT: 'POSITIVE_REINFORCEMENT',  // Perayaan pencapaian kepatuhan
};

// ─── Label Pemetaan Kelas ─────────────────────────────────────────────────────

const ADHERENCE_LABELS = {
    0: 'Low (Tidak Patuh)',
    1: 'High (Patuh)',
};

const BEHAVIOUR_LABELS = {
    0: 'Negatif (Rutinitas Buruk / Sering Lupa)',
    1: 'Positif (Rutinitas Baik / Teratur)',
};

const PERCEPTION_LABELS = {
    0: 'Negatif (Pesimis / Ragu / Merasa Terbebani)',
    1: 'Netral (Belum Sadar Penuh Manfaat Obat)',
    2: 'Positif (Optimis / Memahami Pentingnya Obat)',
};

// ─── Engine Utama ─────────────────────────────────────────────────────────────

/**
 * Menentukan intervensi berbasis kombinasi kelas prediksi multi-task.
 *
 * @param {number} adherence  — 0 (Low) | 1 (High)
 * @param {number} behaviour  — 0 (Buruk) | 1 (Baik)
 * @param {number} perception — 0 (Negatif) | 1 (Netral) | 2 (Positif)
 * @returns {{ priority, message, activeModes, actions, chatbotContext, badge, labels }}
 */
const buildIntervention = (adherence, behaviour, perception) => {
    const isLowAdherence = adherence === 0;
    const isBadBehaviour = behaviour === 0;

    const activeModes = [];
    const actions = [];
    let priority;

    // ══════════════════════════════════════════════════════════════
    // BLOK A: ADHERENCE — Fondasi utama tingkat keparahan intervensi
    // ══════════════════════════════════════════════════════════════
    if (isLowAdherence) {
        priority = 'critical';
        activeModes.push(MODES.INTENSIVE_REMINDER);
        actions.push('Pengingat minum obat ganda (WhatsApp + in-app) diaktifkan secara otomatis.');
        actions.push('Caregiver Anda telah menerima notifikasi peringatan kepatuhan.');
    } else {
        priority = 'low';
        activeModes.push(MODES.STANDARD_REMINDER);
        actions.push('Mode pengingat standar berjalan normal.');
    }

    // ══════════════════════════════════════════════════════════════
    // BLOK B: BEHAVIOUR — Modifikasi mekanisme check-in & alarm
    // ══════════════════════════════════════════════════════════════
    if (isBadBehaviour) {
        activeModes.push(MODES.MANDATORY_CHECKIN);
        activeModes.push(MODES.TRAVEL_MODE_PROMPT);

        if (isLowAdherence) {
            actions.push('Check-in Dosis Wajib: Setiap notifikasi jadwal obat mengharuskan konfirmasi langsung — tidak bisa dilewati.');
            actions.push('Prompt Persiapan Bepergian: Aplikasi akan mengingatkan Anda membawa obat saat terdeteksi keluar dari rutinitas.');
        } else {
            priority = 'moderate';
            activeModes.push(MODES.PREVENTIVE_ALERT);
            actions.push('Mode Peringatan Pencegahan: Notifikasi ekstra dikirim jika dosis terdeteksi terlambat lebih dari 1 jam dari jadwal.');
        }
    }

    // ══════════════════════════════════════════════════════════════
    // BLOK C: PERCEPTION — Intervensi berbasis persepsi (3 kelas)
    // ══════════════════════════════════════════════════════════════
    if (perception === 0) {
        // Persepsi Negatif: Paksa edukasi — pasien tidak akan baca teks sukarela
        activeModes.push(MODES.FORCE_EDUCATION_GATE);
        activeModes.push(MODES.SIDE_EFFECT_COACHING);

        if (isLowAdherence) {
            actions.push('Gerbang Edukasi Wajib: Satu artikel edukasi tentang bahaya putus obat harus dibaca & dikonfirmasi untuk melanjutkan ke dasbor.');
            actions.push('Coaching Efek Samping: Konten spesifik tentang cara mengatasi efek samping umum dikirimkan ke notifikasi mingguan.');
        } else {
            priority = priority === 'low' ? 'moderate' : priority;
            actions.push('Edukasi Lunak Berkala: Artikel singkat tentang efek samping dan manfaat obat diterbitkan di banner dasbor.');
            actions.push('Pengingat Konsultasi: Chatbot Asep akan proaktif menanyakan apakah ada kekhawatiran terkait efek pengobatan saat sesi dimulai.');
        }

    } else if (perception === 1) {
        // Persepsi Netral: Edukasi ringan — dorong kesadaran tanpa paksaan
        activeModes.push(MODES.NEUTRAL_EDUCATION);

        if (isLowAdherence) {
            actions.push('Banner Edukasi Manfaat Obat: Konten singkat manfaat pengobatan ditampilkan di halaman utama pasien.');
        } else {
            actions.push('Rekomendasi Artikel Mingguan: Konten kesehatan relevan dikirimkan sebagai notifikasi ringan mingguan.');
        }

    } else if (perception === 2) {
        // Persepsi Positif: Manfaatkan motivasi — gamifikasi & penguatan positif
        activeModes.push(MODES.GAMIFICATION_STREAK);
        activeModes.push(MODES.POSITIVE_REINFORCEMENT);

        if (isLowAdherence) {
            actions.push('Streak Motivasi Aktif: Setiap dosis yang berhasil diminum tercatat sebagai streak visual di dasbor — wujudkan semangat Anda menjadi angka nyata.');
        } else {
            actions.push('Pencapaian Kepatuhan: Setiap 7 hari patuh berturut-turut sistem memberikan lencana motivasi di dasbor Anda.');
        }
    }

    // ══════════════════════════════════════════════════════════════
    // BLOK D: Pesan naratif utama (dirakit dari kondisi)
    // ══════════════════════════════════════════════════════════════
    const message = buildNarrativeMessage(adherence, behaviour, perception);

    return {
        priority,
        message,
        activeModes,
        actions,
        badge: isLowAdherence ? 'Intervensi Aktif' : 'Kepatuhan Optimal',
        labels: {
            adherence:  ADHERENCE_LABELS[adherence]  ?? '-',
            behaviour:  BEHAVIOUR_LABELS[behaviour]  ?? '-',
            perception: PERCEPTION_LABELS[perception] ?? '-',
        },
    };
};

// ─── Pesan Naratif (12 kombinasi kelas) ──────────────────────────────────────

const buildNarrativeMessage = (adherence, behaviour, perception) => {
    const a = adherence === 0;  // Low adherence
    const b = behaviour === 0;  // Bad behaviour

    if      (a  && b  && perception === 0) return 'Hasil analisis menunjukkan kombinasi yang memerlukan perhatian serius: kepatuhan rendah, rutinitas tidak konsisten, dan keraguan terhadap pengobatan. Program intervensi terstruktur telah diaktifkan untuk mendampingi Anda.';
    else if (a  && b  && perception === 1) return 'Kepatuhan dan rutinitas Anda perlu diperkuat, namun kesadaran dasar yang Anda miliki adalah fondasi yang baik. Mode intervensi aktif dan edukasi penyadaran telah diaktifkan.';
    else if (a  && b  && perception === 2) return 'Semangat sembuh Anda luar biasa! Namun kepatuhan dan rutinitas perlu ditingkatkan. Jadikan tekad Anda sebagai bahan bakar untuk membangun kedisiplinan baru — sistem streak motivasi siap menemani Anda.';
    else if (a  && !b && perception === 0) return 'Rutinitas Anda sebenarnya cukup teratur, namun ada keraguan mendalam yang membuat Anda tidak selalu minum obat. Memahami pentingnya pengobatan adalah kunci utama pemulihan Anda saat ini.';
    else if (a  && !b && perception === 1) return 'Rutinitas Anda baik, namun konsistensi minum obat masih perlu diperkuat. Pengingat ganda dan edukasi manfaat obat telah diaktifkan untuk mendampingi Anda.';
    else if (a  && !b && perception === 2) return 'Anda punya kesadaran tinggi dan rutinitas baik — tinggal satu langkah: konsistensi minum obat tepat waktu. Streak motivasi harian diaktifkan untuk mengabadikan setiap progres Anda!';
    else if (!a && b  && perception === 0) return 'Anda saat ini patuh minum obat, namun ada dua sinyal peringatan dini: rutinitas yang berubah-ubah dan keraguan terhadap pengobatan. Tanpa intervensi dini, risiko kepatuhan menurun sangat nyata.';
    else if (!a && b  && perception === 1) return 'Kepatuhan Anda saat ini baik, namun rutinitas yang tidak stabil perlu diwaspadai. Mode peringatan pencegahan diaktifkan agar Anda tidak tergelincir di kemudian hari.';
    else if (!a && b  && perception === 2) return 'Kepatuhan dan semangat Anda sangat baik! Fokus satu hal: bangun rutinitas yang lebih konsisten agar kepatuhan tetap terjaga bahkan saat jadwal padat.';
    else if (!a && !b && perception === 0) return 'Kepatuhan dan rutinitas Anda sangat baik! Kami hanya melihat sinyal keraguan terhadap efektivitas obat. Jangan biarkan keraguan ini mengganggu progres luar biasa yang sudah Anda bangun.';
    else if (!a && !b && perception === 1) return 'Kepatuhan dan rutinitas Anda sudah sangat baik. Tingkatkan pemahaman tentang manfaat obat agar motivasi ini terjaga dalam jangka panjang.';
    else                                   return 'Sempurna! Kepatuhan tinggi, rutinitas stabil, dan persepsi sangat positif — Anda berada di jalur pemulihan yang paling optimal. Pertahankan!';
};

module.exports = { buildIntervention, MODES };
