import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { scanPrescription, getOcrHistory } from '../services/ocrService';

/**
 * Custom hook for the OCR Scan flow.
 * Manages image selection, preview, cropping, upload, and scan history.
 */
export const useOcrScan = () => {
  const navigate = useNavigate();

  // Image state
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // Flow state
  const [status, setStatus] = useState('idle'); // idle | uploading | success | error
  const [error, setError] = useState(null);

  // History state
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // Fetch scan history on mount
  useEffect(() => {
    let cancelled = false;
    const fetchHistory = async () => {
      try {
        setHistoryLoading(true);
        const data = await getOcrHistory();
        if (!cancelled) setHistory(data);
      } catch (err) {
        console.error('Failed to load OCR history:', err);
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    };
    fetchHistory();
    return () => { cancelled = true; };
  }, []);

  /**
   * Handle file selection from camera or gallery.
   * Creates a blob URL for preview.
   */
  const handleFileSelect = useCallback((file) => {
    if (!file) return;
    setSelectedFile(file);
    setImagePreview(URL.createObjectURL(file));
    setError(null);
    setStatus('idle');
  }, []);

  /**
   * Apply a cropped image (receives a Blob from ImageCropper).
   */
  const applyCroppedImage = useCallback((croppedBlob) => {
    const croppedFile = new File([croppedBlob], 'cropped-prescription.jpg', {
      type: 'image/jpeg',
    });
    setSelectedFile(croppedFile);
    setImagePreview(URL.createObjectURL(croppedBlob));
  }, []);

  /**
   * Submit the selected image for OCR processing.
   * On success, navigates to the result page.
   */
  const submitScan = useCallback(async () => {
    if (!selectedFile) {
      setError('Pilih gambar terlebih dahulu.');
      return;
    }

    try {
      setStatus('uploading');
      setError(null);
      const result = await scanPrescription(selectedFile);
      setStatus('success');
      navigate(`/scan/result/${result.id}`);
    } catch (err) {
      setStatus('error');
      setError(err.response?.data?.error || 'Gagal memproses scan. Coba lagi.');
    }
  }, [selectedFile, navigate]);

  /**
   * Reset the scan state for a fresh scan.
   */
  const resetScan = useCallback(() => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setSelectedFile(null);
    setImagePreview(null);
    setStatus('idle');
    setError(null);
  }, [imagePreview]);

  return {
    // Image
    selectedFile,
    imagePreview,
    handleFileSelect,
    applyCroppedImage,

    // Flow
    status,
    error,
    submitScan,
    resetScan,

    // History
    history,
    historyLoading,
  };
};
