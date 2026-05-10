import { useNavigate, useLocation } from 'react-router-dom';
import { LuArrowLeft } from 'react-icons/lu';
import ImageCropper from '../../components/domain/scan/ImageCropper';
import '../../styles/features/Scan.css';

/**
 * ScanCropPage — Full-screen cropping interface.
 * Receives the image source via location.state.imageSrc.
 * After cropping, navigates back to /scan with the cropped blob in state.
 */
const ScanCropPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const imageSrc = location.state?.imageSrc;

  // Redirect back if no image was provided
  if (!imageSrc) {
    navigate('/scan', { replace: true });
    return null;
  }

  const handleConfirm = (croppedBlob) => {
    // Navigate back to /scan, passing the cropped blob via state
    navigate('/scan', {
      state: { croppedBlob },
      replace: true,
    });
  };

  const handleCancel = () => {
    navigate('/scan', { replace: true });
  };

  return (
    <div className="scan-crop-page" data-testid="scan-crop-page">
      {/* Header */}
      <header className="crop-header">
        <button
          className="scan-back-btn"
          onClick={handleCancel}
          aria-label="Batal potong"
        >
          <LuArrowLeft size={20} />
        </button>
        <h1 className="scan-header-title">Potong Gambar</h1>
      </header>

      <ImageCropper
        imageSrc={imageSrc}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </div>
  );
};

export default ScanCropPage;
