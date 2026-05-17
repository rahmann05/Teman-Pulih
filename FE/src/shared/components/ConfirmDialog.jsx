/**
 * ConfirmDialog — a reusable modal overlay asking the user to confirm an action.
 * @param {boolean}  isOpen      - Controls visibility
 * @param {string}   title       - Dialog heading
 * @param {string}   message     - Descriptive body text
 * @param {string}   confirmText - Text for the confirm button (default: "Hapus")
 * @param {string}   cancelText  - Text for the cancel button (default: "Batal")
 * @param {boolean}  danger      - If true, confirm button uses danger (red) style
 * @param {Function} onConfirm   - Called when user confirms
 * @param {Function} onCancel    - Called when user cancels or presses Escape
 */
const ConfirmDialog = ({
  isOpen,
  title = 'Konfirmasi',
  message = 'Apakah Anda yakin?',
  confirmText = 'Hapus',
  cancelText = 'Batal',
  danger = true,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') onCancel?.();
  };

  return (
    /* eslint-disable-next-line jsx-a11y/no-static-element-interactions */
    <div
      className="med-modal-overlay"
      onClick={onCancel}
      onKeyDown={handleKeyDown}
      role="presentation"
    >
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
      <div
        className="confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-title" className="confirm-title">{title}</h2>
        <p id="confirm-message" className="confirm-message">{message}</p>
        <div className="confirm-actions">
          <button className="confirm-cancel-btn" type="button" onClick={onCancel}>
            {cancelText}
          </button>
          <button
            className={`confirm-confirm-btn${danger ? ' danger' : ''}`}
            type="button"
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
