import { useEffect, useState } from 'react';
import DataTable from '../components/DataTable.jsx';
import Icon from '../components/Icon.jsx';
import { Bar, ErrorMessage, Loading, PageHeader, StatusBadge } from '../components/common.jsx';
import { patientApi } from '../api/patients.js';
import { reportApi } from '../api/reports.js';
import useApi from '../hooks/useApi.js';
import { addDays, formatDate, formatDateWithDay, label, money, number, today } from '../utils/format.js';

const year = new Date().getFullYear();

/**
 * Each report maps to a MEDICARE_REPORTS function in the database.
 * Column types: money | date | percent | share (percent with bar) | status
 */
const REPORTS = [
  {
    key: 'revenue',
    title: 'Monthly revenue',
    source: 'RPT_MONTHLY_REVENUE',
    description: 'Paid revenue and refunds per hospital for each month (from the MV_MONTHLY_REVENUE materialized view).',
    params: [{ name: 'year', label: 'Year', type: 'number', defaultValue: year }],
    load: reportApi.monthlyRevenue,
    totals: ['totalAppointments', 'completedAppointments', 'paidRevenue', 'refundedAmount'],
    columns: [
      { key: 'month', label: 'Month' },
      { key: 'hospitalName', label: 'Hospital' },
      { key: 'totalAppointments', label: 'Appointments', align: 'right' },
      { key: 'completedAppointments', label: 'Completed', align: 'right' },
      { key: 'paidRevenue', label: 'Revenue', type: 'money' },
      { key: 'refundedAmount', label: 'Refunded', type: 'money' },
    ],
  },
  {
    key: 'doctors',
    title: 'Doctor performance',
    source: 'RPT_DOCTOR_PERFORMANCE',
    description: 'Appointments, completion rate and revenue per doctor, ranked by revenue.',
    params: [
      { name: 'from', label: 'From', type: 'date', defaultValue: `${year}-01-01` },
      { name: 'to', label: 'To', type: 'date', defaultValue: today() },
    ],
    load: reportApi.doctorPerformance,
    totals: ['totalAppointments', 'completed', 'cancelled', 'noShows', 'revenue'],
    columns: [
      { key: 'revenueRank', label: 'Rank', align: 'center' },
      { key: 'doctorName', label: 'Doctor' },
      { key: 'specialization', label: 'Specialization' },
      { key: 'totalAppointments', label: 'Appointments', align: 'right' },
      { key: 'completed', label: 'Completed', align: 'right' },
      { key: 'cancelled', label: 'Cancelled', align: 'right' },
      { key: 'noShows', label: 'No-shows', align: 'right' },
      { key: 'completionRate', label: 'Completion', type: 'percent' },
      { key: 'revenue', label: 'Revenue', type: 'money' },
    ],
  },
  {
    key: 'demand',
    title: 'Specialization demand',
    source: 'RPT_SPECIALIZATION_DEMAND',
    description: 'Which specialties patients book most, with share of all appointments.',
    params: [
      { name: 'from', label: 'From', type: 'date', defaultValue: `${year}-01-01` },
      { name: 'to', label: 'To', type: 'date', defaultValue: `${year}-12-31` },
    ],
    load: reportApi.specializationDemand,
    totals: ['appointments', 'cancelled', 'revenue'],
    columns: [
      { key: 'specialization', label: 'Specialization' },
      { key: 'doctors', label: 'Doctors', align: 'right' },
      { key: 'appointments', label: 'Appointments', align: 'right' },
      { key: 'uniquePatients', label: 'Patients', align: 'right' },
      { key: 'cancelled', label: 'Cancelled', align: 'right' },
      { key: 'revenue', label: 'Revenue', type: 'money' },
      { key: 'sharePct', label: 'Share', type: 'share' },
    ],
  },
  {
    key: 'occupancy',
    title: 'Session occupancy',
    source: 'RPT_SESSION_OCCUPANCY',
    description: 'Booked versus available slots for every upcoming doctor session.',
    params: [
      { name: 'from', label: 'From', type: 'date', defaultValue: today() },
      { name: 'to', label: 'To', type: 'date', defaultValue: addDays(today(), 6) },
    ],
    load: reportApi.sessionOccupancy,
    totals: ['booked', 'maxPatients', 'available'],
    columns: [
      { key: 'sessionDate', label: 'Date', type: 'dateDay' },
      { key: 'sessionTime', label: 'Time' },
      { key: 'doctorName', label: 'Doctor' },
      { key: 'specialization', label: 'Specialization' },
      { key: 'hospitalName', label: 'Hospital' },
      { key: 'booked', label: 'Booked', align: 'right' },
      { key: 'maxPatients', label: 'Capacity', align: 'right' },
      { key: 'available', label: 'Free', align: 'right' },
      { key: 'occupancyPct', label: 'Occupancy', type: 'share' },
    ],
  },
  {
    key: 'history',
    title: 'Patient medical history',
    source: 'RPT_PATIENT_HISTORY',
    description: 'All consultations of a patient with diagnoses and prescribed medicines.',
    params: [{ name: 'patientId', label: 'Patient', type: 'patient', defaultValue: '1' }],
    load: reportApi.patientHistory,
    columns: [
      { key: 'consultationDate', label: 'Date', type: 'date' },
      { key: 'doctorName', label: 'Doctor' },
      { key: 'specialization', label: 'Specialization' },
      { key: 'hospitalName', label: 'Hospital' },
      { key: 'diagnosis', label: 'Diagnosis' },
      { key: 'medicines', label: 'Medicines', className: 'wrap' },
      { key: 'followUpDate', label: 'Follow-up', type: 'date' },
    ],
  },
  {
    key: 'outstanding',
    title: 'Outstanding payments',
    source: 'RPT_OUTSTANDING_PAYMENTS',
    description: 'Upcoming appointments that are still unpaid or whose payment failed.',
    params: [],
    load: reportApi.outstandingPayments,
    totals: ['amount'],
    columns: [
      { key: 'appointmentId', label: 'Appt', align: 'center' },
      { key: 'appointmentDate', label: 'Date', type: 'date' },
      { key: 'daysUntil', label: 'In (days)', align: 'right' },
      { key: 'patientName', label: 'Patient' },
      { key: 'patientPhone', label: 'Phone' },
      { key: 'doctorName', label: 'Doctor' },
      { key: 'paymentMethod', label: 'Method', type: 'label' },
      { key: 'paymentStatus', label: 'Status', type: 'status' },
      { key: 'amount', label: 'Amount', type: 'money' },
    ],
  },
  {
    key: 'followups',
    title: 'Follow-ups due',
    source: 'RPT_FOLLOWUPS_DUE',
    description: 'Patients whose follow-up visit is due, and whether they have already booked it.',
    params: [{ name: 'days', label: 'Next (days)', type: 'number', defaultValue: 14 }],
    load: reportApi.followupsDue,
    columns: [
      { key: 'followUpDate', label: 'Due', type: 'date' },
      { key: 'daysUntil', label: 'In (days)', align: 'right' },
      { key: 'patientName', label: 'Patient' },
      { key: 'patientPhone', label: 'Phone' },
      { key: 'doctorName', label: 'Doctor' },
      { key: 'diagnosis', label: 'Diagnosis' },
      { key: 'alreadyBooked', label: 'Booked', type: 'yesno' },
    ],
  },
];

function renderCell(column, row) {
  const value = row[column.key];
  if (value === null || value === undefined) return '-';
  switch (column.type) {
    case 'money': return money(value);
    case 'date': return formatDate(value);
    case 'dateDay': return formatDateWithDay(value);
    case 'percent': return `${Number(value).toFixed(1)}%`;
    case 'share': return <div className="share"><Bar value={value} /><span>{Number(value).toFixed(1)}%</span></div>;
    case 'status': return <StatusBadge status={value} />;
    case 'label': return label(value);
    case 'yesno': return <span className={`badge ${value === 'YES' ? 'badge-completed' : 'badge-pending'}`}>{value === 'YES' ? 'Yes' : 'No'}</span>;
    default: return typeof value === 'number' ? number(value) : value;
  }
}

const defaults = (report) => Object.fromEntries(report.params.map((p) => [p.name, p.defaultValue]));

export default function Reports() {
  const [active, setActive] = useState(REPORTS[0]);
  const [values, setValues] = useState(defaults(REPORTS[0]));
  const [result, setResult] = useState({ rows: null, error: null, loading: false });
  const patients = useApi(() => patientApi.list(), []);

  const run = async (report = active, params = values) => {
    setResult({ rows: null, error: null, loading: true });
    try {
      setResult({ rows: await report.load(params), error: null, loading: false });
    } catch (error) {
      setResult({ rows: null, error, loading: false });
    }
  };

  useEffect(() => {
    run(REPORTS[0], defaults(REPORTS[0]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const select = (report) => {
    const params = defaults(report);
    setActive(report);
    setValues(params);
    run(report, params);
  };

  const columns = active.columns.map((c) => ({
    ...c,
    align: c.align || (['money', 'percent'].includes(c.type) ? 'right' : undefined),
    render: (row) => renderCell(c, row),
  }));

  const rows = result.rows || [];
  const footer = active.totals && rows.length > 0 && (
    <tr>
      {active.columns.map((c, i) => {
        if (i === 0) return <td key={c.key}><strong>Total</strong></td>;
        if (!active.totals.includes(c.key)) return <td key={c.key} />;
        const sum = rows.reduce((acc, r) => acc + Number(r[c.key] || 0), 0);
        return <td key={c.key} className="align-right"><strong>{c.type === 'money' ? money(sum) : number(sum)}</strong></td>;
      })}
    </tr>
  );

  return (
    <>
      <PageHeader
        title="Business reports"
        subtitle="Generated by PL/SQL functions in the MEDICARE_REPORTS package"
        actions={<button className="btn btn-light no-print" onClick={() => window.print()}><Icon name="printer" /> Print</button>}
      />

      <div className="report-layout">
        <nav className="report-menu no-print">
          {REPORTS.map((r, i) => (
            <button key={r.key} className={`report-link${active.key === r.key ? ' active' : ''}`} onClick={() => select(r)}>
              <span className="report-no">{i + 1}</span>{r.title}
            </button>
          ))}
        </nav>

        <section className="card report-card">
          <div className="report-head">
            <div>
              <h2>{active.title}</h2>
              <p className="muted">{active.description}</p>
              <code className="source">MEDICARE_REPORTS.{active.source}</code>
            </div>
          </div>

          {active.params.length > 0 && (
            <form className="filters no-print" onSubmit={(e) => { e.preventDefault(); run(); }}>
              {active.params.map((p) => (
                <label key={p.name} className="inline-label">
                  {p.label}
                  {p.type === 'patient' ? (
                    <select value={values[p.name]} onChange={(e) => setValues({ ...values, [p.name]: e.target.value })}>
                      {(patients.data || []).map((pt) => <option key={pt.patientId} value={pt.patientId}>{pt.fullName} ({pt.nic})</option>)}
                    </select>
                  ) : (
                    <input type={p.type} value={values[p.name]}
                           onChange={(e) => setValues({ ...values, [p.name]: e.target.value })} />
                  )}
                </label>
              ))}
              <button type="submit" className="btn btn-primary">Run report</button>
            </form>
          )}

          <ErrorMessage error={result.error} />
          {result.loading ? <Loading text="Running report..." /> : (
            <>
              <DataTable columns={columns} rows={rows} footer={footer} emptyText="No data for the selected parameters" />
              <p className="muted report-count">{rows.length} row(s)</p>
            </>
          )}
        </section>
      </div>
    </>
  );
}
