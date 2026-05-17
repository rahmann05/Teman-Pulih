import { LuCalendarX } from 'react-icons/lu';

const MedicationTimeline = ({ schedule = [], emptyMessage = 'Belum ada jadwal obat hari ini.' }) => {
  return (
    <div className="dashboard-section" data-testid="med-timeline">
      <div className="section-header">
        <h3 className="section-title">Jadwal Hari Ini</h3>
      </div>

      <div className="timeline-section bento-card">
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
                <div className={`timeline-content ${item.state}`}>
                  <div className="timeline-med-name">{item.medName}</div>
                  <div className="timeline-med-desc">{item.instruction}</div>
                  <div className="tl-progress">{item.progress}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MedicationTimeline;
