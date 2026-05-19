import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  LuArrowLeft, 
  LuPencil, 
  LuTrash2, 
  LuSparkles,
  LuClipboardList,
  LuActivity,
  LuInfo,
  LuTriangleAlert,
  LuCalendar,
  LuClock,
  LuCoins,
  LuShield
} from 'react-icons/lu';
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

        {/* Top Sticky Header */}
        <header className="med-detail-top-nav">
          <button
            className="notifications-back-btn"
            onClick={() => navigate('/medications')}
            aria-label="Kembali ke daftar obat"
          >
            <LuArrowLeft size={20} />
          </button>
          <div className="med-detail-nav-title-group">
            <span className="med-detail-nav-tag">Detail Informasi Obat</span>
            <h1 className="med-detail-nav-title">{medication.name}</h1>
          </div>
        </header>

        {/* SECTION 1: HERO MEDICATION CARD */}
        <div className="med-hero-card">
          <div className="med-hero-left">
            <div className="med-hero-avatar-wrapper">
              <LuActivity size={28} />
            </div>
            <div className="med-hero-title-area">
              {medication.medicinal_insight?.kategori && (
                <span className="med-hero-category-tag">
                  {medication.medicinal_insight.kategori}
                </span>
              )}
              <h2 className="med-hero-name">{medication.name}</h2>
              <p className="med-hero-subtext">
                Dosis Utama: <strong>{medication.dosage || '—'}</strong> | {medication.instructions || '—'}
              </p>
            </div>
          </div>
          <div className="med-hero-actions">
            <button
              className="med-hero-edit-btn"
              type="button"
              onClick={() => setShowEdit(true)}
              aria-label="Edit obat"
            >
              <LuPencil size={16} /> Edit
            </button>
            <button
              className="med-hero-delete-btn"
              type="button"
              onClick={() => setShowConfirm(true)}
              aria-label="Hapus obat"
            >
              <LuTrash2 size={16} /> Hapus
            </button>
          </div>
        </div>

        {/* SECTION 2: SCHEDULE & TIMELINE PROGRESS */}
        <div className="med-schedule-timeline-grid">
          {/* Card A: Rincian Jadwal Konsumsi */}
          <div className="med-clinical-card">
            <div className="med-clinical-card-header">
              <span className="med-clinical-icon"><LuCalendar size={18} /></span>
              <h3 className="med-clinical-card-title">Jadwal Penggunaan Obat</h3>
            </div>
            <div className="med-clinical-list">
              <div className="med-clinical-row">
                <span className="med-clinical-label">Frekuensi Konsumsi</span>
                <span className="med-clinical-value bold">{schedule?.frequency || '—'}</span>
              </div>
              
              <div className="med-clinical-row">
                <span className="med-clinical-label">Waktu Minum</span>
                <div className="med-clinical-time-slots">
                  {schedule?.time_slots ? (
                    (Array.isArray(schedule.time_slots) ? schedule.time_slots : [schedule.time_slots]).map((slot, idx) => (
                      <span key={idx} className="med-clinical-time-badge">
                        <LuClock size={12} /> {slot}
                      </span>
                    ))
                  ) : (
                    <span className="med-clinical-value">—</span>
                  )}
                </div>
              </div>

              <div className="med-clinical-row">
                <span className="med-clinical-label">Instruksi Dokter</span>
                <span className="med-clinical-value">{medication.instructions || '—'}</span>
              </div>

              <div className="med-clinical-row">
                <span className="med-clinical-label">Periode Pengobatan</span>
                <span className="med-clinical-value duration">
                  {schedule ? `${formatDate(schedule.start_date)} – ${formatDate(schedule.end_date)}` : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Card B: Timeline Konsumsi Hari Ini */}
          <div className="med-clinical-card">
            <div className="med-clinical-card-header">
              <span className="med-clinical-icon"><LuActivity size={18} /></span>
              <h3 className="med-clinical-card-title">Progres & Kepatuhan Hari Ini</h3>
            </div>
            <div className="med-clinical-timeline-wrapper">
              <MedicationDoseTimeline
                medication={medication}
                logs={logs}
                onLog={logDose}
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: AI MEDICINAL INSIGHT (Consolidated Medical Leaflet) */}
        {medication.medicinal_insight && (
          <div className="med-clinical-leaflet-wrapper">
            <div className="med-leaflet-header">
              <div className="med-leaflet-header-title">
                <span className="med-leaflet-sparkle"><LuSparkles size={20} /></span>
                <div>
                  <h3 className="med-leaflet-title">AI Medicinal Insight Leaflet</h3>
                  <p className="med-leaflet-subtitle">Analisis klinis & informasi farmakologi obat terverifikasi</p>
                </div>
              </div>
              <div className="med-leaflet-badge-verified">
                <LuShield size={14} style={{ marginRight: 4 }} /> AI Verified
              </div>
            </div>

            <div className="med-leaflet-grid-layout">
              {/* Left Column: Ringkasan & Klasifikasi */}
              <div className="med-leaflet-col">
                <h4 className="med-leaflet-section-heading">
                  <LuClipboardList size={15} style={{ marginRight: 6 }} /> Ringkasan Medis
                </h4>
                
                <div className="med-leaflet-field-box">
                  <span className="med-leaflet-label">Indikasi Utama</span>
                  <p className="med-leaflet-value text-bold">
                    {medication.medicinal_insight.indikasi || '—'}
                  </p>
                </div>

                <div className="med-leaflet-field-box">
                  <span className="med-leaflet-label">Komposisi Aktif</span>
                  <p className="med-leaflet-value">
                    {medication.medicinal_insight.komposisi || '—'}
                  </p>
                </div>

                {medication.medicinal_insight.efek_samping && (() => {
                  const parsedES = parseEfekSampingDetails(medication.medicinal_insight.efek_samping);
                  if (!parsedES.harga) return null;
                  return (
                    <div className="med-leaflet-field-box price-highlight">
                      <span className="med-leaflet-label text-emerald">Estimasi Harga Pasar</span>
                      <p className="med-leaflet-value price-text">
                        <LuCoins size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                        {formatRupiahPremium(parsedES.harga)}
                      </p>
                    </div>
                  );
                })()}
              </div>

              {/* Middle Column: Petunjuk Penggunaan */}
              <div className="med-leaflet-col">
                <h4 className="med-leaflet-section-heading">
                  <LuInfo size={15} style={{ marginRight: 6 }} /> Petunjuk Penggunaan
                </h4>

                <div className="med-leaflet-field-box">
                  <span className="med-leaflet-label">Rekomendasi Dosis AI</span>
                  {(() => {
                    const rawDosis = medication.medicinal_insight.dosis_rekomendasi || medication.medicinal_insight.dosis;
                    if (!rawDosis) return <p className="med-leaflet-value">—</p>;
                    return rawDosis.includes('|') ? (
                      <ul className="med-leaflet-bullet-list">
                        {rawDosis.split('|').map((item, idx) => (
                          <li key={idx}>{item.trim()}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="med-leaflet-value">{rawDosis}</p>
                    );
                  })()}
                </div>

                <div className="med-leaflet-field-box">
                  <span className="med-leaflet-label">Aturan Pakai Klinis</span>
                  {medication.medicinal_insight.aturan_pakai ? (
                    medication.medicinal_insight.aturan_pakai.includes('|') ? (
                      <ul className="med-leaflet-bullet-list">
                        {medication.medicinal_insight.aturan_pakai.split('|').map((item, idx) => (
                          <li key={idx}>{item.trim()}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="med-leaflet-value">{medication.medicinal_insight.aturan_pakai}</p>
                    )
                  ) : (
                    <p className="med-leaflet-value">—</p>
                  )}
                </div>
              </div>

              {/* Right Column: Keamanan & Peringatan */}
              <div className="med-leaflet-col">
                <h4 className="med-leaflet-section-heading">
                  <LuTriangleAlert size={15} style={{ marginRight: 6 }} /> Keamanan & Peringatan
                </h4>

                {medication.medicinal_insight.efek_samping && (() => {
                  const parsedES = parseEfekSampingDetails(medication.medicinal_insight.efek_samping);
                  return (
                    <div className="med-leaflet-warnings-list">
                      {parsedES.efekSamping && (
                        <div className="med-leaflet-warning-card danger">
                          <span className="med-leaflet-warning-title text-red">
                            <LuTriangleAlert size={14} style={{ marginRight: 4 }} /> Efek Samping
                          </span>
                          <p className="med-leaflet-warning-desc">{parsedES.efekSamping}</p>
                        </div>
                      )}

                      {parsedES.kontraindikasi && (
                        <div className="med-leaflet-warning-card warning">
                          <span className="med-leaflet-warning-title text-orange">
                            <LuTriangleAlert size={14} style={{ marginRight: 4 }} /> Kontraindikasi
                          </span>
                          <p className="med-leaflet-warning-desc">{parsedES.kontraindikasi}</p>
                        </div>
                      )}

                      {parsedES.interaksi && (
                        <div className="med-leaflet-warning-card info">
                          <span className="med-leaflet-warning-title text-blue">
                            <LuInfo size={14} style={{ marginRight: 4 }} /> Interaksi Obat
                          </span>
                          <p className="med-leaflet-warning-desc">{parsedES.interaksi}</p>
                        </div>
                      )}

                      {parsedES.jangkaWaktu && (
                        <div className="med-leaflet-warning-card duration">
                          <span className="med-leaflet-warning-title text-teal">
                            <LuCalendar size={14} style={{ marginRight: 4 }} /> Batas Penggunaan
                          </span>
                          <p className="med-leaflet-warning-desc">{parsedES.jangkaWaktu}</p>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
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
