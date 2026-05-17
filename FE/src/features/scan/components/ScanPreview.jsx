import { LuScanLine } from 'react-icons/lu';

/**
 * ScanPreview — Displays the image preview area.
 * Shows a placeholder when no image is selected,
 * or the selected image with a processing overlay.
 */
const ScanPreview = ({ imagePreview, isProcessing }) => {
  return (
    <div className={`scan-preview-area${imagePreview ? ' has-image' : ''}`}>
      {imagePreview ? (
        <>
          <img
            src={imagePreview}
            alt="Preview resep"
            className="scan-preview-img"
            loading="lazy"
          />
          {isProcessing && (
            <div className="scan-processing-overlay">
              <div className="scan-processing-bar" />
              <span className="scan-processing-text">Memproses gambar…</span>
            </div>
          )}
        </>
      ) : (
        <div className="scan-preview-placeholder">
          <LuScanLine size={48} className="scan-preview-placeholder-icon" />
          <span className="scan-preview-placeholder-text">
            Ambil foto atau unggah gambar resep
          </span>
        </div>
      )}
    </div>
  );
};

export default ScanPreview;
