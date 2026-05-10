import { Link } from 'react-router-dom';

/**
 * ScanHistory — Horizontal scrollable list of past OCR scans.
 */
const ScanHistory = ({ history = [], loading = false }) => {
  if (loading) {
    return (
      <section className="scan-history-section">
        <h3 className="section-title">Riwayat Scan</h3>
        <div className="scan-history-scroll">
          {[1, 2, 3].map((i) => (
            <div key={i} className="scan-history-card skeleton-block" />
          ))}
        </div>
      </section>
    );
  }

  if (history.length === 0) return null;

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  };

  return (
    <section className="scan-history-section">
      <h3 className="section-title">Riwayat Scan</h3>
      <div className="scan-history-scroll">
        {history.map((scan) => (
          <Link
            key={scan.id}
            to={`/scan/result/${scan.id}`}
            className="scan-history-card"
            aria-label={`Hasil scan ${formatDate(scan.created_at)}`}
          >
            <img
              src={scan.image_url}
              alt="Resep"
              loading="lazy"
            />
            <span className="scan-history-card-date">
              {formatDate(scan.created_at)}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default ScanHistory;
