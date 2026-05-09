import { LuCalendarX } from 'react-icons/lu';

const MedicationTimeline = ({ schedule = [], emptyMessage = 'Belum ada jadwal obat hari ini.' }) => {
  return (
    <div className="timeline-section" data-testid="med-timeline">
      <div className="section-header">
        <h3 className="section-title">Jadwal Hari Ini</h3>
        <a href="/medications" className="section-link">Lihat Semua</a>
      </div>

      {schedule.length === 0 ? (
        <div className="empty-state-card">
          <LuCalendarX size={32} className="empty-state-icon" />
          <p className="empty-state-text">{emptyMessage}</p>
        </div>
      ) : (
        <div className="timeline-list">
          {schedule.map((item) => (
            <div key={item.id} className="timeline-item">
              <div className="timeline-time">{item.time}</div>
              <div className="timeline-dot" aria-hidden="true" />
              <div className={`timeline-card ${item.state}`}>
                <div className="tl-med-name">{item.medName}</div>
                <div className="tl-med-desc">{item.instruction}</div>
                <div className="tl-progress">{item.progress}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MedicationTimeline;
