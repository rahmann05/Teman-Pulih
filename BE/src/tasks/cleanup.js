const cron = require('node-cron');
const { supabase: serviceSupabase } = require('../config/db');

/**
 * Hapus folder tanggal di storage bucket 'prescriptions' yang sudah lebih dari 3 hari.
 * Struktur bucket: {userId}/{YYYY-MM-DD}/{file.jpg}
 *
 * Strategi:
 *   1. List semua "folder" tingkat pertama (userId)
 *   2. Untuk setiap userId, list subfolder tanggal
 *   3. Jika tanggal subfolder < (hari ini - 3 hari), hapus semua file di dalamnya
 */
const cleanExpiredPrescriptionFiles = async () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    console.log(`[CRON-OCR] Menghapus file prescriptions sebelum ${threeDaysAgo.toISOString().split('T')[0]}...`);

    // List semua "folder" user di root bucket (menggunakan prefix '' dan delimiter '/')
    const { data: userFolders, error: listRootError } = await serviceSupabase
        .storage
        .from('prescriptions')
        .list('', { limit: 500 });

    if (listRootError) {
        console.error('[CRON-OCR] Gagal list root bucket:', listRootError.message);
        return;
    }

    // Filter hanya folder (tidak ada size / metadata file)
    const userDirs = (userFolders || []).filter(f => !f.metadata?.size);

    for (const userDir of userDirs) {
        const userId = userDir.name;

        // List subfolder tanggal di dalam userId
        const { data: dateFolders, error: listDateError } = await serviceSupabase
            .storage
            .from('prescriptions')
            .list(userId, { limit: 500 });

        if (listDateError) {
            console.warn(`[CRON-OCR] Gagal list folder user ${userId}:`, listDateError.message);
            continue;
        }

        const expiredDateDirs = (dateFolders || []).filter(f => {
            // Nama folder harus format YYYY-MM-DD
            if (!/^\d{4}-\d{2}-\d{2}$/.test(f.name)) return false;
            const folderDate = new Date(f.name);
            return folderDate < threeDaysAgo;
        });

        for (const dateDir of expiredDateDirs) {
            const folderPrefix = `${userId}/${dateDir.name}`;

            // List semua file di dalam folder tanggal ini
            const { data: files, error: listFilesError } = await serviceSupabase
                .storage
                .from('prescriptions')
                .list(folderPrefix, { limit: 1000 });

            if (listFilesError) {
                console.warn(`[CRON-OCR] Gagal list file di ${folderPrefix}:`, listFilesError.message);
                continue;
            }

            if (!files || files.length === 0) continue;

            const filePaths = files.map(f => `${folderPrefix}/${f.name}`);
            const { error: deleteError } = await serviceSupabase
                .storage
                .from('prescriptions')
                .remove(filePaths);

            if (deleteError) {
                console.error(`[CRON-OCR] Gagal hapus file di ${folderPrefix}:`, deleteError.message);
            } else {
                console.log(`[CRON-OCR] Dihapus ${filePaths.length} file dari ${folderPrefix}`);
            }
        }
    }
};

/**
 * Hapus record ocr_history yang lebih dari 3 hari.
 */
const cleanExpiredOcrHistory = async () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await serviceSupabase
        .from('ocr_history')
        .delete()
        .lt('created_at', threeDaysAgo);

    if (error) {
        console.error('[CRON-OCR] Gagal hapus ocr_history kadaluarsa:', error.message);
    } else {
        console.log('[CRON-OCR] Berhasil hapus record ocr_history yang sudah > 3 hari.');
    }
};

/**
 * Cleanup Task — dijalankan sekali saat startup dan terjadwal tiap hari tengah malam.
 */
const initCleanupTasks = () => {
    // ── Startup: Bersihkan pending family relations yang sudah > 10 menit ──────
    (async () => {
        console.log('[STARTUP] Menjalankan cleanup pending family relations yang kadaluarsa...');
        try {
            const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
            const { error } = await serviceSupabase
                .from('family_relations')
                .delete()
                .eq('status', 'pending')
                .lt('created_at', tenMinutesAgo);
            if (error) throw error;
            console.log('[STARTUP] Berhasil hapus pending family relations kadaluarsa.');
        } catch (err) {
            console.error('[STARTUP] Gagal hapus pending family relations:', err.message);
        }
    })();

    // ── Jadwal harian: setiap hari tengah malam ──────────────────────────────
    cron.schedule('0 0 * * *', async () => {
        console.log('[CRON] Memulai cleanup terjadwal...');

        try {
            // 1. Hapus file prescriptions yang sudah > 3 hari
            await cleanExpiredPrescriptionFiles();

            // 2. Hapus record ocr_history yang sudah > 3 hari
            await cleanExpiredOcrHistory();

            // 3. Hapus notifikasi yang lebih dari 1 hari
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
            const { error: notifError } = await serviceSupabase
                .from('notifications')
                .delete()
                .lt('created_at', oneDayAgo);
            if (notifError) throw notifError;
            console.log('[CRON] Berhasil hapus notifikasi > 1 hari.');

            // 4. Hapus pending family relations > 10 menit
            const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
            const { error: relationError } = await serviceSupabase
                .from('family_relations')
                .delete()
                .eq('status', 'pending')
                .lt('created_at', tenMinutesAgo);
            if (relationError) throw relationError;
            console.log('[CRON] Berhasil hapus pending family relations kadaluarsa.');

            console.log('[CRON] Cleanup selesai.');
        } catch (err) {
            console.error('[CRON] Cleanup gagal:', err.message);
        }
    });

    console.log('[CRON] Cleanup task dijadwalkan setiap tengah malam.');
};

module.exports = { initCleanupTasks };
