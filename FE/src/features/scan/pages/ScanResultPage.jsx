import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  LuArrowLeft,
  LuMessageCircle,
  LuPill,
  LuRefreshCw,
  LuPlus,
  LuCheck,
} from 'react-icons/lu';
import DashboardLayout from '@/shared/layouts/DashboardLayout';
import ScanResultCard from '@/features/scan/components/ScanResultCard';
import { getOcrResultById } from '@/features/scan/services/ocrService';
import '@/features/scan/scan.css';

/**
 * ScanResultPage — Displays the OCR scan result with structured prescription data
 * and action shortcuts to chatbot, medications (pre-filled), and rescanning.
 */
const ScanResultPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [scan, setScan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [addedDrugs, setAddedDrugs] = useState(new Set());

  useEffect(() => {
    let cancelled = false;
    const fetchResult = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getOcrResultById(id);
        if (!cancelled) setScan(data.scan || data);
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.error || 'Gagal memuat hasil scan.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchResult();
    return () => { cancelled = true; };
  }, [id]);

  const handleAskAI = () => {
    const context = scan?.extracted_text || '';
    navigate(`/chatbot?context=${encodeURIComponent(context)}`);
  };

  /**
   * Navigasi ke halaman obat dengan state pre-fill dari data OCR obat tertentu.
   * AddMedicationModal membaca location.state.prefill untuk mengisi form.
   */
  const handleAddDrug = (drug, idx) => {
    setAddedDrugs(prev => new Set([...prev, idx]));
    navigate('/medications', {
      state: {
        openAddModal: true,
        prefill: {
          name: drug.nama_obat || '',
          dosage: drug.dosis || '',
          instructions: drug.aturan_pakai || '',
          frequency: drug.frekuensi || '',
        },
      },
    });
  };

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <DashboardLayout>
        <div className="scan-container">
          <header className="scan-header">
            <button
              className="scan-back-btn"
              onClick={() => navigate('/scan')}
              aria-label="Kembali"
            >
              <LuArrowLeft size={20} />
            </button>
            <h1 className="scan-header-title">Hasil Scan</h1>
          </header>
          <div className="scan-skeleton">
            <div className="skeleton-block" style={{ height: 280, borderRadius: 'var(--radius-xl)' }} />
            <div className="skeleton-block" style={{ height: 180, borderRadius: 'var(--radius-2xl)' }} />
            <div className="skeleton-block" style={{ height: 56, borderRadius: 'var(--radius-md)' }} />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // ── Error state ─────────────────────────────────────────────────────────────
  if (error) {
    return (
      <DashboardLayout>
        <div className="scan-container">
          <header className="scan-header">
            <button
              className="scan-back-btn"
              onClick={() => navigate('/scan')}
              aria-label="Kembali"
            >
              <LuArrowLeft size={20} />
            </button>
            <h1 className="scan-header-title">Hasil Scan</h1>
          </header>
          <div className="scan-error" role="alert">{error}</div>
        </div>
      </DashboardLayout>
    );
  }

  const structuredData = scan?.structured_data || null;
  const obatList = structuredData?.obat || [];

  return (
    <DashboardLayout>
      <div className="scan-container" data-testid="scan-result-page">
        <div className="scan-dashboard-grid">
          {/* Header */}
          <header className="scan-header">
            <button
              className="scan-back-btn"
              onClick={() => navigate('/scan')}
              aria-label="Kembali ke scan"
            >
              <LuArrowLeft size={20} />
            </button>
            <h1 className="scan-header-title">Hasil Scan</h1>
          </header>

          {/* Result card: image + editable text */}
          <ScanResultCard
            extractedText={scan?.extracted_text}
            imageUrl={scan?.image_url}
            structuredData={structuredData}
            actions={
              <div className="scan-result-actions scan-bento-card">
                <button
                  className="scan-action-btn scan-action-btn--primary"
                  onClick={handleAskAI}
                >
                  <LuMessageCircle size={18} />
                  <span>Tanyakan ke AI</span>
                </button>
                <div className="scan-secondary-actions" style={{ display: 'flex', gap: 'var(--space-3)' }}>
                  <button
                    className="scan-action-btn scan-action-btn--outline"
                    onClick={() => navigate('/scan')}
                  >
                    <LuRefreshCw size={18} />
                    <span>Scan Ulang</span>
                  </button>
                </div>
              </div>
            }
          />

          {/* ── Daftar Obat dari Resep ── */}
          {obatList.length > 0 && (
            <div className="scan-drugs-section scan-bento-card">
              <div className="scan-drugs-header">
                <LuPill size={18} />
                <h2 className="scan-drugs-title">Obat dalam Resep</h2>
                <span className="scan-drugs-count">{obatList.length} obat</span>
              </div>

              <div className="scan-drugs-list">
                {obatList.map((drug, idx) => (
                  <div key={idx} className="scan-drug-item">
                    <div className="scan-drug-info">
                      <span className="scan-drug-name">{drug.nama_obat || '–'}</span>
                      <div className="scan-drug-meta">
                        {drug.dosis && <span className="scan-drug-tag">{drug.dosis}</span>}
                        {drug.frekuensi && <span className="scan-drug-tag scan-drug-tag--freq">{drug.frekuensi}</span>}
                        {drug.aturan_pakai && (
                          <span className="scan-drug-tag scan-drug-tag--note">{drug.aturan_pakai}</span>
                        )}
                        {drug.durasi && (
                          <span className="scan-drug-tag scan-drug-tag--duration">{drug.durasi}</span>
                        )}
                      </div>
                    </div>
                    <button
                      className={`scan-drug-add-btn ${addedDrugs.has(idx) ? 'added' : ''}`}
                      onClick={() => handleAddDrug(drug, idx)}
                      aria-label={`Tambah ${drug.nama_obat} ke jadwal obat`}
                      title={addedDrugs.has(idx) ? 'Sudah ditambahkan' : 'Tambah ke Jadwal Obat'}
                    >
                      {addedDrugs.has(idx) ? <LuCheck size={16} /> : <LuPlus size={16} />}
                      <span>{addedDrugs.has(idx) ? 'Ditambahkan' : 'Tambah Obat'}</span>
                    </button>
                  </div>
                ))}
              </div>

              {structuredData?.catatan_dokter && (
                <div className="scan-doctor-note">
                  <span className="scan-doctor-note-label">Catatan Dokter</span>
                  <p className="scan-doctor-note-text">{structuredData.catatan_dokter}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ScanResultPage;
