require('dotenv').config();
const { Pool } = require('pg');
const { createClient } = require('@supabase/supabase-js');

const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      }
    : {
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT || 5432,
      }
);

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Anda bisa mendapatkan URL dan KEY ini dari dashboard Supabase -> Project Settings -> API
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL/ANON key belum dikonfigurasi di environment.');
}

// Gunakan service role di server bila tersedia untuk akses tabel dengan RLS.
const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey);

const createSupabaseClient = (accessToken) => {
  if (!accessToken) {
    return createClient(supabaseUrl, supabaseAnonKey);
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } }
  });
};

module.exports = {
  query: (text, params) => pool.query(text, params),
  supabase,
  createSupabaseClient
};