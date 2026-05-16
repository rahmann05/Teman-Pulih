const cron = require('node-cron');
const { supabase: serviceSupabase } = require('../config/db');

/**
 * Cleanup Task: Clears the prescriptions bucket and ocr_history table.
 * Runs every 2 days at midnight.
 */
const initCleanupTasks = () => {
    // Schedule: '0 0 */2 * *' -> Midnight every 2 days
    cron.schedule('0 0 */2 * *', async () => {
        console.log('[CRON] Starting periodic cleanup of OCR data...');
        
        try {
            // 1. CLEAR BUCKET: List all files and delete them
            const { data: files, error: listError } = await serviceSupabase
                .storage
                .from('prescriptions')
                .list();

            if (listError) throw listError;

            if (files && files.length > 0) {
                const filePaths = files.map(f => f.name);
                const { error: deleteError } = await serviceSupabase
                    .storage
                    .from('prescriptions')
                    .remove(filePaths);
                
                if (deleteError) throw deleteError;
                console.log(`[CRON] Deleted ${files.length} files from prescriptions bucket.`);
            }

            // 2. CLEAR DATABASE: Delete all records from ocr_history
            // Using serviceSupabase to bypass RLS
            const { error: dbError } = await serviceSupabase
                .from('ocr_history')
                .delete()
                .neq('id', 0); // Delete all rows where ID is not 0 (standard trick for "all")

            if (dbError) throw dbError;
            console.log('[CRON] Cleared ocr_history table in database.');
            
            console.log('[CRON] Cleanup completed successfully.');
        } catch (err) {
            console.error('[CRON] Cleanup failed:', err.message);
        }
    });

    console.log('[CRON] Cleanup task scheduled for every 2 days.');
};

module.exports = { initCleanupTasks };
