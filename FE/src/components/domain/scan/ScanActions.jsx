import { useRef } from 'react';
import { LuCamera, LuImagePlus } from 'react-icons/lu';

/**
 * ScanActions — Camera and gallery upload buttons.
 * Uses hidden file inputs triggered by button clicks.
 */
const ScanActions = ({ onFileSelect, disabled }) => {
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);

  const handleChange = (e) => {
    const file = e.target.files?.[0];
    if (file) onFileSelect(file);
    e.target.value = ''; // reset so same file can be re-selected
  };

  return (
    <div className="scan-actions">
      {/* Hidden file inputs */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleChange}
        hidden
        aria-hidden="true"
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        hidden
        aria-hidden="true"
      />

      <button
        className="scan-action-btn scan-action-btn--primary"
        onClick={() => cameraRef.current?.click()}
        disabled={disabled}
        aria-label="Ambil foto dari kamera"
      >
        <LuCamera size={18} />
        <span>Ambil Foto</span>
      </button>

      <button
        className="scan-action-btn scan-action-btn--outline"
        onClick={() => galleryRef.current?.click()}
        disabled={disabled}
        aria-label="Unggah dari galeri"
      >
        <LuImagePlus size={18} />
        <span>Dari Galeri</span>
      </button>
    </div>
  );
};

export default ScanActions;
