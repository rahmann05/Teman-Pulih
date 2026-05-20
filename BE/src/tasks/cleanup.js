const cron = require('node-cron');
const { supabase: serviceSupabase } = require('../config/db');

/**
 * Cleanup Task: Clears the prescriptions bucket and ocr_history table.
 * Runs every 2 days at midnight.
 */
const initCleanupTasks = () => {
    // Run cleanup once immediately on startup to delete any leftover expired pending relations
    (async () => {
        console.log('[STARTUP] Running immediate cleanup of expired pending family relations...');
        try {
            const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
            const { error } = await serviceSupabase
                .from('family_relations')
                .delete()
                .eq('status', 'pending')
                .lt('created_at', tenMinutesAgo);
            if (error) throw error;
            console.log('[STARTUP] Successfully cleared expired pending family relations.');
        } catch (err) {
            console.error('[STARTUP] Failed to clear expired pending family relations:', err.message);
        }
    })();

    // Schedule: '0 0 * * *' -> Midnight every day
    cron.schedule('0 0 * * *', async () => {
        console.log('[CRON] Starting periodic cleanup...');
        
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

            // 3. CLEAR DATABASE: Delete notifications older than 1 day (created_at < 24 hours ago)
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
            const { error: notifError } = await serviceSupabase
                .from('notifications')
                .delete()
                .lt('created_at', oneDayAgo);

            if (notifError) throw notifError;
            console.log('[CRON] Cleared notifications older than 1 day in database.');
            
            // 4. CLEAR DATABASE: Delete expired family relations (status = 'pending' and created_at < 10 minutes ago)
            const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
            const { error: relationError } = await serviceSupabase
                .from('family_relations')
                .delete()
                .eq('status', 'pending')
                .lt('created_at', tenMinutesAgo);

            if (relationError) throw relationError;
            console.log('[CRON] Cleared expired pending family relations.');
            
            console.log('[CRON] Cleanup completed successfully.');
        } catch (err) {
            console.error('[CRON] Cleanup failed:', err.message);
        }
    });

    console.log('[CRON] Cleanup task scheduled for every day at midnight.');
};

module.exports = { initCleanupTasks };
