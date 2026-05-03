import React from 'react';

const UpcomingTimeline = () => {
  const schedule = [
    { id: 1, time: '13:00', patient: 'Ayah', name: 'Paracetamol', desc: '500 mg - Sesudah makan' },
    { id: 2, time: '14:00', patient: 'Ibu', name: 'Vitamin D3', desc: '1 Tablet - Sesudah makan' },
    { id: 3, time: '20:00', patient: 'Ayah', name: 'Vitamin C', desc: '1 Tablet' },
  ];

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
