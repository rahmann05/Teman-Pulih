import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LuActivity, LuPlus, LuCircleCheck, LuTriangleAlert, LuChevronDown,
  LuChevronUp, LuSearch, LuX, LuPill, LuInfo,
} from 'react-icons/lu';
import {
  getIllnessHistory, addIllness, markIllnessRecovered, searchIllness,
} from '@/features/family-sync/services/familyService';
import { ILLNESS_PRESETS } from '@/features/profile/constants/emrPresets';

/** Minimized one-line summary untuk setiap penyakit aktif */
const IllnessBadge = ({ illness, onRecover, recovering }) => {
  const info = illness.illness_info;
  return (
    <div className="illness-badge-row">
      <div className="illness-badge-dot" />
      <span className="illness-badge-name">{illness.illness_name}</span>
      {info?.obat_terkait && (
        <span className="illness-badge-meta">• Obat: {info.obat_terkait.split(',')[0].trim()}</span>
      )}
      {info?.gejala_umum && !info.obat_terkait && (
        <span className="illness-badge-meta">• {info.gejala_umum.substring(0, 60)}…</span>
      )}
      <button
        onClick={() => onRecover(illness.id)}
        disabled={recovering === illness.id}
        className="illness-badge-recover"
        title="Tandai Sembuh"
      >
        <LuCircleCheck size={13} />
        <span>Sembuh</span>
      </button>
    </div>
  );
};

/** Detail panel untuk penyakit dengan illness_info */
const IllnessInfoDetail = ({ illness }) => {
  const info = illness.illness_info;
  if (!info) return null;
  const hasInfo = info.indikasi || info.gejala_umum || info.penanganan || info.obat_terkait || info.peringatan;
  if (!hasInfo) return null;

  return (
    <div className="illness-info-detail">
      {info.indikasi && (
        <div className="illness-info-row">
          <LuInfo size={12} className="illness-info-icon" />
          <span><strong>Tentang:</strong> {info.indikasi}</span>
        </div>
      )}
      {info.gejala_umum && (
        <div className="illness-info-row">
          <LuActivity size={12} className="illness-info-icon" />
          <span><strong>Gejala:</strong> {info.gejala_umum}</span>
        </div>
      )}
      {info.penanganan && (
        <div className="illness-info-row">
          <LuCircleCheck size={12} className="illness-info-icon" />
          <span><strong>Penanganan:</strong> {info.penanganan}</span>
        </div>
      )}
      {info.obat_terkait && (
        <div className="illness-info-row">
          <LuPill size={12} className="illness-info-icon" />
          <span><strong>Obat:</strong> {info.obat_terkait}</span>
        </div>
      )}
      {info.peringatan && (
        <div className="illness-info-row illness-info-warning">
          <LuTriangleAlert size={12} className="illness-info-icon" />
          <span><strong>Perhatian:</strong> {info.peringatan}</span>
        </div>
      )}
    </div>
  );
};

const CurrentIllnessCard = () => {
  const navigate = useNavigate();
  const [illnesses, setIllnesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedIllness, setSelectedIllness] = useState(null); // { name, illness_info }
  const [submitting, setSubmitting] = useState(false);
  const [recoveringId, setRecoveringId] = useState(null);
  const [error, setError] = useState('');
  const [showDetail, setShowDetail] = useState(null); // id of illness to show detail
  const debounceRef = useRef(null);

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await getIllnessHistory();
      setIllnesses((data || []).filter((i) => i.is_active));
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  // Debounced search saat user mengetik
  const handleInputChange = (val) => {
    setInputValue(val);
    setSelectedIllness(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const { data } = await searchIllness(val.trim());
        setSearchResults(data || []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 500);
  };

  const handleSelectPreset = (name) => {
    setInputValue(name);
    setSelectedIllness({ name, illness_info: null });
    setSearchResults([]);
    // Trigger Chroma search for info
    handleInputChange(name);
  };

  const handleSelectResult = (result) => {
    setInputValue(result.name);
    setSelectedIllness({ name: result.name, illness_info: result.illness_info });
    setSearchResults([]);
  };

  const handleSubmit = async () => {
    const name = selectedIllness?.name || inputValue.trim();
    if (!name) return;
    setSubmitting(true);
    setError('');
    try {
      const payload = { illness_name: name };
      if (selectedIllness?.illness_info) payload.illness_info = selectedIllness.illness_info;
      const { data } = await addIllness(payload);
      setIllnesses((prev) => [data, ...prev]);
      setInputValue('');
      setSelectedIllness(null);
      setSearchResults([]);
      setShowForm(false);
      setExpanded(false); // kembali ke minimized setelah berhasil
    } catch {
      setError('Gagal menambah penyakit. Coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkRecovered = async (id) => {
    setRecoveringId(id);
    try {
      await markIllnessRecovered(id);
      setIllnesses((prev) => prev.filter((i) => i.id !== id));
    } catch {
      setError('Gagal memperbarui status. Coba lagi.');
    } finally {
      setRecoveringId(null);
    }
  };

  const activeCount = illnesses.length;

  return (
    <div className="illness-row-card">
      {/* ── Minimized Bar (always visible) ── */}
      <div className="illness-bar">
        <div className="illness-bar-left">
          <div className={`illness-bar-icon ${activeCount > 0 ? 'active' : 'healthy'}`}>
            <LuActivity size={16} />
          </div>
          <div className="illness-bar-info">
            {loading ? (
              <span className="illness-bar-loading" />
            ) : activeCount === 0 ? (
              <>
                <span className="illness-bar-title healthy">Kondisi Sehat</span>
                <span className="illness-bar-sub">Tidak ada penyakit aktif</span>
              </>
            ) : (
              <>
                <span className="illness-bar-title">{illnesses[0].illness_name}</span>
                <span className="illness-bar-sub">
                  {activeCount > 1 ? `+${activeCount - 1} penyakit lain` : `Sejak ${new Date(illnesses[0].started_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}`}
                </span>
              </>
            )}
          </div>

          {/* Minimized quick-info chips dari illness_info */}
          {!loading && illnesses.length > 0 && illnesses[0].illness_info?.obat_terkait && (
            <div className="illness-bar-chip">
              <LuPill size={11} />
              {illnesses[0].illness_info.obat_terkait.split(',')[0].trim()}
            </div>
          )}
        </div>

        <div className="illness-bar-actions">
          <button
            className="illness-bar-btn-add"
            onClick={() => { setExpanded(true); setShowForm(true); }}
            title="Tambah Penyakit"
          >
            <LuPlus size={15} />
            <span>Tambah</span>
          </button>
          <button
            className="illness-bar-btn-toggle"
            onClick={() => { setExpanded((e) => !e); if (expanded) setShowForm(false); }}
            title={expanded ? 'Tutup' : 'Lihat Detail'}
          >
            {expanded ? <LuChevronUp size={16} /> : <LuChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* ── Expanded Panel ── */}
      {expanded && (
        <div className="illness-expanded">
          {error && (
            <div className="illness-error-bar">
              <LuTriangleAlert size={13} /> {error}
            </div>
          )}

          {/* List penyakit aktif */}
          {!loading && illnesses.length > 0 && (
            <div className="illness-list">
              {illnesses.map((ill) => (
                <div key={ill.id} className="illness-item">
                  <IllnessBadge
                    illness={ill}
                    onRecover={handleMarkRecovered}
                    recovering={recoveringId}
                  />
                  {/* Toggle detail info */}
                  {ill.illness_info && (
                    <>
                      <button
                        className="illness-detail-toggle"
                        onClick={() => setShowDetail(showDetail === ill.id ? null : ill.id)}
                      >
                        {showDetail === ill.id ? 'Sembunyikan info' : 'Lihat info penyakit →'}
                      </button>
                      {showDetail === ill.id && <IllnessInfoDetail illness={ill} />}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {!loading && illnesses.length === 0 && !showForm && (
            <div className="illness-empty-expanded">
              <LuCircleCheck size={20} />
              <span>Kondisi Anda baik. Tidak ada penyakit aktif.</span>
            </div>
          )}

          {/* Add Form */}
          {showForm ? (
            <div className="illness-form">
              <div className="illness-form-header">
                <span>Tambah Penyakit</span>
                <button onClick={() => { setShowForm(false); setInputValue(''); setSearchResults([]); setSelectedIllness(null); }}>
                  <LuX size={14} />
                </button>
              </div>

              <p className="illness-form-hint">Ketik gejala atau nama penyakit untuk mendapat rekomendasi:</p>

              {/* Preset chips */}
              <div className="illness-preset-chips">
                {ILLNESS_PRESETS.map((p) => (
                  <button
                    key={p}
                    onClick={() => handleSelectPreset(p)}
                    className={`illness-preset-chip ${(selectedIllness?.name === p || inputValue === p) ? 'selected' : ''}`}
                  >
                    {p}
                  </button>
                ))}
              </div>

              {/* Search Input */}
              <div className="illness-search-wrapper">
                <LuSearch size={15} className="illness-search-icon" />
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                  placeholder="Ketik gejala atau nama penyakit..."
                  className="illness-search-input"
                  autoFocus
                />
                {inputValue && (
                  <button className="illness-search-clear" onClick={() => { setInputValue(''); setSearchResults([]); setSelectedIllness(null); }}>
                    <LuX size={13} />
                  </button>
                )}
              </div>

              {/* Search Results Dropdown */}
              {(searchLoading || searchResults.length > 0) && (
                <div className="illness-dropdown">
                  {searchLoading ? (
                    <div className="illness-dropdown-loading">Mencari rekomendasi...</div>
                  ) : (
                    searchResults.map((r, idx) => (
                      <button
                        key={idx}
                        className="illness-dropdown-item"
                        onClick={() => handleSelectResult(r)}
                      >
                        <div className="illness-dropdown-name">{r.name}</div>
                        {r.illness_info?.indikasi && (
                          <div className="illness-dropdown-desc">{r.illness_info.indikasi.substring(0, 90)}…</div>
                        )}
                        {r.illness_info?.gejala_umum && !r.illness_info?.indikasi && (
                          <div className="illness-dropdown-desc">Gejala: {r.illness_info.gejala_umum.substring(0, 90)}…</div>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}

              {/* Selected illness info preview */}
              {selectedIllness?.illness_info && (
                <div className="illness-selected-preview">
                  <div className="illness-selected-title">
                    <LuActivity size={13} />
                    Info: {selectedIllness.name}
                  </div>
                  <IllnessInfoDetail illness={selectedIllness} />
                </div>
              )}

              <div className="illness-form-footer">
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !inputValue.trim()}
                  className="illness-form-submit"
                >
                  {submitting ? 'Menyimpan...' : 'Tambahkan'}
                </button>
              </div>
            </div>
          ) : (
            <button
              className="illness-add-trigger"
              onClick={() => setShowForm(true)}
            >
              <LuPlus size={14} />
              Tambah penyakit baru
            </button>
          )}

          <button
            onClick={() => navigate('/family-sync')}
            className="illness-emergency-link"
          >
            Kirim laporan darurat ke Caregiver →
          </button>
        </div>
      )}
    </div>
  );
};

export default CurrentIllnessCard;
