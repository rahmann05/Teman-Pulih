import React, { useState, useEffect } from 'react';
import { LuCircleCheck } from 'react-icons/lu';
import ChipSelector from './ChipSelector';
import { STEP_LABELS, ALLERGY_PRESETS, CHRONIC_PRESETS, PAST_ILLNESS_PRESETS } from '../constants/emrPresets';

const EMRForm = ({ formData, handleChange, handleSubmit, loading, uploader, error }) => {
  const [step, setStep] = useState(0);

  // Array states for chip selectors — derived from formData arrays or parsed from text
  const [allergiesList, setAllergiesList] = useState(() =>
    formData.allergies_list?.length ? formData.allergies_list
      : formData.allergies ? formData.allergies.split(',').map(s => s.trim()).filter(Boolean) : []
  );
  const [chronicList, setChronicList] = useState(() =>
    formData.chronic_conditions_list?.length ? formData.chronic_conditions_list
      : formData.chronic_conditions ? formData.chronic_conditions.split(',').map(s => s.trim()).filter(Boolean) : []
  );
  const [pastIllnessesList, setPastIllnessesList] = useState(() =>
    formData.past_illnesses_list?.length ? formData.past_illnesses_list
      : formData.past_illnesses ? formData.past_illnesses.split(',').map(s => s.trim()).filter(Boolean) : []
  );
  const [hadSurgery, setHadSurgery] = useState(!!formData.surgeries_history);

  // Sync list changes back to formData via handleChange-like synthetic events
  const syncList = (field, listField, list) => {
    handleChange({ target: { name: field, value: list.join(', ') } });
    handleChange({ target: { name: listField, value: list } });
  };

  useEffect(() => {
    const parseList = (str) => str ? str.split(',').map(s => s.trim()).filter(Boolean) : [];
    
    setAllergiesList(prev => {
      const parsed = parseList(formData.allergies);
      if (prev.join(',') !== parsed.join(',')) return parsed;
      return prev;
    });
    
    setChronicList(prev => {
      const parsed = parseList(formData.chronic_conditions);
      if (prev.join(',') !== parsed.join(',')) return parsed;
      return prev;
    });
    
    setPastIllnessesList(prev => {
      const parsed = parseList(formData.past_illnesses);
      if (prev.join(',') !== parsed.join(',')) return parsed;
      return prev;
    });
    
    if (formData.surgeries_history) setHadSurgery(true);
  }, [formData.allergies, formData.chronic_conditions, formData.past_illnesses, formData.surgeries_history]);

  const goNext = () => {
    if (step < 2) setStep(step + 1);
  };

  const goPrev = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleFinalSubmit = (e) => {
    // Sync lists before submit
    syncList('allergies', 'allergies_list', allergiesList);
    syncList('chronic_conditions', 'chronic_conditions_list', chronicList);
    syncList('past_illnesses', 'past_illnesses_list', pastIllnessesList);
    handleSubmit(e);
  };

  return (
    <form onSubmit={handleFinalSubmit} className="emr-wizard-form">
      <div className="emr-wizard-body">
        {uploader}
        {error && <div className="alert-error" style={{ marginBottom: '1.5rem' }}>{error}</div>}

        {/* Progress Steps */}
        <div className="emr-wizard-progress">
          {STEP_LABELS.map((label, i) => (
            <div key={i} className={`emr-wizard-step-indicator${i === step ? ' active' : ''}${i < step ? ' done' : ''}`}>
              <div className="emr-step-bubble">{i < step ? '✓' : i + 1}</div>
              <span className="emr-step-label">{label}</span>
            </div>
          ))}
          <div className="emr-progress-bar">
            <div className="emr-progress-fill" style={{ width: `${(step / 2) * 100}%` }} />
          </div>
        </div>

      {/* ── STEP 1: Data Fisik ── */}
      {step === 0 && (
        <div className="emr-step-content">
          <p className="emr-step-desc">Informasi fisik dasar membantu dokter dan Caregiver memahami kondisi umum Anda.</p>

          <div className="emr-form-group">
            <label className="emr-label">Golongan Darah</label>
            <div className="emr-chips-row">
              {['A', 'B', 'AB', 'O'].map((bt) => (
                <button
                  key={bt}
                  type="button"
                  className={`emr-chip large${formData.blood_type === bt ? ' active' : ''}`}
                  onClick={() => handleChange({ target: { name: 'blood_type', value: bt } })}
                >
                  {bt}
                </button>
              ))}
              <button
                type="button"
                className={`emr-chip large${!formData.blood_type ? ' active' : ''}`}
                onClick={() => handleChange({ target: { name: 'blood_type', value: '' } })}
              >
                Tidak Tahu
              </button>
            </div>
          </div>

          <div className="emr-form-row">
            <div className="emr-form-group">
              <label className="emr-label">Tinggi Badan (cm)</label>
              <div className="emr-input-unit">
                <input type="number" name="height" value={formData.height} onChange={handleChange} min="50" max="250" placeholder="Contoh: 165" className="emr-input" />
                <span className="emr-unit">cm</span>
              </div>
            </div>
            <div className="emr-form-group">
              <label className="emr-label">Berat Badan (kg)</label>
              <div className="emr-input-unit">
                <input type="number" name="weight" value={formData.weight} onChange={handleChange} min="10" max="300" placeholder="Contoh: 65" className="emr-input" />
                <span className="emr-unit">kg</span>
              </div>
            </div>
          </div>

          <div className="emr-form-group">
            <label className="emr-label">Tensi Darah Normal <span className="emr-optional">(jika tahu)</span></label>
            <div className="emr-chips-row">
              {[
                { value: 'Rendah (<90/60)', label: 'Rendah', sub: '< 90/60' },
                { value: 'Normal (120/80)', label: 'Normal', sub: '120/80' },
                { value: 'Tinggi (>140/90)', label: 'Tinggi', sub: '> 140/90' },
              ].map(({ value, label, sub }) => (
                <button
                  key={value}
                  type="button"
                  className={`emr-chip tensi${formData.blood_pressure_range === value ? ' active' : ''}`}
                  onClick={() => handleChange({ target: { name: 'blood_pressure_range', value } })}
                >
                  <span>{label}</span>
                  <small>{sub}</small>
                </button>
              ))}
            </div>
          </div>

          <div className="emr-form-group">
            <label className="emr-label">Kebiasaan</label>
            <div className="emr-checkbox-group">
              <label className="emr-checkbox-label">
                <input type="checkbox" name="smoking_habit" checked={formData.smoking_habit} onChange={handleChange} />
                <span>Merokok secara rutin</span>
              </label>
              <label className="emr-checkbox-label">
                <input type="checkbox" name="alcohol_habit" checked={formData.alcohol_habit} onChange={handleChange} />
                <span>Mengonsumsi alkohol secara rutin</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 2: Riwayat Medis ── */}
      {step === 1 && (
        <div className="emr-step-content">
          <p className="emr-step-desc">Pilih kondisi yang sesuai. Ini membantu chatbot dan Caregiver memberikan saran yang tepat.</p>

          <div className="emr-form-group">
            <label className="emr-label">Alergi <span className="emr-optional">(pilih semua yang berlaku)</span></label>
            <ChipSelector
              presets={ALLERGY_PRESETS}
              selected={allergiesList}
              onChange={(list) => { setAllergiesList(list); syncList('allergies', 'allergies_list', list); }}
              placeholder="Tambah alergi lainnya..."
            />
          </div>

          <div className="emr-form-group">
            <label className="emr-label">Penyakit Kronis / Bawaan</label>
            <ChipSelector
              presets={CHRONIC_PRESETS}
              selected={chronicList}
              onChange={(list) => { setChronicList(list); syncList('chronic_conditions', 'chronic_conditions_list', list); }}
              placeholder="Tambah penyakit lainnya..."
            />
          </div>

          <div className="emr-form-group">
            <label className="emr-label">Penyakit yang Pernah Diderita</label>
            <ChipSelector
              presets={PAST_ILLNESS_PRESETS}
              selected={pastIllnessesList}
              onChange={(list) => { setPastIllnessesList(list); syncList('past_illnesses', 'past_illnesses_list', list); }}
              placeholder="Tambah riwayat penyakit..."
            />
          </div>

          <div className="emr-form-group">
            <label className="emr-label">Pernah Menjalani Operasi?</label>
            <div className="emr-chips-row">
              <button type="button" className={`emr-chip${hadSurgery ? ' active' : ''}`} onClick={() => setHadSurgery(true)}>Ya, Pernah</button>
              <button type="button" className={`emr-chip${!hadSurgery ? ' active' : ''}`} onClick={() => { setHadSurgery(false); handleChange({ target: { name: 'surgeries_history', value: '' } }); }}>Belum Pernah</button>
            </div>
            {hadSurgery && (
              <input
                type="text"
                name="surgeries_history"
                value={formData.surgeries_history}
                onChange={handleChange}
                placeholder="Contoh: Operasi usus buntu (2020)"
                className="emr-input"
                style={{ marginTop: '12px' }}
              />
            )}
          </div>
        </div>
      )}

      {/* ── STEP 3: Kontak Darurat ── */}
      {step === 2 && (
        <div className="emr-step-content">
          <p className="emr-step-desc">Siapa yang harus dihubungi dalam keadaan darurat? Informasi ini bersifat opsional.</p>

          <div className="emr-form-group">
            <label className="emr-label">Nama Kontak Darurat <span className="emr-optional">(Opsional)</span></label>
            <input
              type="text"
              name="emergency_contact_name"
              value={formData.emergency_contact_name}
              onChange={handleChange}
              placeholder="Nama keluarga atau kerabat terdekat"
              className="emr-input"
            />
          </div>

          <div className="emr-form-group">
            <label className="emr-label">Nomor Telepon Darurat <span className="emr-optional">(Opsional)</span></label>
            <input
              type="tel"
              name="emergency_contact_phone"
              value={formData.emergency_contact_phone}
              onChange={handleChange}
              placeholder="Contoh: 08123456789"
              className="emr-input"
            />
          </div>

          <div className="emr-summary-box">
            <p className="emr-summary-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <LuCircleCheck size={16} /> Ringkasan Data Anda
            </p>
            <ul className="emr-summary-list">
              <li><strong>Gol. Darah:</strong> {formData.blood_type || 'Tidak diisi'}</li>
              <li><strong>Tinggi/Berat:</strong> {formData.height ? `${formData.height} cm` : '-'} / {formData.weight ? `${formData.weight} kg` : '-'}</li>
              <li><strong>Alergi:</strong> {allergiesList.join(', ') || 'Tidak ada'}</li>
              <li><strong>Penyakit Kronis:</strong> {chronicList.join(', ') || 'Tidak ada'}</li>
            </ul>
          </div>
        </div>
      )}
      </div>

      {/* Navigation Buttons */}
      <div className="emr-wizard-nav">
        {step > 0 && (
          <button type="button" className="emr-btn-secondary" onClick={goPrev}>
            ← Sebelumnya
          </button>
        )}
        {step < 2 ? (
          <button type="button" className="emr-btn-primary" onClick={goNext}>
            Selanjutnya →
          </button>
        ) : (
          <button type="submit" className="emr-btn-primary" disabled={loading}>
            {loading ? 'Menyimpan...' : 'Simpan Rekam Medis'}
          </button>
        )}
      </div>
    </form>
  );
};

export default EMRForm;
