import { useEffect, useMemo, useState } from 'react';
import { buildWeeklyMedicationHistory } from '@/features/dashboard/utils/dashboardHelpers';

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

const WeeklyMedicationCalendar = ({ medications = [], logs = [] }) => {
  const days = useMemo(() => getLast7Days(), []);
  const medicationHistory = useMemo(() => {
    return buildWeeklyMedicationHistory(medications, logs, days);
  }, [medications, logs, days]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'ON_TIME': return '#2E7D32'; // Hijau Tepat Waktu
      case 'LATE': return '#F57C00'; // Kuning Terlambat
      case 'MISSED': return '#D32F2F'; // Merah Terlewat
      case 'PENDING': return '#9E9E9E'; // Abu-abu Belum Waktunya
      default: return '#9E9E9E';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'ON_TIME': return 'Tepat Waktu';
      case 'LATE': return 'Terlambat';
      case 'MISSED': return 'Terlewat';
      case 'PENDING': return 'Belum Waktu';
      default: return '';
    }
  };

  return (
    <div className="weekly-calendar-section is-expanded" data-testid="weekly-calendar">
      <div className="section-header weekly-calendar-header">
        <h3 className="section-title">Riwayat Kepatuhan Obat 7 Hari Terakhir</h3>
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
                  <div key={med.id} className="calendar-med-item" title={`${med.name} (${med.time}) - ${getStatusLabel(med.status)}`}>
                    <span 
                      className="med-status-indicator" 
                      style={{ backgroundColor: getStatusColor(med.status) }}
                    />
                    <span className="med-name-truncate">{med.name}</span>
                    <span style={{ fontSize: '9px', color: 'var(--text-secondary)', marginLeft: 'auto' }}>
                      {med.time}
                    </span>
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

      {/* Legenda Keterangan Warna Kalender */}
      <div className="weekly-calendar-legend">
        <div className="legend-item">
          <span className="legend-dot" style={{ backgroundColor: '#2E7D32' }} />
          <span className="legend-label">Tepat Waktu (&le; 1 jam)</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ backgroundColor: '#F57C00' }} />
          <span className="legend-label">Terlambat (&gt; 1 jam)</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ backgroundColor: '#D32F2F' }} />
          <span className="legend-label">Terlewat / Lewat Batas</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ backgroundColor: '#9E9E9E' }} />
          <span className="legend-label">Belum Waktu Minum</span>
        </div>
      </div>

      <style>{`
        .weekly-calendar-legend {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-4);
          justify-content: center;
          margin-top: var(--space-6);
          padding-top: var(--space-4);
          border-top: 1px solid var(--border);
        }
        .legend-item {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          font-size: var(--font-xs);
          color: var(--text-secondary);
        }
        .legend-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          display: inline-block;
        }
        .legend-label {
          font-weight: 500;
        }
        .med-status-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          display: inline-block;
          flex-shrink: 0;
        }
        .calendar-med-item {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          padding: var(--space-2);
          border-radius: var(--radius-sm);
          font-size: var(--font-xs);
          color: var(--text-primary);
        }
        .calendar-med-item:hover {
          background-color: var(--bg-hover);
        }
      `}</style>
    </div>
  );
};

export default WeeklyMedicationCalendar;
