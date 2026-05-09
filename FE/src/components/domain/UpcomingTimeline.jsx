import React from 'react';

const UpcomingTimeline = ({ schedule = [], emptyMessage = 'Belum ada jadwal mendatang.' }) => {
  if (schedule.length === 0) {
    return (
      <div className="upcoming-section" data-testid="upcoming-timeline">
        <h3 className="upcoming-title">Jadwal Mendatang</h3>
        <p className="empty-state-text">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="upcoming-section" data-testid="upcoming-timeline">
      <h3 className="upcoming-title">Jadwal Mendatang</h3>
      <div className="upcoming-list">
        {schedule.map((item) => (
          <div key={item.id} className="upcoming-item">
            <div className="upcoming-time">{item.time}</div>
            <div className="upcoming-card">
              <div className="upcoming-patient-tag">[{item.patient}]</div>
              <div className="upcoming-med-name">{item.name}</div>
              <div className="upcoming-med-desc">{item.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UpcomingTimeline;
