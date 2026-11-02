import { label } from '../utils/format.js';

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}

export function StatusBadge({ status }) {
  if (!status) return <span className="badge">-</span>;
  return <span className={`badge badge-${status.toLowerCase()}`}>{label(status)}</span>;
}

export function Loading({ text = 'Loading...' }) {
  return <div className="loading">{text}</div>;
}

export function ErrorMessage({ error, onRetry }) {
  if (!error) return null;
  return (
    <div className="alert alert-error">
      {error.message || String(error)}
      {onRetry && <button type="button" className="link-button" onClick={onRetry}>Try again</button>}
    </div>
  );
}

export function Card({ title, actions, children, className = '' }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <div className="card-header">
          {title && <h3>{title}</h3>}
          {actions && <div className="card-actions">{actions}</div>}
        </div>
      )}
      <div className="card-body">{children}</div>
    </section>
  );
}

export function InfoList({ items }) {
  return (
    <dl className="info-list">
      {items.map(([term, value]) => (
        <div key={term}>
          <dt>{term}</dt>
          <dd>{value ?? '-'}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Bar({ value, max = 100 }) {
  const pct = max ? Math.min(100, Math.max(0, (Number(value) / max) * 100)) : 0;
  return (
    <div className="bar">
      <div className="bar-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}
