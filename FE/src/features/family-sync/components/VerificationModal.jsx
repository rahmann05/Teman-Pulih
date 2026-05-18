import { useEffect, useRef, useState } from 'react';

const VerificationModal = ({ isOpen, onClose, onSubmit, error, isLoading }) => {
  const [code, setCode] = useState(Array(6).fill(''));
  const inputsRef = useRef([]);

  useEffect(() => {
    if (isOpen) {
      setCode(Array(6).fill(''));
      setTimeout(() => {
        inputsRef.current[0]?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (e, index) => {
    const value = e.target.value;
    if (isNaN(Number(value))) return; // allow only digits

    const newCode = [...code];
    newCode[index] = value.substring(value.length - 1); // keep only last character
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace') {
      const newCode = [...code];
      
      if (!code[index] && index > 0) {
        // If current is empty, delete previous and focus it
        newCode[index - 1] = '';
        setCode(newCode);
        inputsRef.current[index - 1]?.focus();
      } else {
        // Just delete current
        newCode[index] = '';
        setCode(newCode);
      }
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').trim();
    if (pasteData.length === 6 && !isNaN(Number(pasteData))) {
      const newCode = pasteData.split('');
      setCode(newCode);
      inputsRef.current[5]?.focus();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const fullCode = code.join('');
    if (fullCode.length === 6) {
      onSubmit(fullCode);
    }
  };

  return (
    <div className="verification-modal-overlay">
      <div className="verification-modal-content">
        <button type="button" className="verification-modal-close" onClick={onClose}>
          &times;
        </button>
        
        <div className="verification-modal-header">
          <div className="verification-icon-wrapper">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          </div>
          <h3>Verifikasi Keamanan</h3>
          <p>
            Demi keamanan Anda, masukkan 6 digit kode verifikasi (OTP) yang telah dikirimkan ke Email / WhatsApp milik pendamping Anda.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="verification-otp-container" onPaste={handlePaste}>
            {code.map((num, idx) => (
              <input
                key={idx}
                type="text"
                maxLength="1"
                value={num}
                onChange={(e) => handleChange(e, idx)}
                onKeyDown={(e) => handleKeyDown(e, idx)}
                ref={(el) => (inputsRef.current[idx] = el)}
                className={`verification-otp-input ${num ? 'has-value' : ''}`}
                disabled={isLoading}
              />
            ))}
          </div>

          {error && <div className="verification-modal-error">{error}</div>}

          <div className="verification-modal-actions">
            <button
              type="submit"
              className="verification-submit-btn"
              disabled={isLoading || code.some(val => val === '')}
            >
              {isLoading ? (
                <span className="spinner">Verifikasi...</span>
              ) : (
                'Konfirmasi & Setujui'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VerificationModal;
