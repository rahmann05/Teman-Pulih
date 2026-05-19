import React from 'react';
import { LuCalendarCheck } from 'react-icons/lu';

const UpcomingTimeline = ({ schedule = [], emptyMessage = 'Belum ada jadwal mendatang.' }) => {
  return (
    <div className="dashboard-section" data-testid="upcoming-timeline">
      <div className="section-header">
        <h3 className="section-title">Jadwal Mendatang</h3>
      </div>

      <div className="timeline-section bento-card">
        {schedule.length === 0 ? (
          <div className="empty-state-card">
            <LuCalendarCheck size={32} className="empty-state-icon" />
            <p className="empty-state-text">{emptyMessage}</p>
          </div>
        ) : (
          <div className="timeline-list">
            {schedule.map((item) => (
              <div key={item.id} className="timeline-item">
                <div className="timeline-time">{item.time}</div>
                <div className="timeline-dot" aria-hidden="true" />
                <div className="timeline-content">
                  <div className="upcoming-patient-tag">{item.patient}</div>
                  <div className="timeline-med-name">{item.name}</div>
                  <div className="timeline-med-desc">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UpcomingTimeline;
