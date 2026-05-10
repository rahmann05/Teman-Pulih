import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LuArrowLeft, LuMessageCircle, LuPill, LuRefreshCw } from 'react-icons/lu';
import DashboardLayout from '../../components/layout/DashboardLayout';
import ScanResultCard from '../../components/domain/scan/ScanResultCard';
import { getOcrResultById } from '../../services/ocrService';
import '../../styles/features/Scan.css';

/**
 * ScanResultPage — Displays the OCR scan result with editable text
 * and action shortcuts to chatbot and medications.
 */
const ScanResultPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [scan, setScan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const fetchResult = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getOcrResultById(id);
        if (!cancelled) setScan(data.scan || data);
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.error || 'Gagal memuat hasil scan.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchResult();
    return () => { cancelled = true; };
  }, [id]);

  const handleAskAI = () => {
    const context = scan?.extracted_text || '';
    navigate(`/chatbot?context=${encodeURIComponent(context)}`);
  };

  // Loading skeleton
  if (loading) {
    return (
      <DashboardLayout>
        <div className="scan-container">
          <header className="scan-header">
            <button
              className="scan-back-btn"
              onClick={() => navigate('/scan')}
              aria-label="Kembali"
            >
              <LuArrowLeft size={20} />
            </button>
            <h1 className="scan-header-title">Hasil Scan</h1>
          </header>
          <div className="scan-skeleton">
            <div className="skeleton-block" style={{ height: 200 }} />
            <div className="skeleton-block" style={{ height: 160 }} />
            <div className="skeleton-block" style={{ height: 48 }} />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <DashboardLayout>
        <div className="scan-container">
          <header className="scan-header">
            <button
              className="scan-back-btn"
              onClick={() => navigate('/scan')}
              aria-label="Kembali"
            >
              <LuArrowLeft size={20} />
            </button>
            <h1 className="scan-header-title">Hasil Scan</h1>
          </header>
          <div className="scan-error" role="alert">{error}</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="scan-container" data-testid="scan-result-page">
        {/* Header */}
        <header className="scan-header">
          <button
            className="scan-back-btn"
            onClick={() => navigate('/scan')}
            aria-label="Kembali ke scan"
          >
            <LuArrowLeft size={20} />
          </button>
          <h1 className="scan-header-title">Hasil Scan</h1>
        </header>

        {/* Result card with image + editable text */}
        <ScanResultCard
          extractedText={scan?.extracted_text}
          imageUrl={scan?.image_url}
        />

        {/* Action shortcuts */}
        <div className="scan-result-actions">
          <button
            className="scan-action-btn scan-action-btn--primary"
            onClick={handleAskAI}
          >
            <LuMessageCircle size={18} />
            <span>Tanyakan ke AI</span>
          </button>
          <button
            className="scan-action-btn scan-action-btn--outline"
            onClick={() => navigate('/medications')}
          >
            <LuPill size={18} />
            <span>Tambah ke Jadwal</span>
          </button>
          <button
            className="scan-action-btn scan-action-btn--outline"
            onClick={() => navigate('/scan')}
          >
            <LuRefreshCw size={18} />
            <span>Scan Ulang</span>
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ScanResultPage;
