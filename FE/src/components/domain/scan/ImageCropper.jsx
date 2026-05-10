import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { LuCheck, LuRotateCw, LuZoomIn, LuZoomOut } from 'react-icons/lu';

/**
 * Creates a cropped image blob from the source image and crop area.
 */
const getCroppedImg = (imageSrc, pixelCrop) => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = pixelCrop.width;
      canvas.height = pixelCrop.height;
      const ctx = canvas.getContext('2d');

      ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
      );

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Canvas toBlob failed'));
            return;
          }
          resolve(blob);
        },
        'image/jpeg',
        0.92
      );
    };
    image.onerror = reject;
    image.src = imageSrc;
  });
};

/**
 * ImageCropper — Full-screen cropping interface using react-easy-crop.
 * Props:
 *   imageSrc  — blob URL or data URL of the image to crop
 *   onConfirm — (croppedBlob: Blob) => void
 *   onCancel  — () => void
 */
const ImageCropper = ({ imageSrc, onConfirm, onCancel }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [processing, setProcessing] = useState(false);

  const onCropComplete = useCallback((_croppedArea, croppedAreaPx) => {
    setCroppedAreaPixels(croppedAreaPx);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!croppedAreaPixels) return;
    try {
      setProcessing(true);
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      onConfirm(croppedBlob);
    } catch (err) {
      console.error('Crop failed:', err);
    } finally {
      setProcessing(false);
    }
  }, [imageSrc, croppedAreaPixels, onConfirm]);

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  return (
    <div className="crop-container">
      {/* Cropper area */}
      <div className="crop-area">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          rotation={rotation}
          aspect={4 / 3}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
          showGrid
        />
      </div>

      {/* Controls bar */}
      <div className="crop-controls">
        {/* Zoom slider */}
        <div className="crop-zoom-row">
          <button
            className="crop-control-btn"
            onClick={() => setZoom((z) => Math.max(1, z - 0.1))}
            aria-label="Perkecil"
          >
            <LuZoomOut size={18} />
          </button>
          <input
            type="range"
            className="crop-zoom-slider"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            aria-label="Tingkat zoom"
          />
          <button
            className="crop-control-btn"
            onClick={() => setZoom((z) => Math.min(3, z + 0.1))}
            aria-label="Perbesar"
          >
            <LuZoomIn size={18} />
          </button>
          <button
            className="crop-control-btn"
            onClick={handleRotate}
            aria-label="Putar gambar"
          >
            <LuRotateCw size={18} />
          </button>
        </div>

        {/* Action buttons */}
        <div className="crop-action-row">
          <button
            className="scan-action-btn scan-action-btn--outline"
            onClick={onCancel}
            disabled={processing}
          >
            Batal
          </button>
          <button
            className="scan-action-btn scan-action-btn--primary"
            onClick={handleConfirm}
            disabled={processing}
          >
            <LuCheck size={18} />
            <span>{processing ? 'Memproses…' : 'Terapkan'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageCropper;
