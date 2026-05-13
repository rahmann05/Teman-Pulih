import { useRef } from 'react';
import { LuCamera, LuImagePlus } from 'react-icons/lu';
import ScanActionButton from '../../ui/scan/ScanActionButton';

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

      <ScanActionButton
        label="Ambil Foto"
        icon={LuCamera}
        onClick={() => cameraRef.current?.click()}
        disabled={disabled}
        variant="primary"
      />

      <ScanActionButton
        label="Dari Galeri"
        icon={LuImagePlus}
        onClick={() => galleryRef.current?.click()}
        disabled={disabled}
        variant="outline"
      />
    </div>
  );
};

export default ScanActions;
