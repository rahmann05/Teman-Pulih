import React, { useRef, useState, useEffect } from 'react';
import api from '../../../services/api';
import { FiFileText, FiCheckCircle, FiAlertTriangle, FiXCircle } from 'react-icons/fi';

const EMRDocumentUploader = ({ onDataParsed }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState(null); // 'success', 'partial', 'error'
  const [statusMessage, setStatusMessage] = useState('');
  const fileInputRef = useRef(null);

  // Auto-hide status message after 5 seconds
  useEffect(() => {
    if (status) {
      const timer = setTimeout(() => {
        setStatus(null);
        setStatusMessage('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = async (file) => {
    setStatus(null);
    setStatusMessage('');
    setError('');

    // Validate file type
    const validTypes = [
      'application/pdf', 
      'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (!validTypes.includes(file.type)) {
      setError('Harap unggah file berformat PDF atau Word (DOC/DOCX).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Ukuran file maksimal 5MB.');
      return;
    }

    setUploading(true);

    const formData = new FormData();
    formData.append('document', file);

    try {
      const response = await api.post('/emr/parse', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (response.data && response.data.data) {
        const parsedData = response.data.data;
        const filledFields = Object.values(parsedData).filter(val => val && val.toString().trim() !== '').length;
        
        if (filledFields === 0) {
           setStatus('error');
           setStatusMessage('Gagal: Tidak ada data medis yang dikenali dari dokumen ini.');
        } else if (filledFields < 4) { // Asumsikan 4 adalah ambang batas "sebagian"
           setStatus('partial');
           setStatusMessage('Sebagian data berhasil diekstrak. Silakan periksa dan lengkapi sisanya manual.');
        } else {
           setStatus('success');
           setStatusMessage('Berhasil! Data medis berhasil diekstrak dari dokumen.');
        }

        onDataParsed(parsedData);
      }
    } catch (err) {
      setStatus('error');
      setStatusMessage(err.response?.data?.error || 'Gagal mengekstrak dokumen medis.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="emr-uploader-wrapper" style={{ marginBottom: '1.5rem' }}>
      <div 
        className={`emr-dropzone ${isDragging ? 'drag-active' : ''} ${uploading ? 'uploading' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${isDragging ? 'var(--accent)' : 'var(--border)'}`,
          backgroundColor: isDragging ? 'var(--accent-light)' : 'var(--bg-card)',
          borderRadius: 'var(--radius-xl)',
          padding: '2rem 1.5rem',
          textAlign: 'center',
          cursor: uploading ? 'not-allowed' : 'pointer',
          transition: 'all var(--duration-fast)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.75rem'
        }}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept=".pdf,.doc,.docx" 
          style={{ display: 'none' }} 
        />
        
        {uploading ? (
          <>
            <div className="spinner" style={{ width: '32px', height: '32px', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            <p style={{ fontWeight: '600', color: 'var(--accent)' }}>Sedang memproses dokumen medis Anda...</p>
          </>
        ) : (
          <>
            <FiFileText size={42} color="var(--accent)" style={{ marginBottom: '0.25rem', opacity: 0.8 }} />
            <div>
              <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--text)', fontWeight: '700' }}>Auto-Fill dengan Dokumen Medis</h4>
              <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                Tarik & Lepas PDF/Word hasil lab atau riwayat RS Anda ke sini, atau klik untuk memilih file.
              </p>
            </div>
          </>
        )}
      </div>
      
      {error && <div className="alert-error" style={{ marginTop: '0.75rem' }}>{error}</div>}
      {status && (
        <div 
          className={`alert-${status === 'error' ? 'error' : status === 'success' ? 'success' : 'warning'}`} 
          style={{ 
            marginTop: '0.75rem', 
            padding: '0.75rem 1rem', 
            borderRadius: 'var(--radius-lg)',
            fontSize: 'var(--text-sm)',
            fontWeight: '600',
            backgroundColor: status === 'error' ? '#fee2e2' : status === 'success' ? '#dcfce7' : '#fef3c7',
            color: status === 'error' ? '#991b1b' : status === 'success' ? '#166534' : '#92400e',
            border: `1px solid ${status === 'error' ? '#f87171' : status === 'success' ? '#4ade80' : '#fbbf24'}`,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: 'var(--shadow-sm)',
            animation: 'fadeIn 0.3s ease-out'
          }}
        >
          {status === 'success' && <FiCheckCircle size={18} />}
          {status === 'partial' && <FiAlertTriangle size={18} />}
          {status === 'error' && <FiXCircle size={18} />}
          <span>{statusMessage}</span>
        </div>
      )}
    </div>
  );
};

export default EMRDocumentUploader;
