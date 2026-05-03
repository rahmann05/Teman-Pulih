import React from 'react';

const MedicationTimeline = () => {
  const schedule = [
    { id: 1, time: '08:00', name: 'Amoxicillin', desc: '500 mg - Sesudah makan', progress: '1/3 diminum', state: 'next' },
    { id: 2, time: '13:00', name: 'Paracetamol', desc: '500 mg - Sesudah makan', progress: '0/3 diminum', state: 'upcoming' },
    { id: 3, time: '20:00', name: 'Vitamin C', desc: '1 Tablet', progress: '0/1 diminum', state: 'upcoming' },
  ];

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
