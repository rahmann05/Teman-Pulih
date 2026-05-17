import { useEffect, useMemo, useState } from 'react';

// Fungsi bantuan untuk mendapatkan 7 hari terakhir
const getLast7Days = () => {
  const days = [];
  const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({
      date: d.getDate(),
      dayName: dayNames[d.getDay()],
      fullDate: d.toISOString().split('T')[0]
    });
  }
  return days;
};

// Data Mock Sementara
const MOCK_WEEKLY_DATA = {
  // Key adalah string tanggal YYYY-MM-DD
  // Contoh menggunakan 7 hari terakhir
};

const getMockData = (days) => {
  const data = {};
  days.forEach((day, index) => {
    // Buat data dummy yang bervariasi berdasarkan hari
    if (index === 6) { // Hari ini
      data[day.fullDate] = [
        { id: 1, name: 'Amoxicilin', status: 'PENDING' },
        { id: 2, name: 'Paracetamol', status: 'ON_TIME' }
      ];
    } else if (index === 5) { // Kemarin
      data[day.fullDate] = [
        { id: 1, name: 'Amoxicilin', status: 'ON_TIME' },
        { id: 2, name: 'Paracetamol', status: 'LATE' }
      ];
    } else if (index === 4) { // Lusa kemarin
      data[day.fullDate] = [
        { id: 1, name: 'Amoxicilin', status: 'ON_TIME' },
        { id: 2, name: 'Paracetamol', status: 'MISSED' }
      ];
    } else { // Hari-hari sebelumnya
      data[day.fullDate] = [
        { id: 1, name: 'Amoxicilin', status: 'ON_TIME' },
        { id: 2, name: 'Paracetamol', status: 'ON_TIME' }
      ];
    }
  });
  return data;
};

const WeeklyMedicationCalendar = () => {
  const days = useMemo(() => getLast7Days(), []);
  const medicationHistory = useMemo(() => getMockData(days), [days]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'ON_TIME': return 'var(--success)'; // Hijau
      case 'LATE': return 'var(--warning)'; // Kuning
      case 'MISSED': return 'var(--danger)'; // Merah
      case 'PENDING': return 'var(--border)'; // Abu-abu
      default: return 'var(--border)';
    }
  };

  return (
    <div className="weekly-calendar-section is-expanded" data-testid="weekly-calendar">
      <div className="section-header weekly-calendar-header">
        <h3 className="section-title">Riwayat 7 Hari Terakhir</h3>
      </div>

      <div className="weekly-calendar-grid">
        {days.map((day) => {
          const meds = medicationHistory[day.fullDate] || [];
          const isToday = new Date().toISOString().split('T')[0] === day.fullDate;
          
          return (
            <div key={day.fullDate} className={`calendar-column ${isToday ? 'today' : ''}`}>
              <div className="calendar-day-header">
                <span className="day-name">{day.dayName}</span>
                <span className="day-number">{day.date}</span>
              </div>
              
              <div className="calendar-meds-list">
                {meds.map((med) => (
                  <div key={med.id} className="calendar-med-item" title={med.status}>
                    <span 
                      className="med-status-indicator" 
                      style={{ backgroundColor: getStatusColor(med.status) }}
                    />
                    <span className="med-name-truncate">{med.name}</span>
                  </div>
                ))}
                {meds.length === 0 && (
                  <div className="calendar-med-empty">-</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WeeklyMedicationCalendar;
