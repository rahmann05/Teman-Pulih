import React from 'react';

const MedicationTimeline = ({ schedule = [], emptyMessage = 'Belum ada jadwal obat hari ini.' }) => {
  if (schedule.length === 0) {
    return (
      <div className="timeline-section" data-testid="med-timeline">
        <div className="section-header">
          <h3 className="section-title">Jadwal Hari Ini</h3>
          <a href="/medications" className="section-link">Lihat Semua</a>
        </div>
        <p className="empty-state-text">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="timeline-section" data-testid="med-timeline">
      <div className="section-header">
        <h3 className="section-title">Jadwal Hari Ini</h3>
        <a href="/medications" className="section-link">Lihat Semua</a>
      </div>
      <div className="timeline-list">
        {schedule.map((item) => (
          <div key={item.id} className="timeline-item">
            <div className="timeline-time">{item.time}</div>
            <div className={`timeline-card ${item.state}`}>
              <div className="tl-med-name">{item.name}</div>
              <div className="tl-med-desc">{item.desc}</div>
              <div className="tl-progress">{item.progress}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MedicationTimeline;
