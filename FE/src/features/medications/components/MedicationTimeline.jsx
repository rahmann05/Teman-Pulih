import { LuCalendarX, LuCircleCheck } from 'react-icons/lu';

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
            {schedule.map((item) => {
              const isTaken = item.state === 'taken';
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
                  <div className={`timeline-content ${item.state}`} style={{
                    borderColor: isTaken ? 'rgba(46, 125, 50, 0.15)' : 'rgba(0,0,0,0.03)',
                    backgroundColor: isTaken ? 'rgba(46, 125, 50, 0.02)' : '#FFFFFF'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <div className="timeline-med-name" style={{ 
                        textDecoration: isTaken ? 'line-through' : 'none',
                        color: isTaken ? 'var(--text-secondary)' : 'var(--text)'
                      }}>
                        {item.medName}
                      </div>
                      {isTaken && (
                        <span className="taken-badge" style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          fontSize: '10px',
                          padding: '2px 8px',
                          borderRadius: '100px',
                          backgroundColor: 'rgba(46, 125, 50, 0.1)',
                          color: '#2E7D32',
                          fontWeight: '600',
                        }}>
                          <LuCircleCheck size={10} />
                          Sudah Diminum
                        </span>
                      )}
                    </div>
                    <div className="timeline-med-desc">{item.instruction}</div>
                    <div className="tl-progress">{item.progress}</div>
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

export default MedicationTimeline;
