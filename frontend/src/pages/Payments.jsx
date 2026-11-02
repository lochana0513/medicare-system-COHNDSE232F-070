import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DataTable from '../components/DataTable.jsx';
import { ErrorMessage, Loading, PageHeader, StatusBadge } from '../components/common.jsx';
import { paymentApi } from '../api/appointments.js';
import useApi from '../hooks/useApi.js';
import { formatDate, label, money, PAYMENT_METHODS, PAYMENT_STATUSES } from '../utils/format.js';

export default function Payments() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({ status: '', method: '', from: '', to: '' });
  const { data, error, loading, reload } = useApi(() => paymentApi.list(filters), [filters]);

  const totals = useMemo(() => {
    const result = Object.fromEntries(PAYMENT_STATUSES.map((s) => [s, { count: 0, amount: 0 }]));
    (data || []).forEach((p) => {
      result[p.paymentStatus].count += 1;
      result[p.paymentStatus].amount += Number(p.amount);
    });
    return result;
  }, [data]);

  const set = (key, value) => setFilters((f) => ({ ...f, [key]: value }));

  const columns = [
    { key: 'appointmentId', label: 'Appt', render: (r) => `#${r.appointmentId}` },
    { key: 'appointmentDate', label: 'Appointment date', render: (r) => formatDate(r.appointmentDate) },
    { key: 'patientName', label: 'Patient', render: (r) => <strong>{r.patientName}</strong> },
    { key: 'doctorName', label: 'Doctor', render: (r) => <div>{r.doctorName}<div className="muted">{r.hospitalName}</div></div> },
    { key: 'appointmentStatus', label: 'Appointment', render: (r) => <StatusBadge status={r.appointmentStatus} /> },
    { key: 'paymentMethod', label: 'Method', render: (r) => label(r.paymentMethod) },
    { key: 'paymentStatus', label: 'Payment', render: (r) => <StatusBadge status={r.paymentStatus} /> },
    { key: 'paymentDate', label: 'Paid on', render: (r) => (r.paymentDate ? formatDate(r.paymentDate) : '-') },
    { key: 'amount', label: 'Amount', align: 'right', render: (r) => money(r.amount) },
  ];

  return (
    <>
      <PageHeader title="Payments" subtitle="Consultation fee payments and refunds" />

      <div className="stat-row">
        {PAYMENT_STATUSES.map((s) => (
          <button key={s} className={`stat-chip${filters.status === s ? ' active' : ''}`}
                  onClick={() => set('status', filters.status === s ? '' : s)}>
            <StatusBadge status={s} />
            <strong>{money(totals[s].amount)}</strong>
            <small>{totals[s].count} payment(s)</small>
          </button>
        ))}
      </div>

      <div className="filters">
        <select value={filters.status} onChange={(e) => set('status', e.target.value)}>
          <option value="">All statuses</option>
          {PAYMENT_STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
        </select>
        <select value={filters.method} onChange={(e) => set('method', e.target.value)}>
          <option value="">All methods</option>
          {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{label(m)}</option>)}
        </select>
        <label className="inline-label">From <input type="date" value={filters.from} onChange={(e) => set('from', e.target.value)} /></label>
        <label className="inline-label">To <input type="date" value={filters.to} onChange={(e) => set('to', e.target.value)} /></label>
      </div>

      <ErrorMessage error={error} onRetry={reload} />
      {loading && !data
        ? <Loading />
        : <DataTable columns={columns} rows={data || []} rowKey="paymentId"
                     onRowClick={(r) => navigate(`/appointments/${r.appointmentId}`)} />}
    </>
  );
}
