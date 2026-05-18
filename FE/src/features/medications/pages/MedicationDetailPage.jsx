import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LuArrowLeft, LuPencil, LuTrash2, LuSparkles } from 'react-icons/lu';
import DashboardLayout from '@/shared/layouts/DashboardLayout';
import MedicationDoseTimeline from '@/features/medications/components/MedicationDoseTimeline';
import MedicationEmptyState from '@/features/medications/components/MedicationEmptyState';
import EditMedicationModal from '@/features/medications/pages/EditMedicationModal';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import { useMedications } from '@/features/medications/hooks/useMedications';
import { useAuth } from '@/shared/hooks/useAuth';
import '@/features/medications/medications.css';

/**
 * Format a date string to a readable Indonesian date.
 */
const formatDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
};

const parseEfekSampingDetails = (rawText) => {
  if (!rawText) return { efekSamping: '', kontraindikasi: '', interaksi: '', jangkaWaktu: '', harga: '' };

  let efekSamping = '';
  let kontraindikasi = '';
  let interaksi = '';
  let jangkaWaktu = '';
  let harga = '';

  const text = rawText;
  const lower = text.toLowerCase();

  const idxKontra = lower.indexOf('kontraindikasi:');
  const idxInteraksi = lower.indexOf('interaksi:');
  const idxJangka = lower.indexOf('jangka waktu penggunaan:');
  const idxHarga = lower.indexOf('harga:');

  const markers = [];
  if (idxKontra !== -1) markers.push({ name: 'kontraindikasi', index: idxKontra, labelLength: 'kontraindikasi:'.length });
  if (idxInteraksi !== -1) markers.push({ name: 'interaksi', index: idxInteraksi, labelLength: 'interaksi:'.length });
  if (idxJangka !== -1) markers.push({ name: 'jangkaWaktu', index: idxJangka, labelLength: 'jangka waktu penggunaan:'.length });
  if (idxHarga !== -1) markers.push({ name: 'harga', index: idxHarga, labelLength: 'harga:'.length });

  markers.sort((a, b) => a.index - b.index);

  if (markers.length === 0) {
    efekSamping = text;
  } else {
    efekSamping = text.substring(0, markers[0].index);

    for (let i = 0; i < markers.length; i++) {
      const current = markers[i];
      const start = current.index + current.labelLength;
      const end = (i + 1 < markers.length) ? markers[i + 1].index : text.length;
      
      const content = text.substring(start, end).trim();

      if (current.name === 'kontraindikasi') kontraindikasi = content;
      else if (current.name === 'interaksi') interaksi = content;
      else if (current.name === 'jangkaWaktu') jangkaWaktu = content;
      else if (current.name === 'harga') harga = content;
    }
  }

  efekSamping = efekSamping
    .replace(/^[,;.\-\s|]+/g, '')
    .replace(/[,;.\-\s|]+$/g, '')
    .trim();
  
  kontraindikasi = kontraindikasi
    .replace(/^[,;.\-\s|]+/g, '')
    .replace(/[,;.\-\s|]+$/g, '')
    .trim();

  interaksi = interaksi
    .replace(/^[,;.\-\s|]+/g, '')
    .replace(/[,;.\-\s|]+$/g, '')
    .trim();

  jangkaWaktu = jangkaWaktu
    .replace(/^[,;.\-\s|]+/g, '')
    .replace(/[,;.\-\s|]+$/g, '')
    .trim();

  harga = harga
    .replace(/^[,;.\-\s|]+/g, '')
    .replace(/[,;.\-\s|]+$/g, '')
    .trim();

  return { efekSamping, kontraindikasi, interaksi, jangkaWaktu, harga };
};

const formatRupiahPremium = (rawText) => {
  if (!rawText) return '—';

  let text = rawText.trim();
  
  // Replace standard 'Rp.' or 'Rp ' with 'Rp'
  text = text.replace(/^rp\.?\s*/i, 'Rp');
  
  const formatSingleNumber = (numStr) => {
    let cleanNum = numStr.replace(/[,.]00$/, '');
    cleanNum = cleanNum.replace(/[.,]/g, '');
    
    const num = parseInt(cleanNum, 10);
    if (isNaN(num)) return numStr;
    
    return 'Rp' + num.toLocaleString('id-ID');
  };

  const rangeRegex = /(?:rp\.?\s*)?(\d+(?:[.,]\d+)?)(?:\s*-\s*)(?:rp\.?\s*)?(\d+(?:[.,]\d+)?)/i;
  const matchRange = text.match(rangeRegex);
  if (matchRange) {
    const minVal = formatSingleNumber(matchRange[1].replace(/[.,]/g, ''));
    const maxVal = formatSingleNumber(matchRange[2].replace(/[.,]/g, ''));
    
    let suffix = text.replace(matchRange[0], '').trim();
    if (suffix.startsWith('/') || suffix.toLowerCase().startsWith('per') || suffix.toLowerCase().startsWith('sachet')) {
      suffix = ' ' + suffix;
    }
    return `${minVal} - ${maxVal}${suffix}`;
  }

  const singleRegex = /(?:rp\.?\s*)?(\d+(?:[.,]\d+)?)/i;
  const matchSingle = text.match(singleRegex);
  if (matchSingle) {
    const formattedVal = formatSingleNumber(matchSingle[1].replace(/[.,]/g, ''));
    let suffix = text.replace(matchSingle[0], '').trim();
    suffix = suffix.replace(/^[,;.\-\s|/]+/g, '').trim();
    
    if (suffix) {
      if (text.includes('/')) {
        return `${formattedVal} / ${suffix}`;
      } else if (text.toLowerCase().includes('per')) {
        return `${formattedVal} per ${suffix.replace(/^per\s*/i, '')}`;
      }
      return `${formattedVal} (${suffix})`;
    }
    return formattedVal;
  }

  return text;
};

/**
 * MedicationDetailPage — /medications/:id
 */
const MedicationDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isCaregiver = user?.role === 'caregiver';

  const [showEdit, setShowEdit]       = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    medications,
    logs,
    loading,
    error,
    editMedication,
    removeMedication,
    logDose,
    fetchAll,
  } = useMedications();

  const medication = medications.find((m) => String(m.id) === String(id));
  const schedule   = medication?.medication_schedules?.[0];

  const handleDelete = async () => {
    await removeMedication(id);
    navigate('/medications', { replace: true });
  };

  const handleEdit = async (data) => {
    await editMedication(id, data);
  };

  // Loading skeleton
  if (loading) {
    return (
      <DashboardLayout caregiverMode={isCaregiver}>
        <div className="med-detail-container">
          <header className="med-list-header">
            <button className="scan-back-btn" onClick={() => navigate('/medications')} aria-label="Kembali">
              <LuArrowLeft size={20} />
            </button>
            <div className="skeleton-block" style={{ height: 28, width: 160, borderRadius: 8 }} />
          </header>
          <div className="med-skeleton" style={{ padding: '0 var(--space-5)' }}>
            <div className="skeleton-block" style={{ height: 160, borderRadius: 'var(--radius-xl)' }} />
            <div className="skeleton-block" style={{ height: 200, borderRadius: 'var(--radius-xl)' }} />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !medication) {
    return (
      <DashboardLayout caregiverMode={isCaregiver}>
        <div className="med-detail-container">
          <header className="med-list-header">
            <button className="scan-back-btn" onClick={() => navigate('/medications')} aria-label="Kembali">
              <LuArrowLeft size={20} />
            </button>
          </header>
          <MedicationEmptyState
            type="error"
            message={error || 'Obat tidak ditemukan.'}
            onRetry={fetchAll}
          />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout caregiverMode={isCaregiver}>
      <div className="med-detail-container" data-testid="medication-detail-page">

        {/* Header */}
        <header className="med-list-header">
          <button
            className="scan-back-btn"
            onClick={() => navigate('/medications')}
            aria-label="Kembali ke daftar obat"
          >
            <LuArrowLeft size={20} />
          </button>
          <h1 className="med-list-title">{medication.name}</h1>
        </header>

        {/* Detail Grid (Desktop Split Layout) */}
        <div className="med-detail-grid">
          {/* Info Grid (Left Side) */}
          <section className="med-detail-info" aria-label="Informasi obat">
            <div className="med-detail-field">
              <span className="med-detail-label">Dosis</span>
              <span className="med-detail-value">{medication.dosage || '—'}</span>
            </div>
            <div className="med-detail-field">
              <span className="med-detail-label">Instruksi</span>
              <span className="med-detail-value">{medication.instructions || '—'}</span>
            </div>
            {schedule && (
              <>
                <div className="med-detail-field">
                  <span className="med-detail-label">Frekuensi</span>
                  <span className="med-detail-value">{schedule.frequency || '—'}</span>
                </div>
                <div className="med-detail-field">
                  <span className="med-detail-label">Waktu</span>
                  <span className="med-detail-value">
                    {Array.isArray(schedule.time_slots)
                      ? schedule.time_slots.join(', ')
                      : schedule.time_slots || '—'}
                  </span>
                </div>
                <div className="med-detail-field">
                  <span className="med-detail-label">Periode</span>
                  <span className="med-detail-value">
                    {formatDate(schedule.start_date)} – {formatDate(schedule.end_date)}
                  </span>
                </div>
              </>
            )}
          </section>

          {/* Right Side */}
          <div className="med-detail-right">
            {/* Today's Dose Timeline */}
            <MedicationDoseTimeline
              medication={medication}
              logs={logs}
              onLog={logDose}
            />

            {/* Action Buttons */}
            <div className="med-detail-actions">
              <button
                className="med-edit-btn"
                type="button"
                onClick={() => setShowEdit(true)}
                aria-label="Edit obat"
              >
                <LuPencil size={16} /> Edit
              </button>
              <button
                className="med-delete-btn"
                type="button"
                onClick={() => setShowConfirm(true)}
                aria-label="Hapus obat"
              >
                <LuTrash2 size={16} /> Hapus
              </button>
            </div>
          </div>
        </div>

        {/* Medicinal Insight Bento Card */}
        {medication.medicinal_insight && (
          <section className="med-detail-insight-section" aria-label="Analisis & Informasi Medis">
            <h2 className="med-detail-section-title">
              <span className="med-info-sparkle"><LuSparkles size={18} /></span>
              AI Medicinal Insight
            </h2>
            <div className="med-detail-insight-bento">
              {medication.medicinal_insight.kategori && (
                <div className="med-bento-card">
                  <span className="med-bento-label">Kategori Obat</span>
                  <span className="med-bento-value highlighted">{medication.medicinal_insight.kategori}</span>
                </div>
              )}
              {medication.medicinal_insight.indikasi && (
                <div className="med-bento-card">
                  <span className="med-bento-label">Indikasi Utama</span>
                  <span className="med-bento-value">{medication.medicinal_insight.indikasi}</span>
                </div>
              )}
              {medication.medicinal_insight.komposisi && (
                <div className="med-bento-card composition">
                  <span className="med-bento-label">Komposisi Aktif</span>
                  <span className="med-bento-value">{medication.medicinal_insight.komposisi}</span>
                </div>
              )}
              {(medication.medicinal_insight.dosis_rekomendasi || medication.medicinal_insight.dosis) && (() => {
                const rawDosis = medication.medicinal_insight.dosis_rekomendasi || medication.medicinal_insight.dosis;
                return (
                  <div className="med-bento-card span-two">
                    <span className="med-bento-label">Rekomendasi Dosis</span>
                    {rawDosis.includes('|') ? (
                      <div className="med-info-split-list">
                        {rawDosis.split('|').map((item, idx) => (
                          <div key={idx} className="med-info-split-item">
                            <span className="med-info-split-bullet">•</span>
                            <span className="med-bento-value" style={{ margin: 0 }}>{item.trim()}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="med-bento-value">{rawDosis}</span>
                    )}
                  </div>
                );
              })()}
              
              {medication.medicinal_insight.aturan_pakai && (
                <div className="med-bento-card span-two">
                  <span className="med-bento-label">Aturan Pakai</span>
                  {medication.medicinal_insight.aturan_pakai.includes('|') ? (
                    <div className="med-info-split-list">
                      {medication.medicinal_insight.aturan_pakai.split('|').map((item, idx) => (
                        <div key={idx} className="med-info-split-item">
                          <span className="med-info-split-bullet">•</span>
                          <span className="med-bento-value" style={{ margin: 0 }}>{item.trim()}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="med-bento-value">{medication.medicinal_insight.aturan_pakai}</span>
                  )}
                </div>
              )}
              {medication.medicinal_insight.efek_samping && (() => {
                const parsedES = parseEfekSampingDetails(medication.medicinal_insight.efek_samping);
                return (
                  <>
                    {parsedES.efekSamping && (
                      <div className="med-bento-card danger effects span-two">
                        <span className="med-bento-label error">Efek Samping</span>
                        <span className="med-bento-value error">{parsedES.efekSamping}</span>
                      </div>
                    )}
                    
                    {parsedES.kontraindikasi && (
                      <div className="med-bento-card danger warning-card span-two">
                        <span className="med-bento-label text-orange">Kontraindikasi</span>
                        <span className="med-bento-value text-orange">{parsedES.kontraindikasi}</span>
                      </div>
                    )}
                    
                    {parsedES.interaksi && (
                      <div className="med-bento-card info-card span-two">
                        <span className="med-bento-label text-blue">Interaksi Obat</span>
                        <span className="med-bento-value text-blue">{parsedES.interaksi}</span>
                      </div>
                    )}

                    {parsedES.jangkaWaktu && (
                      <div className="med-bento-card duration-card span-two">
                        <span className="med-bento-label text-teal">Jangka Waktu Penggunaan</span>
                        <span className="med-bento-value text-teal">{parsedES.jangkaWaktu}</span>
                      </div>
                    )}
                    
                    {parsedES.harga && (
                      <div className="med-bento-card price-card">
                        <span className="med-bento-label text-emerald">Estimasi Harga</span>
                        <span className="med-bento-value price-val">{formatRupiahPremium(parsedES.harga)}</span>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </section>
        )}
      </div>

      {/* Edit Modal */}
      <EditMedicationModal
        isOpen={showEdit}
        medication={medication}
        onClose={() => setShowEdit(false)}
        onSubmit={handleEdit}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={showConfirm}
        title="Hapus Obat"
        message={`Apakah Anda yakin ingin menghapus "${medication.name}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Hapus"
        cancelText="Batal"
        danger
        onConfirm={handleDelete}
        onCancel={() => setShowConfirm(false)}
      />
    </DashboardLayout>
  );
};

export default MedicationDetailPage;
