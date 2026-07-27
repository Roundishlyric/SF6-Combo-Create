function SkeletonLoader({ variant = 'card', count = 3 }) {
  const items = Array.from({ length: count }, (_, index) => index);

  return (
    <div className={`skeleton-group skeleton-${variant}-group`} role="status" aria-label="Loading content">
      <span className="sr-only">Loading content…</span>
      {items.map((index) => (
        <div className={`skeleton-shell skeleton-${variant}`} aria-hidden="true" key={index}>
          <span className="skeleton-block skeleton-avatar" />
          <span className="skeleton-block skeleton-line skeleton-line-short" />
          <span className="skeleton-block skeleton-line skeleton-line-medium" />
          <span className="skeleton-block skeleton-line skeleton-line-wide" />
          {variant !== 'row' && <span className="skeleton-block skeleton-content" />}
        </div>
      ))}
    </div>
  );
}

export default SkeletonLoader;
