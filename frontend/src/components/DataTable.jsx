/**
 * columns: [{ key, label, render?: (row) => node, align?: 'right' | 'center', className? }]
 */
export default function DataTable({ columns, rows, rowKey, onRowClick, emptyText = 'No records found', footer }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={c.align ? `align-${c.align}` : undefined}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="empty">{emptyText}</td>
            </tr>
          )}
          {rows.map((row, i) => (
            <tr key={rowKey ? row[rowKey] : i}
                className={onRowClick ? 'clickable' : undefined}
                onClick={onRowClick ? () => onRowClick(row) : undefined}>
              {columns.map((c) => (
                <td key={c.key} className={[c.align && `align-${c.align}`, c.className].filter(Boolean).join(' ') || undefined}>
                  {c.render ? c.render(row) : row[c.key] ?? '-'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {footer && <tfoot>{footer}</tfoot>}
      </table>
    </div>
  );
}
