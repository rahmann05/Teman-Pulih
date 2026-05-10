import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LuCrop, LuArrowLeft } from 'react-icons/lu';
import DashboardLayout from '../../components/layout/DashboardLayout';
import ScanPreview from '../../components/domain/scan/ScanPreview';
import ScanActions from '../../components/domain/scan/ScanActions';
import ScanHistory from '../../components/domain/scan/ScanHistory';
import { useOcrScan } from '../../hooks/useOcrScan';
import '../../styles/features/Scan.css';

/**
 * ScanPage — Main scan page with camera/gallery input,
 * preview, crop shortcut, submit, and history.
 */
const ScanPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    imagePreview,
    status,
    error,
    handleFileSelect,
    applyCroppedImage,
    submitScan,
    resetScan,
    history,
    historyLoading,
  } = useOcrScan();

  // Consume cropped blob when returning from crop page
  useEffect(() => {
    if (location.state?.croppedBlob) {
      applyCroppedImage(location.state.croppedBlob);
      // Clear the state so it doesn't re-apply if user refreshes
      window.history.replaceState({}, document.title);
    }
  }, [location.state?.croppedBlob, applyCroppedImage]);

  const isProcessing = status === 'uploading';

  const handleCrop = () => {
    if (!imagePreview) return;
    // Navigate to crop page, passing the preview URL via state
    navigate('/scan/crop', { state: { imageSrc: imagePreview } });
  };

  return (
    <DashboardLayout>
      <div className="scan-container" data-testid="scan-page">
        {/* Header */}
        <header className="scan-header">
          <button
            className="scan-back-btn"
            onClick={() => navigate('/dashboard')}
            aria-label="Kembali ke dashboard"
          >
            <LuArrowLeft size={20} />
          </button>
          <h1 className="scan-header-title">Scan Resep</h1>
        </header>

        {/* Preview area */}
        <ScanPreview
          imagePreview={imagePreview}
          isProcessing={isProcessing}
        />

        {/* Action buttons: camera + gallery (shown when no image yet) */}
        {!imagePreview && (
          <ScanActions
            onFileSelect={handleFileSelect}
            disabled={isProcessing}
          />
        )}

        {/* Post-selection controls: crop, change, submit */}
        {imagePreview && (
          <div className="scan-selected-actions">
            <div className="scan-secondary-actions">
              <button
                className="scan-action-btn scan-action-btn--outline"
                onClick={handleCrop}
                disabled={isProcessing}
              >
                <LuCrop size={16} />
                <span>Potong</span>
              </button>
              <button
                className="scan-action-btn scan-action-btn--outline"
                onClick={resetScan}
                disabled={isProcessing}
              >
                Ganti Gambar
              </button>
            </div>
            <button
              className="scan-submit-btn"
              onClick={submitScan}
              disabled={isProcessing}
            >
              {isProcessing ? 'Memproses…' : 'Proses Scan'}
            </button>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="scan-error" role="alert">
            {error}
          </div>
        )}

        {/* Scan history */}
        <ScanHistory history={history} loading={historyLoading} />
      </div>
    </DashboardLayout>
  );
};

export default ScanPage;
