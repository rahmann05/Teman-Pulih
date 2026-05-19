import { useEffect, useState } from 'react';
import { LuActivity, LuSmile, LuHeart, LuCalendar, LuInfo, LuAngry, LuFrown, LuMeh, LuLaugh } from 'react-icons/lu';
import { getCheckins } from '@/features/family-sync/services/familyService';

const FamilyCheckinsHistorySection = ({ caregiverMode, members }) => {
  const [checkins, setCheckins] = useState([]);
  const [loading, setLoading] = useState(false);

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
    loadCheckins();
  }, [caregiverMode, members]);

  const loadCheckins = async () => {
    try {
      setLoading(true);
      if (caregiverMode) {
        // Fetch checkins for all accepted patients
        const activePatients = members.filter(m => m.avatarVariant === 'patient');
        if (activePatients.length > 0) {
          const allCheckins = [];
          for (const patient of activePatients) {
            try {
              const { data } = await getCheckins(patient.userId, 14);
              if (data) allCheckins.push(...data);
            } catch (err) {
              console.error(`Failed to fetch check-ins for patient ${patient.name}:`, err);
            }
          }
          // Sort by date
          allCheckins.sort((a, b) => new Date(b.checkin_date) - new Date(a.checkin_date));
          setCheckins(allCheckins);
        }
      } else {
        // Patient fetches their own checkins
        const { data } = await getCheckins(null, 14);
        setCheckins(data || []);
      }
    } catch (err) {
      console.error('Failed to load check-ins history:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="family-invite-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <div className="family-invite-title">
          <div className="family-invite-icon-wrapper" style={{ background: 'rgba(226, 158, 87, 0.08)' }}>
            <LuSmile size={22} style={{ color: '#E29E57' }} />
          </div>
          <span className="family-invite-title-text">
            {caregiverMode ? 'Pemantauan Check-in Pasien' : 'Riwayat Check-in Kesehatan Anda'}
          </span>
          {checkins.length > 0 && (
            <span className="family-section-count" style={{ 
              background: 'rgba(226, 158, 87, 0.1)', 
              color: '#E29E57',
              marginLeft: 'auto',
              fontSize: '12px',
              fontWeight: '700',
              padding: '4px 10px',
              borderRadius: '100px'
            }}>
              {checkins.length}
            </span>
          )}
        </div>

        <p className="family-invite-desc" style={{ margin: '8px 0 0 0' }}>
          {caregiverMode 
            ? 'Pantau laporan kondisi kesehatan harian dan tingkat kepulihan pasien Anda.' 
            : 'Lihat kembali catatan kondisi harian yang telah Anda bagikan.'}
        </p>
      </div>

      {loading ? (
        <div className="skeleton-loading" style={{ height: '120px' }}>
          <div className="skeleton-line" style={{ height: '20px', width: '60%', margin: '12px 0' }} />
          <div className="skeleton-line" style={{ height: '16px', width: '80%' }} />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, maxHeight: '380px', overflowY: 'auto', paddingRight: '4px' }}>
          {checkins.length === 0 ? (
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
              <LuInfo size={24} style={{ color: '#E29E57', opacity: 0.6 }} />
              <span>Belum ada riwayat check-in tercatat.</span>
            </div>
          ) : (
            checkins.map((item) => {
              const dateObj = new Date(item.checkin_date);
              const formattedDate = dateObj.toLocaleDateString('id-ID', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              });
              const RatingIcon = ratingIcons[item.condition_rating] || LuSmile;

              return (
                <div
                  key={item.id}
                  style={{
                    background: '#FFF',
                    border: '1px solid rgba(0,0,0,0.04)',
                    borderRadius: '20px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.01)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '12px', color: '#7A7A7A', fontWeight: '500' }}>
                        {formattedDate}
                      </span>
                      {caregiverMode && item.patient && (
                        <span style={{ fontSize: '13px', fontWeight: '750', color: '#2D2D2D', marginTop: '2px' }}>
                          Pasien: {item.patient.name}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: '800', color: '#2D2D2D' }}>
                        {ratingDescriptions[item.condition_rating - 1]}
                      </span>
                      <RatingIcon size={20} style={{ color: '#E29E57' }} />
                    </div>
                  </div>

                  <div style={{ fontSize: '13px', color: '#555', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <LuActivity size={14} style={{ color: '#D32F2F' }} />
                    <span style={{ fontWeight: '600' }}>Gejala:</span> {item.symptoms_felt || 'Sehat & Fit'}
                  </div>

                  {item.notes && (
                    <div style={{
                      fontSize: '13px',
                      color: '#666',
                      fontStyle: 'italic',
                      background: '#FAF8F5',
                      padding: '8px 12px',
                      borderRadius: '12px',
                      borderLeft: '3px solid #E29E57'
                    }}>
                      "{item.notes}"
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </section>
  );
};

export default FamilyCheckinsHistorySection;
