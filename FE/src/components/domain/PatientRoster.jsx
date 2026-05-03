import React from 'react';
import { LuPlus } from 'react-icons/lu';

const PatientRoster = () => {
  const patients = [
    { id: 1, name: 'Ayah', initials: 'A', status: 'alert', adherence: '3/4 obat diminum' },
    { id: 2, name: 'Ibu', initials: 'I', status: 'safe', adherence: 'Semua jadwal aman' },
  ];

  return (
    <div className="roster-section" data-testid="patient-roster">
      <div className="roster-header">
        <h3 className="roster-title">Pasien Pantauan</h3>
        <button className="add-patient-btn" aria-label="Tambah Pasien">
          <LuPlus />
        </button>
      </div>
      <div className="roster-carousel">
        {patients.map((patient) => (
          <div key={patient.id} className={`patient-card status-${patient.status}`}>
            <div className="patient-avatar">{patient.initials}</div>
            <div className="patient-name">{patient.name}</div>
            <div className="patient-adherence">{patient.adherence}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PatientRoster;
