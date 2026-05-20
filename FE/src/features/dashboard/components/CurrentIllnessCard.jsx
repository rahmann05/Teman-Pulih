import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { LuActivity, LuPlus, LuCircleCheck, LuTriangleAlert } from 'react-icons/lu';
import { getIllnessHistory, addIllness, markIllnessRecovered } from '@/features/family-sync/services/familyService';
import { ILLNESS_PRESETS } from '@/features/profile/constants/emrPresets';

const CurrentIllnessCard = () => {
  const navigate = useNavigate();
  const [illnesses, setIllnesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newIllness, setNewIllness] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [recoveringId, setRecoveringId] = useState(null);
  const [error, setError] = useState('');

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await getIllnessHistory();
      // Only show active illnesses in this widget
      setIllnesses((data || []).filter((i) => i.is_active));
    } catch {
      // Silently fail — card just shows empty state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

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

  const handleAddIllness = async () => {
    const name = newIllness.trim();
    if (!name) return;
    setSubmitting(true);
    setError('');
    try {
      const { data } = await addIllness({ illness_name: name });
      setIllnesses((prev) => [data, ...prev]);
      setNewIllness('');
      setShowForm(false);
    } catch {
      setError('Gagal menambah penyakit. Coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  const activeCount = illnesses.length;

  return (
    <div
      className="family-bento-card"
      style={{
        background: '#FFFFFF',
        borderRadius: '32px',
        padding: '28px',
        border: '1px solid rgba(0,0,0,0.03)',
        boxShadow: '0 12px 30px rgba(0,0,0,0.03)',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '14px',
            background: activeCount > 0 ? 'rgba(196,101,58,0.08)' : 'rgba(91,123,106,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: activeCount > 0 ? 'var(--accent)' : 'var(--sage-dark)',
            flexShrink: 0,
          }}>
            <LuActivity size={22} />
          </div>
          <div>
            <h3 style={{
              fontFamily: 'var(--font-heading)', fontSize: '17px', fontWeight: '800',
              color: 'var(--text)', margin: 0, letterSpacing: '-0.02em',
            }}>
              Kondisi Penyakit Terkini
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
              {activeCount > 0 ? `${activeCount} penyakit aktif saat ini` : 'Tidak ada penyakit aktif'}
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowForm((s) => !s)}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '8px 14px', borderRadius: '100px',
            background: showForm ? 'rgba(0,0,0,0.04)' : 'rgba(var(--accent-rgb),0.08)',
            color: showForm ? 'var(--text-secondary)' : 'var(--accent)',
            border: 'none', cursor: 'pointer',
            fontSize: '13px', fontWeight: '700', fontFamily: 'inherit',
            transition: 'all 0.2s',
          }}
        >
          <LuPlus size={15} />
          {showForm ? 'Batal' : 'Penyakit Baru'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          fontSize: '13px', color: 'var(--error)', background: 'var(--error-light)',
          padding: '10px 14px', borderRadius: '14px', fontWeight: '600',
          display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          <LuTriangleAlert size={15} /> {error}
        </div>
      )}

      {/* Add Form */}
      {showForm && (
        <div style={{
          display: 'flex', flexDirection: 'column', gap: '12px',
          background: 'rgba(var(--accent-rgb),0.04)',
          border: '1px solid rgba(var(--accent-rgb),0.1)',
          borderRadius: '20px', padding: '16px',
        }}>
          <p style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)', margin: 0 }}>
            Pilih atau ketik penyakit yang sedang diderita:
          </p>

          {/* Preset chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {ILLNESS_PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => setNewIllness(p)}
                style={{
                  padding: '6px 14px', borderRadius: '100px', fontSize: '12px',
                  fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s',
                  background: newIllness === p ? 'var(--accent)' : '#FAF8F5',
                  color: newIllness === p ? '#fff' : 'var(--text-secondary)',
                  border: newIllness === p ? '1.5px solid var(--accent)' : '1.5px solid var(--border)',
                  fontFamily: 'inherit',
                }}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Custom input */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              value={newIllness}
              onChange={(e) => setNewIllness(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddIllness()}
              placeholder="Atau ketik nama penyakit lain..."
              style={{
                flex: 1, padding: '10px 14px', borderRadius: '14px',
                border: '1.5px solid var(--border)', fontSize: '14px',
                fontFamily: 'inherit', outline: 'none', background: '#fff',
              }}
            />
            <button
              onClick={handleAddIllness}
              disabled={submitting || !newIllness.trim()}
              style={{
                padding: '10px 20px', borderRadius: '14px',
                background: 'var(--accent)', color: '#fff',
                border: 'none', fontWeight: '700', cursor: 'pointer',
                fontSize: '13px', fontFamily: 'inherit',
                opacity: (submitting || !newIllness.trim()) ? 0.6 : 1,
              }}
            >
              {submitting ? '...' : 'Tambah'}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div style={{ height: '80px', background: 'rgba(0,0,0,0.03)', borderRadius: '16px' }} />
      ) : illnesses.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '24px 0',
          border: '1px dashed rgba(0,0,0,0.06)', borderRadius: '16px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
        }}>
          <LuCircleCheck size={28} style={{ color: 'var(--sage)', opacity: 0.7 }} />
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
            Tidak ada penyakit aktif. Kondisi Anda baik.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '12px' }}>
          {illnesses.map((item) => (
            <div
              key={item.id}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px', background: '#FAF8F5',
                borderRadius: '16px', border: '1px solid rgba(0,0,0,0.03)',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text)' }}>
                  {item.illness_name}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Sejak {new Date(item.started_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })}
                </span>
              </div>
              <button
                onClick={() => handleMarkRecovered(item.id)}
                disabled={recoveringId === item.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '7px 14px', borderRadius: '100px',
                  background: 'rgba(91,123,106,0.08)',
                  color: 'var(--sage-dark)', border: '1px solid rgba(91,123,106,0.15)',
                  cursor: 'pointer', fontSize: '12px', fontWeight: '700',
                  fontFamily: 'inherit', transition: 'all 0.2s',
                  flexShrink: 0,
                  opacity: recoveringId === item.id ? 0.6 : 1,
                }}
              >
                <LuCircleCheck size={14} />
                Sudah Sembuh
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Footer CTA to family-sync */}
      <button
        onClick={() => navigate('/family-sync')}
        style={{
          fontSize: '13px', color: 'var(--accent)', background: 'none',
          border: 'none', cursor: 'pointer', fontWeight: '700',
          textDecoration: 'underline', textAlign: 'left', padding: 0,
          fontFamily: 'inherit',
        }}
      >
        Kirim laporan darurat ke Caregiver →
      </button>
    </div>
  );
};

export default CurrentIllnessCard;
