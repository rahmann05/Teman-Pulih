import { useEffect, useState } from 'react';
import { LuTriangleAlert, LuActivity, LuInfo, LuCalendar, LuStethoscope } from 'react-icons/lu';
import { createComplaint, getComplaints } from '@/features/family-sync/services/familyService';
import api from '@/shared/services/api';

const FamilyComplaintsSection = ({ caregiverMode, members }) => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [patientEmr, setPatientEmr] = useState(null);
  
  // Patient Form States
  const [symptoms, setSymptoms] = useState('');
  const [severity, setSeverity] = useState('mild');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const severityLabels = { mild: 'Ringan', moderate: 'Sedang', severe: 'Parah/Darurat' };

  useEffect(() => {
    loadComplaints();
    // Fetch EMR context for patient (to show banner)
    if (!caregiverMode) {
      api.get('/profile').then(res => {
        const p = res.data?.profile || {};
        if (p.chronic_conditions || p.allergies) {
          setPatientEmr({ chronic: p.chronic_conditions, allergy: p.allergies });
        }
      }).catch(() => {});
    }
  }, [caregiverMode, members]);

  const loadComplaints = async () => {
    try {
      setLoading(true);
      if (caregiverMode) {
        // Fetch complaints for all accepted patients
        const activePatients = members.filter(m => m.avatarVariant === 'patient');
        if (activePatients.length > 0) {
          const allComplaints = [];
          for (const patient of activePatients) {
            try {
              const { data } = await getComplaints(patient.userId);
              if (data) allComplaints.push(...data);
            } catch (err) {
              console.error(`Failed to fetch complaints for patient ${patient.name}:`, err);
            }
          }
          // Sort by newest
          allComplaints.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          setComplaints(allComplaints);
        }
      } else {
        // Patient fetches their own complaints
        const { data } = await getComplaints();
        setComplaints(data || []);
      }
    } catch (err) {
      console.error('Failed to load complaints:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSymptomSelect = (symptom) => {
    setSymptoms(symptom);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!symptoms.trim()) {
      setFormError('Pilih atau masukkan gejala yang Anda rasakan.');
      return;
    }
    setFormError('');
    setFormSuccess('');
    setSubmitting(true);

    try {
      await createComplaint({
        symptoms: symptoms.trim(),
        severity,
        notes: notes.trim()
      });
      setFormSuccess('Keluhan medis darurat berhasil dikirim! Caregiver Anda telah diberitahu.');
      setSymptoms('');
      setSeverity('mild');
      setNotes('');
      // Reload complaints
      loadComplaints();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Gagal mengirim keluhan medis.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderSeverityBadge = (level) => {
    const styles = {
      mild: { bg: 'var(--sage-light)', color: 'var(--sage-dark)', border: '1px solid rgba(91, 123, 106, 0.15)' },
      moderate: { bg: 'var(--copper-light)', color: '#8C6239', border: '1px solid rgba(176, 137, 104, 0.15)' },
      severe: { bg: 'var(--accent-light)', color: 'var(--accent-dark)', border: '1px solid rgba(196, 101, 58, 0.15)' }
    };
    const style = styles[level] || styles.mild;

    return (
      <span style={{
        fontSize: '11px',
        fontWeight: '700',
        padding: '4px 10px',
        borderRadius: '12px',
        ...style,
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
      }}>
        {severityLabels[level]}
      </span>
    );
  };

  return (
    <section className="family-invite-card family-no-gradient" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className="family-invite-title">
        <div className="family-invite-icon-wrapper" style={{ background: 'rgba(196, 101, 58, 0.08)' }}>
          <LuTriangleAlert size={22} style={{ color: 'var(--accent)' }} />
        </div>
        <span className="family-invite-title-text">
          {caregiverMode ? 'Aduan & Gejala Medis Pasien' : 'Aduan & Gejala Medis Darurat'}
        </span>
        {complaints.length > 0 && (
          <span className="family-section-count" style={{ 
            background: 'rgba(196, 101, 58, 0.1)', 
            color: 'var(--accent)',
            marginLeft: 'auto',
            fontSize: '12px',
            fontWeight: '700',
            padding: '4px 10px',
            borderRadius: '100px'
          }}>
            {complaints.length}
          </span>
        )}
      </div>

      <p className="family-invite-desc" style={{ margin: 0 }}>
        {caregiverMode 
          ? 'Segera respon aduan medis darurat yang dikirimkan oleh pasien Anda di bawah ini.' 
          : 'Kirim aduan kondisi darurat mendadak agar caregiver langsung menerima notifikasi.'}
      </p>

      {/* Scrollable interior wrapper to maintain exact layout constraints */}
      <div style={{ flex: 1, maxHeight: '480px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', paddingRight: '4px' }}>
        {!caregiverMode && (
          <form onSubmit={handleSubmit} style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            padding: '20px',
            background: '#FAF8F5',
            border: '1px solid var(--border-light)',
            borderRadius: '24px',
            flexShrink: 0
          }}>
            {/* EMR Context Banner */}
            {patientEmr && (
              <div style={{
                background: 'rgba(196,101,58,0.05)',
                border: '1px solid rgba(196,101,58,0.12)',
                borderRadius: '14px',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <LuStethoscope size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                  <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Catatan Medis Anda
                  </span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', paddingLeft: '22px' }}>
                  {patientEmr.chronic && (
                    <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <LuStethoscope size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                      {patientEmr.chronic}
                    </span>
                  )}
                  {patientEmr.allergy && (
                    <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <LuTriangleAlert size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                      Alergi: {patientEmr.allergy}
                    </span>
                  )}
                </div>
              </div>
            )}
            <div>
              <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text)', display: 'block', marginBottom: '8px' }}>
                Pilih Gejala Mendadak yang Dirasakan:
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {['Sesak Napas', 'Nyeri Dada', 'Pusing Hebat', 'Mual & Muntah', 'Jantung Berdebar', 'Demam Tinggi', 'Lainnya'].map((s) => {
                  const isSelected = symptoms === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handleSymptomSelect(s)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '100px',
                        fontSize: '12px',
                        background: isSelected ? 'var(--sage)' : '#FAF8F5',
                        color: isSelected ? '#FFF' : 'var(--text-secondary)',
                        border: isSelected ? '1.5px solid var(--sage-dark)' : '1.5px solid var(--border)',
                        cursor: 'pointer',
                        fontWeight: '700',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => { if(!isSelected) e.currentTarget.style.background = 'rgba(0,0,0,0.03)'; }}
                      onMouseLeave={(e) => { if(!isSelected) e.currentTarget.style.background = '#FAF8F5'; }}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>

              {symptoms === 'Lainnya' && (
                <input
                  type="text"
                  placeholder="Tuliskan gejala lainnya di sini..."
                  value={symptoms === 'Lainnya' ? '' : symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  style={{
                    width: '100%',
                    marginTop: '10px',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    background: '#FFF',
                    border: '1.5px solid var(--border)',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
              )}
            </div>

            <div>
              <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text)', display: 'block', marginBottom: '8px' }}>
                Tingkat Keparahan Kondisi:
              </span>
              <div style={{ display: 'flex', gap: '10px' }}>
                {['mild', 'moderate', 'severe'].map((level) => {
                  const isSelected = severity === level;
                  const colors = {
                    mild: { bg: isSelected ? 'var(--sage)' : 'rgba(91, 123, 106, 0.05)', color: isSelected ? '#FFF' : 'var(--sage)' },
                    moderate: { bg: isSelected ? 'var(--copper)' : 'rgba(176, 137, 104, 0.05)', color: isSelected ? '#FFF' : 'var(--copper)' },
                    severe: { bg: isSelected ? 'var(--accent)' : 'rgba(196, 101, 58, 0.05)', color: isSelected ? '#FFF' : 'var(--accent)' }
                  };
                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setSeverity(level)}
                      style={{
                        flex: 1,
                        padding: '10px 6px',
                        borderRadius: '100px',
                        background: colors[level].bg,
                        color: colors[level].color,
                        border: isSelected ? 'none' : '1px solid var(--border)',
                        cursor: 'pointer',
                        fontWeight: '750',
                        fontSize: '13px',
                        textAlign: 'center',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => { if(!isSelected) e.currentTarget.style.background = 'rgba(0,0,0,0.02)'; }}
                      onMouseLeave={(e) => { if(!isSelected) e.currentTarget.style.background = colors[level].bg; }}
                    >
                      {severityLabels[level]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <textarea
                placeholder="Catatan tambahan keluhan (misal: sudah berlangsung berapa lama)..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '16px',
                  background: '#FFF',
                  border: '1.5px solid var(--border)',
                  fontSize: '13px',
                  outline: 'none',
                  resize: 'none',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            {formError && <div style={{ fontSize: '13px', color: 'var(--error)', background: 'var(--error-light)', padding: '8px 12px', borderRadius: '12px', fontWeight: '600' }}>{formError}</div>}
            {formSuccess && <div style={{ fontSize: '13px', color: 'var(--success)', background: 'var(--success-light)', padding: '8px 12px', borderRadius: '12px', fontWeight: '600' }}>{formSuccess}</div>}

            <button
              type="submit"
              disabled={submitting}
              className="checkin-submit-btn"
              style={{
                background: 'var(--accent)',
                boxShadow: '0 4px 16px rgba(196, 101, 58, 0.25)',
                opacity: submitting ? 0.7 : 1
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-hover)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--accent)'; }}
            >
              {submitting ? 'Mengirim Aduan...' : 'Kirim Laporan Darurat ke Caregiver'}
            </button>
          </form>
        )}

        {loading ? (
          <div className="skeleton-loading" style={{ height: '120px', flexShrink: 0 }}>
            <div className="skeleton-line" style={{ height: '20px', width: '60%', margin: '12px 0' }} />
            <div className="skeleton-line" style={{ height: '16px', width: '80%' }} />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {complaints.length === 0 ? (
              <div style={{
                fontSize: '13px',
                color: '#7A7A7A',
                textAlign: 'center',
                padding: '24px 0',
                border: '1px dashed rgba(0,0,0,0.06)',
                borderRadius: '20px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px'
              }}>
                <LuInfo size={24} style={{ color: 'var(--accent)', opacity: 0.6 }} />
                <span>Tidak ada aduan medis aktif.</span>
              </div>
            ) : (
              complaints.map((c) => {
                const formattedDate = new Date(c.created_at).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit'
                });
                const isSevere = c.severity === 'severe';

                return (
                  <div
                    key={c.id}
                    style={{
                      background: isSevere ? 'var(--accent-light)' : '#FFF',
                      border: isSevere ? '1px solid rgba(196, 101, 58, 0.15)' : '1px solid rgba(0,0,0,0.04)',
                      borderRadius: '20px',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.01)',
                      position: 'relative'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {caregiverMode && c.patient && (
                          <span style={{ fontSize: '13px', fontWeight: '750', color: '#2D2D2D' }}>
                            Pasien: {c.patient.name}
                          </span>
                        )}
                        <span style={{ fontSize: '14px', fontWeight: '800', color: isSevere ? 'var(--accent-dark)' : '#2D2D2D', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <LuActivity size={15} style={{ color: isSevere ? 'var(--accent)' : 'var(--copper)' }} />
                          {c.symptoms}
                        </span>
                      </div>
                      {renderSeverityBadge(c.severity)}
                    </div>

                    {c.notes && (
                      <div style={{
                        fontSize: '13px',
                        color: 'var(--text-secondary)',
                        background: isSevere ? 'rgba(255, 255, 255, 0.7)' : '#FAF8F5',
                        padding: '8px 12px',
                        borderRadius: '12px',
                        borderLeft: isSevere ? '3px solid var(--accent)' : '3px solid #FAF8F5'
                      }}>
                        "{c.notes}"
                      </div>
                    )}

                    <div style={{
                      fontSize: '11px',
                      color: '#7A7A7A',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      alignSelf: 'flex-end',
                      marginTop: '2px'
                    }}>
                      <LuCalendar size={12} />
                      {formattedDate} WIB
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default FamilyComplaintsSection;
