import '../styles/ConfirmDialog.css';

function ConfirmDialog({ open, title, message, confirmLabel, busy = false, danger = false, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="confirm-backdrop" role="presentation" onMouseDown={() => !busy && onCancel()}>
      <section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title" onMouseDown={(event) => event.stopPropagation()}>
        <button className="confirm-close" type="button" onClick={onCancel} disabled={busy} aria-label="Close confirmation dialog">×</button>
        <h2 id="confirm-dialog-title">{title}</h2>
        <p>{message}</p>
        <div className="confirm-actions">
          <button className="confirm-cancel" type="button" onClick={onCancel} disabled={busy}>Cancel</button>
          <button className={`confirm-submit${danger ? ' danger' : ''}`} type="button" onClick={onConfirm} disabled={busy}>{busy ? 'Working…' : confirmLabel}</button>
        </div>
      </section>
    </div>
  );
}

export default ConfirmDialog;
