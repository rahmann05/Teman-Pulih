import { useState } from 'react';

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
          <img src={imageUrl} alt="Resep yang discan" loading="lazy" />
        </div>
      )}

      {/* Editable extracted text */}
      <div className="scan-result-text-card">
        <span className="scan-result-label">Teks Hasil Ekstraksi</span>
        <textarea
          className="scan-result-textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Teks hasil OCR akan muncul di sini…"
          aria-label="Teks hasil ekstraksi OCR"
        />
      </div>
    </div>
  );
};

export default ScanResultCard;
