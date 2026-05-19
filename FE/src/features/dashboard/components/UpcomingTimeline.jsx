import React from 'react';
import { LuCalendarCheck, LuCircleCheck } from 'react-icons/lu';

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
            {schedule.map((item) => {
              const isTaken = item.isTaken;
              return (
                <div key={item.id} className="timeline-item" style={{ opacity: isTaken ? 0.8 : 1 }}>
                  <div className="timeline-time" style={{ color: isTaken ? '#2E7D32' : 'var(--text-secondary)' }}>
                    {item.time}
                  </div>
                  <div 
                    className="timeline-dot" 
                    aria-hidden="true" 
                    style={{ 
                      backgroundColor: isTaken ? '#2E7D32' : 'var(--accent)',
                      boxShadow: isTaken ? '0 0 0 4px rgba(46, 125, 50, 0.15)' : '0 0 0 6px #FFFFFF'
                    }} 
                  />
                  <div className="timeline-content" style={{
                    borderColor: isTaken ? 'rgba(46, 125, 50, 0.15)' : 'rgba(0,0,0,0.03)',
                    backgroundColor: isTaken ? 'rgba(46, 125, 50, 0.02)' : '#FFFFFF'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                      <div className="upcoming-patient-tag">{item.patient}</div>
                      {isTaken && (
                        <span className="taken-badge" style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          fontSize: '9px',
                          padding: '1px 6px',
                          borderRadius: '100px',
                          backgroundColor: 'rgba(46, 125, 50, 0.1)',
                          color: '#2E7D32',
                          fontWeight: '600',
                        }}>
                          <LuCircleCheck size={9} />
                          Sudah Diminum
                        </span>
                      )}
                    </div>
                    <div className="timeline-med-name" style={{ 
                      textDecoration: isTaken ? 'line-through' : 'none',
                      color: isTaken ? 'var(--text-secondary)' : 'var(--text)'
                    }}>
                      {item.name}
                    </div>
                    <div className="timeline-med-desc">{item.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default UpcomingTimeline;
