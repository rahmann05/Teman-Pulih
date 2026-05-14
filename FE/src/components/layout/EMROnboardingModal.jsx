import React from 'react';
import { useEMRForm } from '../../hooks/useEMRForm';
import EMRForm from '../ui/profile/EMRForm';
import EMRDocumentUploader from '../ui/profile/EMRDocumentUploader';
import { FiX } from 'react-icons/fi';
import '../../styles/features/Profile.css';

const EMROnboardingModal = ({ isOpen, onSuccess, onClose, initialData }) => {
  const {
    formData,
    loading,
    error,
    handleChange,
    handleAutoFill,
    handleSubmit
  } = useEMRForm(initialData, onSuccess);

  if (!isOpen) return null;

  return (
    <div className="emr-modal-overlay">
      <div className="emr-modal-content glass-panel">
        <div className="emr-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2>Lengkapi Profil Kesehatan</h2>
            <p>Data ini membantu sistem kami memberikan rekomendasi yang jauh lebih aman dan akurat untuk Anda.</p>
          </div>
          {onClose && (
            <button onClick={onClose} className="modal-close-btn" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem', display: 'flex', alignItems: 'center' }}>
              <FiX size={24} color="var(--text-muted)" />
            </button>
          )}
        </div>
        
        <div style={{ padding: '0 var(--space-6)' }}>
          <EMRDocumentUploader onDataParsed={handleAutoFill} />
        </div>

        {error && <div className="alert-error" style={{ margin: '0 var(--space-6)' }}>{error}</div>}

        <EMRForm 
          formData={formData} 
          handleChange={handleChange} 
          handleSubmit={handleSubmit} 
          loading={loading} 
        />
      </div>
    </div>
  );
};

export default EMROnboardingModal;
