import React from 'react';
import { LuPlus, LuUsers } from 'react-icons/lu';

const PatientRoster = ({ patients = [], emptyMessage = 'Belum ada anggota keluarga yang terhubung.' }) => {
  return (
    <div className="dashboard-section" data-testid="patient-roster">
      <div className="section-header">
        <h3 className="section-title">Pasien Pantauan</h3>
        <button className="add-patient-btn" aria-label="Tambah Pasien">
          <LuPlus />
        </button>
      </div>

      <div className="roster-section bento-card">
        {patients.length === 0 ? (
          <div className="empty-state-card">
            <LuUsers size={32} className="empty-state-icon" />
            <p className="empty-state-text">{emptyMessage}</p>
          </div>
        ) : (
          <div className="roster-carousel">
            {patients.map((patient) => (
              <div key={patient.id} className={`patient-card status-${patient.status}`}>
                <div className="patient-avatar">{patient.initials}</div>
                <div className="patient-name">{patient.name}</div>
                <div className="patient-adherence">{patient.adherence}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientRoster;
