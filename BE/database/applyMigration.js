const fs = require('fs');
const path = require('path');
const db = require('../src/config/db');

async function runMigration() {
    try {
        console.log('[MIGRATION] Membaca file migration_v5_compliance.sql...');
        const sqlPath = path.join(__dirname, 'migration_v5_compliance.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('[MIGRATION] Menjalankan query migrasi ke Supabase/PostgreSQL...');
        await db.query(sql);

        console.log('[MIGRATION] Migrasi V5 Compliance Assessments BERHASIL diterapkan!');
        process.exit(0);
    } catch (error) {
        console.error('[MIGRATION] Gagal menerapkan migrasi:', error.message);
        process.exit(1);
    }
}

runMigration();
