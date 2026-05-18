import { useState, useCallback, useEffect } from 'react';
import { LuX, LuPlus, LuTrash2, LuSparkles, LuSearch, LuInfo, LuCheck, LuRefreshCw, LuTriangleAlert } from 'react-icons/lu';
import { searchChromaDrugs } from '../services/medicationService';
 
const FREQUENCY_OPTIONS = [
  '1x sehari',
  '2x sehari',
  '3x sehari',
  '4x sehari',
  'Setiap 8 jam',
  'Sesuai kebutuhan'
];

/**
 * ScheduleField — one schedule row inside the Add/Edit form.
 */
const ScheduleField = ({ 
  index, 
  schedule, 
  onChange, 
  onRemove, 
  showRemove,
  onTimeChange,
  onAddTime,
  onRemoveTime
}) => (
  <div className="med-schedule-field">
    <div className="med-schedule-field-header">
      <span className="med-schedule-label">Jadwal {index + 1}</span>
      {showRemove && (
        <button
          type="button"
          className="med-schedule-remove-btn"
          onClick={onRemove}
          aria-label={`Hapus jadwal ${index + 1}`}
        >
          <LuTrash2 size={14} />
        </button>
      )}
    </div>
    
    <div className="med-form-field">
      <label className="med-form-label">Frekuensi</label>
      <div className="med-frequency-options">
        {FREQUENCY_OPTIONS.map((opt) => (
          <button
            key={opt}
            type="button"
            className={`med-freq-btn ${schedule.frequency === opt ? 'active' : ''}`}
            onClick={() => onChange(index, 'frequency', opt)}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>

    <div className="med-form-field">
      <label className="med-form-label">Waktu Minum</label>
      <div className="med-time-slots-grid">
        {schedule.time_slots.map((time, slotIdx) => (
          <div key={slotIdx} className="med-time-input-wrapper">
            <input
              type="time"
              className="med-time-input"
              value={time}
              onChange={(e) => onTimeChange(index, slotIdx, e.target.value)}
              aria-label={`Waktu ${slotIdx + 1}`}
            />
            {schedule.time_slots.length > 1 && (
              <button
                type="button"
                className="med-time-remove-btn"
                onClick={() => onRemoveTime(index, slotIdx)}
                aria-label="Hapus waktu"
              >
                <LuTrash2 size={14} />
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          className="med-time-add-btn"
          onClick={() => onAddTime(index)}
          aria-label="Tambah waktu"
        >
          <LuPlus size={18} />
        </button>
      </div>
    </div>

    <div className="med-form-row">
      <div className="med-form-field">
        <label className="med-form-label" htmlFor={`start-${index}`}>Tanggal Mulai</label>
        <input
          id={`start-${index}`}
          type="date"
          className="med-form-input"
          value={schedule.start_date}
          onChange={(e) => onChange(index, 'start_date', e.target.value)}
        />
      </div>
      <div className="med-form-field">
        <label className="med-form-label" htmlFor={`end-${index}`}>Tanggal Selesai</label>
        <input
          id={`end-${index}`}
          type="date"
          className="med-form-input"
          value={schedule.end_date}
          onChange={(e) => onChange(index, 'end_date', e.target.value)}
        />
      </div>
    </div>
  </div>
);
 
const EMPTY_SCHEDULE = { frequency: '', time_slots: [''], start_date: '', end_date: '' };
const EMPTY_FORM     = { name: '', dosage: '', instructions: '', schedules: [{ ...EMPTY_SCHEDULE }] };
 
const parseDosisAndFrekuensi = (dosisText) => {
  if (!dosisText) return { cleanDosage: '', detectedFrequency: '' };

  const textLower = dosisText.toLowerCase();
  let detectedFrequency = '';

  if (
    textLower.includes('3-4 kali sehari') ||
    textLower.includes('3 - 4 kali sehari') ||
    textLower.includes('3 atau 4 kali sehari') ||
    textLower.includes('3-4x sehari') ||
    textLower.includes('3 - 4x sehari') ||
    textLower.includes('3x sehari') ||
    textLower.includes('3 kali sehari') ||
    textLower.includes('sehari 3 kali') ||
    textLower.includes('sehari 3x') ||
    textLower.includes('3 x sehari')
  ) {
    detectedFrequency = '3x sehari';
  } else if (
    textLower.includes('2x sehari') ||
    textLower.includes('2 kali sehari') ||
    textLower.includes('sehari 2 kali') ||
    textLower.includes('sehari 2x') ||
    textLower.includes('2 x sehari')
  ) {
    detectedFrequency = '2x sehari';
  } else if (
    textLower.includes('1x sehari') ||
    textLower.includes('1 kali sehari') ||
    textLower.includes('sehari sekali') ||
    textLower.includes('sehari 1 kali') ||
    textLower.includes('sehari 1x') ||
    textLower.includes('1 x sehari') ||
    textLower.includes('sehari semalam')
  ) {
    detectedFrequency = '1x sehari';
  } else if (
    textLower.includes('4x sehari') ||
    textLower.includes('4 kali sehari') ||
    textLower.includes('sehari 4 kali') ||
    textLower.includes('sehari 4x') ||
    textLower.includes('4 x sehari')
  ) {
    detectedFrequency = '4x sehari';
  } else if (
    textLower.includes('8 jam') ||
    textLower.includes('setiap 8 jam') ||
    textLower.includes('tiap 8 jam')
  ) {
    detectedFrequency = 'Setiap 8 jam';
  } else if (
    textLower.includes('sesuai kebutuhan') ||
    textLower.includes('jika perlu') ||
    textLower.includes('bila perlu') ||
    textLower.includes('prn')
  ) {
    detectedFrequency = 'Sesuai kebutuhan';
  }

  const stripPatterns = [
    /,?\s*3-4\s*kali\s*sehari/gi,
    /,?\s*3\s*-\s*4\s*kali\s*sehari/gi,
    /,?\s*3\s*atau\s*4\s*kali\s*sehari/gi,
    /,?\s*3-4x\s*sehari/gi,
    /,?\s*3\s*-\s*4x\s*sehari/gi,
    /,?\s*1x\s*sehari/gi,
    /,?\s*2x\s*sehari/gi,
    /,?\s*3x\s*sehari/gi,
    /,?\s*4x\s*sehari/gi,
    /,?\s*1\s*kali\s*sehari/gi,
    /,?\s*2\s*kali\s*sehari/gi,
    /,?\s*3\s*kali\s*sehari/gi,
    /,?\s*4\s*kali\s*sehari/gi,
    /,?\s*sehari\s*sekali/gi,
    /,?\s*sehari\s*1\s*kali/gi,
    /,?\s*sehari\s*2\s*kali/gi,
    /,?\s*sehari\s*3\s*kali/gi,
    /,?\s*sehari\s*4\s*kali/gi,
    /,?\s*sehari\s*1x/gi,
    /,?\s*sehari\s*2x/gi,
    /,?\s*sehari\s*3x/gi,
    /,?\s*sehari\s*4x/gi,
    /,?\s*1\s*x\s*sehari/gi,
    /,?\s*2\s*x\s*sehari/gi,
    /,?\s*3\s*x\s*sehari/gi,
    /,?\s*4\s*x\s*sehari/gi,
    /,?\s*setiap\s*8\s*jam/gi,
    /,?\s*tiap\s*8\s*jam/gi,
    /,?\s*8\s*jam/gi,
    /,?\s*sesuai\s*kebutuhan/gi,
    /,?\s*jika\s*perlu/gi,
    /,?\s*bila\s*perlu/gi,
    /,?\s*prn/gi
  ];

  let cleanDosage = dosisText;
  for (const pattern of stripPatterns) {
    cleanDosage = cleanDosage.replace(pattern, '');
  }

  cleanDosage = cleanDosage
    .replace(/^[,;.\-\s|]+/g, '')
    .replace(/[,;.\-\s|]+$/g, '')
    .trim();

  if (!cleanDosage) {
    cleanDosage = dosisText;
  }

  return { cleanDosage, detectedFrequency };
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
 * AddMedicationModal — bottom-sheet / dialog for creating a new medication.
 * @param {boolean}  isOpen
 * @param {Function} onClose
 * @param {Function} onSubmit  - async (formData) => void
 * @param {string}   [patientId]
 */
const AddMedicationModal = ({ isOpen, onClose, onSubmit, patientId }) => {
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // ChromaDB Search states
  const [suggestions, setSuggestions] = useState({ obat: [], kondisi: [] });
  const [searchingChroma, setSearchingChroma] = useState(false);
  const [selectedChromaDrug, setSelectedChromaDrug] = useState(null);
  const [hoveredChromaDrug, setHoveredChromaDrug] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [debouncedName, setDebouncedName] = useState('');
  const [dosageOptions, setDosageOptions] = useState([]);

  // Debounce form.name input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedName(form.name);
    }, 400);

    return () => {
      clearTimeout(handler);
    };
  }, [form.name]);

  // Fetch suggestions when debouncedName changes
  useEffect(() => {
    if (!debouncedName || debouncedName.trim().length < 2) {
      setSuggestions({ obat: [], kondisi: [] });
      setShowSuggestions(false);
      return;
    }

    // If the name exactly matches the selected drug name, don't query
    if (selectedChromaDrug && selectedChromaDrug.nama_obat.toLowerCase() === debouncedName.trim().toLowerCase()) {
      return;
    }

    const fetchSuggestions = async () => {
      try {
        setSearchingChroma(true);
        const res = await searchChromaDrugs(debouncedName.trim(), patientId);
        if (res.data?.data) {
          setSuggestions(res.data.data);
          setShowSuggestions(true);
        } else {
          setSuggestions({ obat: [], kondisi: [] });
        }
      } catch (err) {
        console.error('[CHROMA] Suggestion query failed:', err);
      } finally {
        setSearchingChroma(false);
      }
    };

    fetchSuggestions();
  }, [debouncedName, selectedChromaDrug, patientId]);

  const handleSelectDrug = (drug) => {
    setForm((prev) => ({ ...prev, name: drug.nama_obat }));
    setSelectedChromaDrug(drug);
    setHoveredChromaDrug(null);
    setShowSuggestions(false);
    setDosageOptions([]);
  };

  // Get active drug to display (prioritizes hover, then selected, then auto-match)
  const getActiveDisplayDrug = () => {
    if (hoveredChromaDrug) return hoveredChromaDrug;
    if (selectedChromaDrug) return selectedChromaDrug;
    
    // Auto-detect if user typed a drug that matches one of the suggested items
    if (form.name && form.name.trim().length >= 2 && suggestions.obat?.length > 0) {
      const typed = form.name.toLowerCase().trim();
      const match = suggestions.obat.find(
        (o) => o.nama_obat.toLowerCase() === typed || o.nama_obat.toLowerCase().startsWith(typed)
      );
      if (match) return match;
    }
    return null;
  };

  const activeDrug = getActiveDisplayDrug();

  const handleAutoFill = () => {
    if (!activeDrug) return;
    
    const { cleanDosage, detectedFrequency } = parseDosisAndFrekuensi(activeDrug.dosis);
    
    let defaultDosage = cleanDosage;
    let options = [];
    
    if (cleanDosage && cleanDosage.includes('|')) {
      options = cleanDosage.split('|').map(o => o.trim()).filter(Boolean);
      if (options.length > 0) {
        defaultDosage = options[0];
      }
    }
    
    setDosageOptions(options);
    
    setForm((prev) => {
      const updatedSchedules = [...prev.schedules];
      if (updatedSchedules.length > 0 && detectedFrequency) {
        updatedSchedules[0] = {
          ...updatedSchedules[0],
          frequency: detectedFrequency
        };
      }
      return {
        ...prev,
        dosage: defaultDosage || prev.dosage,
        instructions: activeDrug.aturan_pakai || prev.instructions,
        schedules: updatedSchedules
      };
    });
  };

  const handleResetSelection = () => {
    setSelectedChromaDrug(null);
    setHoveredChromaDrug(null);
    setDosageOptions([]);
    setForm((prev) => ({
      ...prev,
      name: '',
      dosage: '',
      instructions: ''
    }));
  };

  const handleBlur = () => {
    // Small delay to allow clicking suggestions
    setTimeout(() => {
      setShowSuggestions(false);
    }, 200);
  };
 
  const handleField = (field, value) =>
    setForm((prev) => ({ ...prev, [field]: value }));
 
  const handleSchedule = useCallback((index, field, value) => {
    setForm((prev) => {
      const schedules = [...prev.schedules];
      schedules[index] = { ...schedules[index], [field]: value };
      return { ...prev, schedules };
    });
  }, []);

  const handleTimeSlot = useCallback((schedIdx, slotIdx, value) => {
    setForm((prev) => {
      const schedules = [...prev.schedules];
      const time_slots = [...schedules[schedIdx].time_slots];
      time_slots[slotIdx] = value;
      schedules[schedIdx] = { ...schedules[schedIdx], time_slots };
      return { ...prev, schedules };
    });
  }, []);

  const addTimeSlot = useCallback((schedIdx) => {
    setForm((prev) => {
      const schedules = [...prev.schedules];
      const time_slots = [...schedules[schedIdx].time_slots, ''];
      schedules[schedIdx] = { ...schedules[schedIdx], time_slots };
      return { ...prev, schedules };
    });
  }, []);

  const removeTimeSlot = useCallback((schedIdx, slotIdx) => {
    setForm((prev) => {
      const schedules = [...prev.schedules];
      const time_slots = schedules[schedIdx].time_slots.filter((_, i) => i !== slotIdx);
      schedules[schedIdx] = { ...schedules[schedIdx], time_slots };
      return { ...prev, schedules };
    });
  }, []);
 
  const addSchedule = () =>
    setForm((prev) => ({ ...prev, schedules: [...prev.schedules, { ...EMPTY_SCHEDULE }] }));
 
  const removeSchedule = (index) =>
    setForm((prev) => ({ ...prev, schedules: prev.schedules.filter((_, i) => i !== index) }));
 
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Nama obat wajib diisi.'); return; }
    
    // Check if any schedule has empty time slots
    const hasEmptyTime = form.schedules.some(s => s.time_slots.some(t => !t));
    if (hasEmptyTime) {
      setError('Harap isi semua waktu minum atau hapus kolom waktu yang kosong.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await onSubmit({
        name: form.name.trim(),
        dosage: form.dosage.trim(),
        instructions: form.instructions.trim(),
        medicinal_insight: selectedChromaDrug || null,
        schedules: form.schedules.map((s) => ({
          ...s,
          // Clean up time slots (already an array now)
          time_slots: s.time_slots.map((t) => t.trim()).filter(Boolean),
        })),
      });
      setForm(EMPTY_FORM);
      setSelectedChromaDrug(null);
      setHoveredChromaDrug(null);
      setSuggestions({ obat: [], kondisi: [] });
      setDosageOptions([]);
      setShowSuggestions(false);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal menyimpan obat.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    setSelectedChromaDrug(null);
    setHoveredChromaDrug(null);
    setSuggestions({ obat: [], kondisi: [] });
    setDosageOptions([]);
    setShowSuggestions(false);
    onClose();
  };
 
  if (!isOpen) return null;
 
  return (
    <div className="med-modal-overlay" role="presentation" onClick={handleCloseModal}>
      <div
        className="med-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="med-modal-handle" aria-hidden="true" />
 
        <div className="med-modal-header">
          <h2 id="add-modal-title" className="med-modal-title">Tambah Obat</h2>
          <button className="med-modal-close-btn" type="button" onClick={handleCloseModal} aria-label="Tutup">
            <LuX size={20} />
          </button>
        </div>
 
        <div className="med-modal-body">
          {/* LEFT COLUMN: Input Form */}
          <div className="med-modal-left-pane">
            <form onSubmit={handleSubmit} className="med-form" noValidate>
              <div className="med-form-field" style={{ position: 'relative' }}>
                <label className="med-form-label" htmlFor="add-name">Nama Obat *</label>
                <div className="med-input-search-wrapper">
                  <input
                    id="add-name"
                    className="med-form-input med-input-with-search"
                    placeholder="Ketik nama obat atau gejala (cth. Paracetamol / demam)..."
                    value={form.name}
                    onChange={(e) => handleField('name', e.target.value)}
                    onFocus={() => { if (form.name.trim().length >= 2) setShowSuggestions(true); }}
                    onBlur={handleBlur}
                    required
                    autoComplete="off"
                  />
                  <div className="med-input-search-icon">
                    {searchingChroma ? (
                      <div className="med-search-spinner" />
                    ) : (
                      <LuSearch size={18} />
                    )}
                  </div>
                </div>

                {showSuggestions && (suggestions.obat?.length > 0 || suggestions.kondisi?.length > 0) && (
                  <div className="med-suggestions-panel">
                    {suggestions.obat?.length > 0 && (
                      <div className="med-suggestions-section">
                        <span className="med-suggestions-section-title">
                          <LuSparkles size={12} className="med-sparkles-icon" /> Rekomendasi Obat (AI)
                        </span>
                        <div className="med-suggestions-list">
                          {suggestions.obat.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              className="med-suggestion-item"
                              onMouseDown={() => handleSelectDrug(item)}
                              onMouseEnter={() => setHoveredChromaDrug(item)}
                              onMouseLeave={() => setHoveredChromaDrug(null)}
                            >
                              <span className="med-suggestion-name">
                                {item.nama_obat}
                                {item.allergy_warning && (
                                  <span className="med-allergy-dot" title={item.allergy_warning}>
                                    <LuTriangleAlert size={14} style={{ color: '#ef4444' }} />
                                  </span>
                                )}
                              </span>
                              <span className="med-suggestion-meta">{item.kategori}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {suggestions.kondisi?.length > 0 && (
                      <div className="med-suggestions-section">
                        <span className="med-suggestions-section-title">
                          <LuInfo size={12} className="med-info-icon" /> Kondisi & Gejala Terkait
                        </span>
                        <div className="med-suggestions-list">
                          {suggestions.kondisi.map((item) => (
                            <div key={item.id} className="med-suggestion-condition-item">
                              <p className="med-condition-text">{item.content}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="med-form-field">
                <label className="med-form-label" htmlFor="add-dosage">Dosis</label>
                <input
                  id="add-dosage"
                  className="med-form-input"
                  placeholder="cth. 500mg"
                  value={form.dosage}
                  onChange={(e) => handleField('dosage', e.target.value)}
                />
                
                {dosageOptions && dosageOptions.length > 1 && (
                  <div className="med-dosage-options-selector">
                    <span className="med-dosage-options-hint">Pilih dosis rekomendasi yang sesuai:</span>
                    <div className="med-dosage-chips-container">
                      {dosageOptions.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          className={`med-dosage-chip-btn ${form.dosage === opt ? 'active' : ''}`}
                          onClick={() => handleField('dosage', opt)}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="med-form-field">
                <label className="med-form-label" htmlFor="add-instructions">Instruksi</label>
                <textarea
                  id="add-instructions"
                  className="med-form-textarea"
                  placeholder="cth. Diminum setelah makan"
                  value={form.instructions}
                  onChange={(e) => handleField('instructions', e.target.value)}
                />
              </div>
    
              <div className="med-schedules-section">
                <span className="med-schedules-title">Jadwal Minum</span>
                {form.schedules.map((s, i) => (
                  <ScheduleField
                    key={i}
                    index={i}
                    schedule={s}
                    onChange={handleSchedule}
                    onRemove={() => removeSchedule(i)}
                    showRemove={form.schedules.length > 1}
                    onTimeChange={handleTimeSlot}
                    onAddTime={addTimeSlot}
                    onRemoveTime={removeTimeSlot}
                  />
                ))}
                <button type="button" className="med-add-schedule-btn" onClick={addSchedule}>
                  <LuPlus size={16} /> Tambah Jadwal
                </button>
              </div>
    
              {error && <p className="med-form-error" role="alert">{error}</p>}
    
              <button
                type="submit"
                className="med-form-submit-btn"
                disabled={submitting}
              >
                {submitting ? 'Menyimpan…' : 'Simpan Obat'}
              </button>
            </form>
          </div>

          {/* RIGHT COLUMN: Premium Insights Large Panel */}
          <div className="med-modal-right-pane">
            {activeDrug ? (
              <div className="med-large-info-card">
                <div className="med-info-card-header">
                  <div className="med-info-title-group">
                    <span className="med-info-sparkle"><LuSparkles size={20} /></span>
                    <h3 className="med-info-card-title">{activeDrug.nama_obat}</h3>
                  </div>
                  <span className="med-info-category-badge">{activeDrug.kategori || 'Medis'}</span>
                </div>
                
                <div className="med-large-info-scrollable">
                  <div className="med-info-card-body">
                    {activeDrug.allergy_warning && (
                      <div className="med-allergy-alert-box">
                        <div className="med-allergy-alert-icon">
                          <LuTriangleAlert size={20} style={{ color: '#ef4444' }} />
                        </div>
                        <div className="med-allergy-alert-text">{activeDrug.allergy_warning}</div>
                      </div>
                    )}
                    
                    {activeDrug.indikasi && (
                      <div className="med-info-cell">
                        <span className="med-info-cell-label">Indikasi</span>
                        <p className="med-info-cell-value">{activeDrug.indikasi}</p>
                      </div>
                    )}
                    
                    {activeDrug.komposisi && (
                      <div className="med-info-cell">
                        <span className="med-info-cell-label">Komposisi</span>
                        <p className="med-info-cell-value">{activeDrug.komposisi}</p>
                      </div>
                    )}
                    
                    {activeDrug.dosis && (
                      <div className="med-info-cell">
                        <span className="med-info-cell-label">Rekomendasi Dosis</span>
                        {activeDrug.dosis.includes('|') ? (
                          <div className="med-info-split-list">
                            {activeDrug.dosis.split('|').map((item, idx) => (
                              <div key={idx} className="med-info-split-item">
                                <span className="med-info-split-bullet">•</span>
                                <p className="med-info-cell-value" style={{ margin: 0 }}>{item.trim()}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="med-info-cell-value">{activeDrug.dosis}</p>
                        )}
                      </div>
                    )}
                    
                    {activeDrug.aturan_pakai && (
                      <div className="med-info-cell">
                        <span className="med-info-cell-label">Aturan Pakai</span>
                        {activeDrug.aturan_pakai.includes('|') ? (
                          <div className="med-info-split-list">
                            {activeDrug.aturan_pakai.split('|').map((item, idx) => (
                              <div key={idx} className="med-info-split-item">
                                <span className="med-info-split-bullet">•</span>
                                <p className="med-info-cell-value" style={{ margin: 0 }}>{item.trim()}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="med-info-cell-value">{activeDrug.aturan_pakai}</p>
                        )}
                      </div>
                    )}

                    {activeDrug.efek_samping && (() => {
                      const parsedES = parseEfekSampingDetails(activeDrug.efek_samping);
                      return (
                        <>
                          {parsedES.efekSamping && (
                            <div className="med-info-cell danger">
                              <span className="med-info-cell-label text-red">Efek Samping</span>
                              <p className="med-info-cell-value">{parsedES.efekSamping}</p>
                            </div>
                          )}
                          
                          {parsedES.kontraindikasi && (
                            <div className="med-info-cell danger warning-border">
                              <span className="med-info-cell-label text-orange">Kontraindikasi</span>
                              <p className="med-info-cell-value">{parsedES.kontraindikasi}</p>
                            </div>
                          )}
                          
                          {parsedES.interaksi && (
                            <div className="med-info-cell info-border">
                              <span className="med-info-cell-label text-blue">Interaksi Obat</span>
                              <p className="med-info-cell-value">{parsedES.interaksi}</p>
                            </div>
                          )}

                          {parsedES.jangkaWaktu && (
                            <div className="med-info-cell duration-border">
                              <span className="med-info-cell-label text-teal">Jangka Waktu Penggunaan</span>
                              <p className="med-info-cell-value">{parsedES.jangkaWaktu}</p>
                            </div>
                          )}
                          
                          {parsedES.harga && (
                            <div className="med-info-cell price-border">
                              <span className="med-info-cell-label text-emerald">Estimasi Harga</span>
                              <p className="med-info-cell-value price-text">{formatRupiahPremium(parsedES.harga)}</p>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>

                <div className="med-info-card-actions">
                  <button 
                    type="button" 
                    className="med-info-autofill-btn"
                    onMouseDown={handleAutoFill}
                  >
                    <LuCheck size={16} /> Gunakan Detail Ini (Auto-fill)
                  </button>
                  <button 
                    type="button" 
                    className="med-info-reset-btn"
                    onMouseDown={handleResetSelection}
                  >
                    <LuRefreshCw size={14} /> Reset Pilihan
                  </button>
                </div>
              </div>
            ) : (
              <div className="med-large-info-placeholder">
                <div className="med-placeholder-icon-wrapper">
                  <LuSparkles className="med-placeholder-sparkle-icon" size={36} />
                </div>
                <h4 className="med-placeholder-title">AI Medication Insights</h4>
                <p className="med-placeholder-desc">
                  Ketik nama obat/gejala dan arahkan kursor ke rekomendasi untuk melihat indikasi, komposisi, dosis, aturan pakai, dan efek samping secara real-time.
                </p>
                <div className="med-placeholder-visual-bars">
                  <div className="med-placeholder-bar short" />
                  <div className="med-placeholder-bar long" />
                  <div className="med-placeholder-bar medium" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
 
export default AddMedicationModal;
