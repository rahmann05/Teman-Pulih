import { LuPill } from 'react-icons/lu';

/**
 * MedicationEmptyState — shown when list is empty or an error occurs.
 * @param {string} type    - 'empty' | 'error'
 * @param {string} message - Custom message override
 * @param {Function} [onRetry] - Optional retry handler for error state
 */
const MedicationEmptyState = ({ type = 'empty', message, onRetry }) => {
  const defaultMessage =
    type === 'error'
      ? 'Terjadi kesalahan saat memuat data obat.'
      : 'Belum ada obat terdaftar. Tambahkan obat pertama Anda.';

  return (
    <div className="med-empty-state" role="status" aria-live="polite">
      <div className="med-empty-icon" aria-hidden="true">
        <LuPill size={32} />
      </div>
      <p className="med-empty-text">{message || defaultMessage}</p>
      {type === 'error' && onRetry && (
        <button className="med-retry-btn" onClick={onRetry} type="button">
          Coba Lagi
        </button>
      )}
    </div>
  );
};

export default MedicationEmptyState;
