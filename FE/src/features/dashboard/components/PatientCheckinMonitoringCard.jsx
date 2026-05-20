import { useEffect, useState } from 'react';
import { LuActivity, LuHeart, LuCalendar, LuTriangleAlert, LuFrown, LuMeh, LuSmile, LuLaugh, LuCircleCheck } from 'react-icons/lu';
import { getCheckins, getComplaints, getIllnessHistory } from '@/features/family-sync/services/familyService';

const PatientCheckinMonitoringCard = ({ patientId, patientName }) => {
  const [history, setHistory] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [activeIllnesses, setActiveIllnesses] = useState([]);
  const [loading, setLoading] = useState(false);

  const ratingDescriptions = ['Sangat Buruk', 'Buruk', 'Cukup', 'Baik', 'Sangat Baik'];
  
  const severityLabels = { mild: 'Ringan', moderate: 'Sedang', severe: 'Parah/Darurat' };
  const severityColors = {
    mild: { bg: 'rgba(91,123,106,0.08)', color: 'var(--sage-dark)' },
    moderate: { bg: 'rgba(176,137,104,0.1)', color: '#8C6239' },
    severe: { bg: 'rgba(196,101,58,0.1)', color: 'var(--accent-dark)' },
  };

  useEffect(() => {
    if (patientId) fetchAll();
  }, [patientId]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [checkinRes, complaintRes, illnessRes] = await Promise.allSettled([
        getCheckins(patientId, 7),
        getComplaints(patientId),
        getIllnessHistory(patientId),
      ]);
      if (checkinRes.status === 'fulfilled') setHistory(checkinRes.value.data || []);
      if (complaintRes.status === 'fulfilled') setComplaints((complaintRes.value.data || []).slice(0, 3));
      if (illnessRes.status === 'fulfilled') setActiveIllnesses((illnessRes.value.data || []).filter(i => i.is_active));
    } catch (err) {
      console.error('Failed to load monitoring data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getRatingIcon = (rating) => {
    switch (rating) {
      case 1:
      case 2:
        return <LuFrown size={20} style={{ color: 'var(--accent)' }} />;
      case 3:
        return <LuMeh size={20} style={{ color: '#8C6239' }} />;
      case 4:
        return <LuSmile size={20} style={{ color: 'var(--sage)' }} />;
      case 5:
        return <LuLaugh size={20} style={{ color: 'var(--sage-dark)' }} />;
      default:
        return <LuSmile size={20} />;
    }
  };

  if (!patientId) return null;

  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
  const todayCheckin = history.find((c) => c.checkin_date === todayStr);

  const sectionStyle = {
    padding: '20px 24px',
    borderBottom: '1px solid rgba(0,0,0,0.04)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  };

  const sectionTitleStyle = {
    fontSize: '13px',
    fontWeight: '800',
    color: 'var(--text)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    margin: 0,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  };

  return (
    <div className="dashboard-section" data-testid="patient-checkin-monitoring">
      <div className="section-header">
        <h3 className="section-title">Pemantauan Kondisi Pasien</h3>
      </div>

      <div className="monitoring-section bento-card">
        {loading ? (
          <div style={{ padding: '24px' }}>
            <div className="skeleton-loading" style={{ height: '120px', borderRadius: '16px' }} />
          </div>
        ) : (
          <div className="monitoring-content-scroll">
            
            {/* ── SECTION 1: Check-in Hari Ini & Riwayat 7 Hari ── */}
            <div style={{ ...sectionStyle, borderBottom: complaints.length > 0 ? '1px solid rgba(0,0,0,0.04)' : 'none' }}>
              <h4 style={sectionTitleStyle}>
                <LuCalendar size={14} style={{ color: 'var(--accent)' }} /> Check-in Harian
              </h4>
              <div style={{
                background: todayCheckin ? 'rgba(46,125,50,0.04)' : 'rgba(226,158,87,0.04)',
                padding: '14px 16px', borderRadius: '14px',
                border: todayCheckin ? '1px solid rgba(46,125,50,0.1)' : '1px solid rgba(226,158,87,0.1)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: todayCheckin ? '#2E7D32' : '#E29E57', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {todayCheckin ? 'Sudah Check-in' : 'Belum Check-in Hari Ini'}
                  </span>
                  {todayCheckin && getRatingIcon(todayCheckin.condition_rating)}
                </div>
                {todayCheckin && (
                  <div style={{ marginTop: '8px', fontSize: '13px', color: '#555', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontWeight: '700' }}>Kondisi: {ratingDescriptions[todayCheckin.condition_rating - 1]}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <LuActivity size={13} style={{ color: 'var(--accent)' }} />
                      Gejala: {todayCheckin.symptoms_felt || 'Tidak ada'}
                    </span>
                  </div>
                )}
              </div>

              {/* Riwayat 7 hari */}
              {history.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                  {history.map((item) => {
                    const dateObj = new Date(item.checkin_date);
                    const formattedDate = dateObj.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });
                    return (
                      <div key={item.id} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '9px 12px', background: '#FAF8F5', borderRadius: '12px',
                      }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '12px', fontWeight: '700', color: '#2D2D2D' }}>{formattedDate}</span>
                          <span style={{ fontSize: '11px', color: '#7A7A7A' }}>{item.symptoms_felt || 'Sehat & Fit'}</span>
                        </div>
                        {getRatingIcon(item.condition_rating)}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── SECTION 3: Keluhan Terbaru ── */}
            {complaints.length > 0 && (
              <div style={{ ...sectionStyle, borderBottom: 'none' }}>
                <h4 style={sectionTitleStyle}>
                  <LuTriangleAlert size={14} style={{ color: 'var(--accent)' }} /> Keluhan Darurat Terbaru
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {complaints.map((c) => {
                    const sc = severityColors[c.severity] || severityColors.mild;
                    return (
                      <div key={c.id} style={{
                        padding: '12px 14px', background: '#FAF8F5',
                        borderRadius: '14px', border: '1px solid rgba(0,0,0,0.03)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px',
                      }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                          <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)' }}>{c.symptoms}</span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {new Date(c.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <span style={{
                          fontSize: '11px', fontWeight: '700', padding: '4px 10px',
                          borderRadius: '100px', background: sc.bg, color: sc.color,
                          textTransform: 'uppercase', letterSpacing: '0.4px', flexShrink: 0,
                        }}>
                          {severityLabels[c.severity]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientCheckinMonitoringCard;
