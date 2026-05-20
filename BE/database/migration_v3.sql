-- ============================================================
-- TemanPulih — Migration V3
-- Tujuan:
--   1. Tambah kolom illness_info JSONB ke illness_history
--      untuk menyimpan informasi penyakit dari Chroma RAG
-- Jalankan di Supabase SQL Editor
-- ============================================================

-- Tambah kolom illness_info untuk menyimpan data dari Chroma RAG
ALTER TABLE public.illness_history
  ADD COLUMN IF NOT EXISTS illness_info JSONB DEFAULT NULL;

-- Contoh struktur illness_info:
-- {
--   "indikasi": "...",
--   "gejala_umum": "...",
--   "penanganan": "...",
--   "obat_terkait": "...",
--   "peringatan": "..."
-- }

COMMENT ON COLUMN public.illness_history.illness_info IS
  'Informasi kondisi penyakit dari Chroma RAG: indikasi, gejala_umum, penanganan, obat_terkait, peringatan';
