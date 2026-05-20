import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LuCircleCheck, 
  LuActivity, 
  LuSmile, 
  LuHeart, 
  LuAngry, 
  LuFrown, 
  LuMeh, 
  LuLaugh,
  LuTriangleAlert
} from 'react-icons/lu';
import { getTodayCheckinStatus, createCheckin } from '@/features/family-sync/services/familyService';

const DailyCheckinCard = () => {
  const navigate = useNavigate();
  const [rating, setRating] = useState(0);
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [notes, setNotes] = useState('');
  const [checkedIn, setCheckedIn] = useState(false);
  const [todayData, setTodayData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showLowRatingCTA, setShowLowRatingCTA] = useState(false);

  const symptomsList = [
    'Sehat & Fit',
    'Pusing',
    'Mual',
    'Nyeri',
    'Sesak Napas',
    'Lemas',
    'Demam'
  ];

  const ratingDescriptions = [
    'Sangat Buruk',
    'Buruk',
    'Cukup',
    'Baik',
    'Sangat Baik'
  ];

  const ratingIcons = {
    1: LuAngry,
    2: LuFrown,
    3: LuMeh,
    4: LuSmile,
    5: LuLaugh
  };

  useEffect(() => {
    fetchTodayStatus();
  }, []);

  const fetchTodayStatus = async () => {
    try {
      setLoading(true);
      const { data } = await getTodayCheckinStatus();
      if (data) {
        setCheckedIn(true);
        setTodayData(data);
      }
    } catch (err) {
      console.error('Failed to load check-in status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSymptomToggle = (symptom) => {
    if (symptom === 'Sehat & Fit') {
      setSelectedSymptoms(['Sehat & Fit']);
    } else {
      setSelectedSymptoms((prev) => {
        const filtered = prev.filter((s) => s !== 'Sehat & Fit');
        if (filtered.includes(symptom)) {
          return filtered.filter((s) => s !== symptom);
        } else {
          return [...filtered, symptom];
        }
      });
    }
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      setError('Pilih rating kondisi Anda hari ini.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const payload = {
        condition_rating: rating,
        symptoms_felt: selectedSymptoms.join(', '),
        notes: notes.trim()
      };
      const { data } = await createCheckin(payload);
      if (data) {
        setCheckedIn(true);
        setTodayData(data);
        // Show CTA if condition is bad (1 or 2)
        if (rating <= 2) setShowLowRatingCTA(true);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyimpan check-in.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="family-bento-card skeleton-loading" style={{ height: '220px', borderRadius: '32px', background: '#FFF', border: '1px solid rgba(0,0,0,0.03)' }}>
        <div className="skeleton-line" style={{ height: '24px', width: '30%', margin: '24px' }} />
        <div className="skeleton-line" style={{ height: '40px', width: '80%', margin: '0 24px 24px 24px' }} />
      </div>
    );
  }

  if (checkedIn && todayData) {
    const ActiveRatingIcon = ratingIcons[todayData.condition_rating] || LuSmile;
    return (
      <div className="family-bento-card" style={{
        background: '#FFFFFF',
        borderRadius: '32px',
        padding: '32px',
        border: '1px solid rgba(0, 0, 0, 0.03)',
        boxShadow: '0 12px 30px rgba(0, 0, 0, 0.03)',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: '#E8F5E9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2E7D32', flexShrink: 0 }}>
            <LuCircleCheck size={24} />
          </div>
          <div>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', fontWeight: '800', color: 'var(--text)', margin: 0, letterSpacing: '-0.02em' }}>Check-in Hari Ini Berhasil</h3>
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>Kondisi harian Anda telah dibagikan dengan Caregiver secara real-time.</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '4px' }}>
          <span style={{
            fontSize: '13px',
            background: '#FAF8F5',
            border: '1px solid rgba(0,0,0,0.04)',
            padding: '8px 16px',
            borderRadius: '100px',
            color: 'var(--text)',
            fontWeight: '700',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <ActiveRatingIcon style={{ color: '#E29E57' }} /> Kondisi: {ratingDescriptions[todayData.condition_rating - 1]}
          </span>

          <span style={{
            fontSize: '13px',
            background: '#FAF8F5',
            border: '1px solid rgba(0,0,0,0.04)',
            padding: '8px 16px',
            borderRadius: '100px',
            color: 'var(--text)',
            fontWeight: '700',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <LuActivity style={{ color: '#D32F2F' }} /> Gejala: {todayData.symptoms_felt || 'Tidak ada gejala'}
          </span>
        </div>

        {todayData.notes && (
          <div style={{
            background: '#FAF8F5',
            padding: '16px 20px',
            borderRadius: '20px',
            fontSize: '14px',
            color: 'var(--text-secondary)',
            borderLeft: '4px solid #E29E57',
            fontStyle: 'italic',
            lineHeight: '1.6'
          }}>
            "{todayData.notes}"
          </div>
        )}

        {/* Low-rating CTA banner */}
        {showLowRatingCTA && (
          <div style={{
            background: 'rgba(196,101,58,0.06)',
            border: '1px solid rgba(196,101,58,0.15)',
            borderRadius: '20px',
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <LuTriangleAlert size={18} style={{ color: 'var(--accent)', flexShrink: 0 }} />
              <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text)' }}>
                Kondisi Anda terdeteksi tidak baik. Ingin langsung lapor ke Caregiver?
              </span>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => navigate('/family-sync')}
                style={{
                  flex: 1, padding: '10px', borderRadius: '14px',
                  background: 'var(--accent)', color: '#fff',
                  border: 'none', fontWeight: '700', cursor: 'pointer',
                  fontSize: '13px', fontFamily: 'inherit',
                }}
              >
                Ya, Laporkan Sekarang
              </button>
              <button
                onClick={() => setShowLowRatingCTA(false)}
                style={{
                  padding: '10px 16px', borderRadius: '14px',
                  background: 'transparent', color: 'var(--text-secondary)',
                  border: '1px solid var(--border)', cursor: 'pointer',
                  fontSize: '13px', fontFamily: 'inherit',
                }}
              >
                Tidak
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="family-bento-card" style={{
      background: '#FFFFFF',
      borderRadius: '32px',
      padding: '32px',
      border: '1px solid rgba(0, 0, 0, 0.03)',
      boxShadow: '0 12px 30px rgba(0, 0, 0, 0.03)',
      display: 'flex',
      flexDirection: 'column',
      gap: '24px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'rgba(226, 158, 87, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#E29E57', flexShrink: 0 }}>
          <LuHeart size={24} style={{ color: '#D32F2F' }} />
        </div>
        <div>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', fontWeight: '850', color: 'var(--text)', margin: 0, letterSpacing: '-0.02em' }}>
            Bagaimana Kondisi Anda Hari Ini?
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '4px 0 0 0', lineHeight: '1.6' }}>Beri tahu Caregiver Anda kondisi terupdate Anda dalam 1 menit.</p>
        </div>
      </div>

      {error && <div style={{ fontSize: '13px', color: '#D32F2F', background: '#FFEBEE', padding: '10px 14px', borderRadius: '16px', fontWeight: '600' }}>{error}</div>}

      {/* Mood Selector */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
        {[1, 2, 3, 4, 5].map((num) => {
          const isSelected = rating === num;
          const RatingIcon = ratingIcons[num];
          return (
            <button
              key={num}
              onClick={() => setRating(num)}
              className={`checkin-mood-btn ${isSelected ? 'selected' : ''}`}
            >
              <RatingIcon 
                size={28} 
                style={{ 
                  color: isSelected ? '#E29E57' : 'var(--text-secondary)', 
                  transition: 'color 0.2s ease' 
                }} 
              />
              <span style={{ fontSize: '10px', fontWeight: '800', color: isSelected ? '#E29E57' : 'var(--text-secondary)', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.2px', marginTop: '4px' }}>
                {ratingDescriptions[num - 1]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Symptoms tags */}
      <div>
        <span style={{ fontFamily: 'var(--font-heading)', fontSize: '14px', fontWeight: '800', color: 'var(--text)', display: 'block', marginBottom: '12px' }}>Gejala yang Dirasakan:</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {symptomsList.map((sym) => {
            const isSelected = selectedSymptoms.includes(sym);
            return (
              <button
                key={sym}
                onClick={() => handleSymptomToggle(sym)}
                className={`checkin-symptom-tag ${isSelected ? 'active' : ''}`}
              >
                {sym}
              </button>
            );
          })}
        </div>
      </div>

      {/* Notes */}
      <div>
        <textarea
          placeholder="Catatan tambahan kondisi kesehatan Anda hari ini..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          style={{
            width: '100%',
            padding: '16px',
            borderRadius: '20px',
            background: '#FAF8F5',
            border: '1.5px solid var(--border)',
            fontSize: '14px',
            color: 'var(--text)',
            outline: 'none',
            resize: 'none',
            fontFamily: 'inherit',
            transition: 'border-color 0.2s, box-shadow 0.2s'
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#E29E57';
            e.target.style.boxShadow = '0 0 0 3px rgba(226, 158, 87, 0.15)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'var(--border)';
            e.target.style.boxShadow = 'none';
          }}
        />
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="checkin-submit-btn"
        style={{
          opacity: submitting ? 0.7 : 1
        }}
      >
        {submitting ? 'Mengirim Check-in...' : 'Kirim Kondisi Hari Ini'}
      </button>
    </div>
  );
};

export default DailyCheckinCard;
