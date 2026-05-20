import { useEffect, useState } from 'react';
import { LuActivity, LuSmile, LuHeart, LuCalendar } from 'react-icons/lu';
import { getCheckins } from '@/features/family-sync/services/familyService';

const PatientCheckinMonitoringCard = ({ patientId, patientName }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  const ratingDescriptions = [
    'Sangat Buruk',
    'Buruk',
    'Cukup',
    'Baik',
    'Sangat Baik'
  ];

  const ratingEmojis = ['😭', '🥺', '😐', '🙂', '🤩'];

  useEffect(() => {
    if (patientId) {
      fetchCheckins();
    }
  }, [patientId]);

  const fetchCheckins = async () => {
    try {
      setLoading(true);
      const { data } = await getCheckins(patientId, 7);
      setHistory(data || []);
    } catch (err) {
      console.error('Failed to load check-ins history:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!patientId) {
    return null;
  }

  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
  const todayCheckin = history.find((c) => c.checkin_date === todayStr);

  return (
    <div className="patient-checkin-monitoring-card" style={{
      background: '#FFF',
      borderRadius: '24px',
      padding: '24px',
      border: '1px solid rgba(0,0,0,0.04)',
      boxShadow: '0 10px 30px rgba(0,0,0,0.02)',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px'
    }}>
      <div>
        <h3 style={{ fontSize: '17px', fontWeight: '750', color: '#2D2D2D', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <LuHeart style={{ color: '#D32F2F' }} /> Pemantauan Kondisi Pasien
        </h3>
        <p style={{ fontSize: '13px', color: '#7A7A7A', margin: '4px 0 0 0' }}>Perkembangan harian dari pasien <strong>{patientName}</strong></p>
      </div>

      {loading ? (
        <div className="skeleton-loading" style={{ height: '100px' }}>
          <div className="skeleton-line" style={{ height: '20px', width: '60%', margin: '12px 0' }} />
          <div className="skeleton-line" style={{ height: '16px', width: '80%' }} />
        </div>
      ) : (
        <>
          {/* Today's Status */}
          <div style={{
            background: todayCheckin ? 'rgba(46, 125, 50, 0.04)' : 'rgba(226, 158, 87, 0.04)',
            padding: '16px',
            borderRadius: '16px',
            border: todayCheckin ? '1px solid rgba(46, 125, 50, 0.1)' : '1px solid rgba(226, 158, 87, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: '700', color: todayCheckin ? '#2E7D32' : '#E29E57', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {todayCheckin ? 'Check-in Hari Ini' : 'Belum Check-in Hari Ini'}
              </span>
              {todayCheckin && <span style={{ fontSize: '20px' }}>{ratingEmojis[todayCheckin.condition_rating - 1]}</span>}
            </div>

            {todayCheckin ? (
              <>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#2D2D2D' }}>
                  Kondisi: {ratingDescriptions[todayCheckin.condition_rating - 1]}
                </div>
                <div style={{ fontSize: '13px', color: '#555', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <LuActivity size={14} style={{ color: '#D32F2F' }} /> Gejala: {todayCheckin.symptoms_felt || 'Tidak ada gejala'}
                </div>
                {todayCheckin.notes && (
                  <div style={{ fontSize: '13px', color: '#666', fontStyle: 'italic', background: 'rgba(255,255,255,0.7)', padding: '8px 12px', borderRadius: '10px', marginTop: '4px' }}>
                    "{todayCheckin.notes}"
                  </div>
                )}
              </>
            ) : (
              <div style={{ fontSize: '13px', color: '#7A7A7A' }}>
                Pasien belum memperbarui kondisi terbarunya hari ini.
              </div>
            )}
          </div>

          {/* History / Perkembangan Mingguan */}
          <div>
            <h4 style={{ fontSize: '13px', fontWeight: '700', color: '#555', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <LuCalendar size={14} /> Riwayat 7 Check-in Terakhir
            </h4>

            {history.length === 0 ? (
              <div style={{ fontSize: '13px', color: '#7A7A7A', textAlign: 'center', padding: '16px 0', border: '1px dashed rgba(0,0,0,0.06)', borderRadius: '16px' }}>
                Belum ada riwayat check-in terdaftar.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {history.map((item) => {
                  const dateObj = new Date(item.checkin_date);
                  const formattedDate = dateObj.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });
                  return (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        background: '#FAF8F5',
                        borderRadius: '14px',
                        border: '1px solid rgba(0,0,0,0.02)'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: '#2D2D2D' }}>{formattedDate}</span>
                        <span style={{ fontSize: '11px', color: '#7A7A7A' }}>Gejala: {item.symptoms_felt || 'Sehat & Fit'}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12px', fontWeight: '600', color: '#555' }}>
                          {ratingDescriptions[item.condition_rating - 1]}
                        </span>
                        <span style={{ fontSize: '18px' }}>{ratingEmojis[item.condition_rating - 1]}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default PatientCheckinMonitoringCard;
