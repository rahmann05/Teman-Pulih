import { useState } from 'react';
import EditableResult from '../../ui/scan/EditableResult';

/**
 * ScanResultCard — Displays and allows editing of OCR-extracted text.
 */
const ScanResultCard = ({ extractedText, imageUrl }) => {
  const [text, setText] = useState(extractedText || '');

  return (
    <div className="scan-result-card-wrapper">
      {/* Scanned image thumbnail */}
      {imageUrl && (
        <div className="scan-result-image">
          <img 
            src={imageUrl} 
            alt="Resep yang discan" 
            loading="lazy" 
            onError={(e) => {
              e.target.src = 'https://placehold.co/600x400/F3F0EC/C4653A?text=Image+Unavailable';
            }}
          />
        </div>
      )}

      {/* Editable extracted text */}
      <EditableResult
        label="Teks Hasil Ekstraksi"
        value={text}
        onChange={setText}
        placeholder="Teks hasil OCR akan muncul di sini…"
      />
    </div>
  );
};

export default ScanResultCard;
