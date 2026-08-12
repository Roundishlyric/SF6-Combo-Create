import { useEffect } from 'react';

function Snackbar({ snackbar, onClose }) {
  useEffect(() => {
    if (!snackbar) return undefined;
    const timer = window.setTimeout(onClose, 3500);
    return () => window.clearTimeout(timer);
  }, [snackbar, onClose]);

  if (!snackbar) return null;

  return (
    <div className={`snackbar snackbar--${snackbar.type}`} role={snackbar.type === 'error' ? 'alert' : 'status'} aria-live="polite">
      <span className="snackbar__icon" aria-hidden="true">{snackbar.type === 'error' ? '!' : '✓'}</span>
      <span>{snackbar.message}</span>
      <button type="button" onClick={onClose} aria-label="Dismiss notification">×</button>
    </div>
  );
}

export default Snackbar;
