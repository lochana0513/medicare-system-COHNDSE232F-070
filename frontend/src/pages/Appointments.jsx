import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DataTable from '../components/DataTable.jsx';
import Icon from '../components/Icon.jsx';
import { useToast } from '../components/Toast.jsx';
import { ErrorMessage, Loading, PageHeader, StatusBadge } from '../components/common.jsx';
import { appointmentApi } from '../api/appointments.js';
import { doctorApi } from '../api/masterData.js';
import useApi from '../hooks/useApi.js';
import { addDays, APPOINTMENT_STATUSES, formatDateWithDay, label, money, today } from '../utils/format.js';

const RANGES = {
  today: { label: 'Today', from: () => today(), to: () => today() },
  upcoming: { label: 'Upcoming', from: () => today(), to: () => '' },
  week: { label: 'Next 7 days', from: () => today(), to: () => addDays(today(), 6) },
  past: { label: 'Past', from: () => '', to: () => addDays(today(), -1) },
  all: { label: 'All', from: () => '', to: () => '' },
};

export default function Appointments() {
  const navigate = useNavigate();
  const notify = useToast();
  const [range, setRange] = useState('upcoming');
  const [status, setStatus] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setQuery(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const params = useMemo(() => ({
    from: RANGES[range].from(), to: RANGES[range].to(), status, doctorId, q: query,
  }), [range, status, doctorId, query]);

  const doctors = useApi(() => doctorApi.list(), []);
  const appointments = useApi(() => appointmentApi.list(params), [params]);

  // upcoming lists read better soonest-first
  const rows = useMemo(() => {
    const list = appointments.data || [];
    if (range === 'past' || range === 'all') return list;
    return [...list].sort((a, b) =>
      a.appointmentDate.localeCompare(b.appointmentDate)
      || a.startTime.localeCompare(b.startTime)
      || a.queueNo - b.queueNo);
  }, [appointments.data, range]);

  const markNoShows = async () => {
    try {
      const result = await appointmentApi.markNoShows();
      notify(`${result.updated} past appointment(s) marked as no-show`);
      appointments.reload();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const columns = [
    { key: 'appointmentDate', label: 'Date', render: (r) => formatDateWithDay(r.appointmentDate) },
    { key: 'time', label: 'Session', render: (r) => `${r.startTime} - ${r.endTime}` },
    { key: 'queueNo', label: 'Queue', align: 'center', render: (r) => <span className="queue">#{r.queueNo}</span> },
    { key: 'patientName', label: 'Patient', render: (r) => <div><strong>{r.patientName}</strong><div className="muted">{r.patientPhone}</div></div> },
    { key: 'doctorName', label: 'Doctor', render: (r) => <div>{r.doctorName}<div className="muted">{r.specialization}</div></div> },
    { key: 'hospitalName', label: 'Hospital' },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'payment', label: 'Payment', align: 'right',
      render: (r) => r.paymentStatus ? <div>{money(r.amount)}<div><StatusBadge status={r.paymentStatus} /></div></div> : '-',
    },
  ];

  return (
    <>
      <PageHeader
        title="Appointments"
        subtitle="Bookings across all doctors and hospitals"
        actions={
          <>
            <button className="btn btn-light" onClick={markNoShows} title="Runs MEDICARE_PKG.PR_MARK_PAST_NO_SHOWS">Mark past no-shows</button>
            <Link className="btn btn-primary" to="/appointments/new"><Icon name="plus" /> Book appointment</Link>
          </>
        }
      />

      <div className="tabs">
        {Object.entries(RANGES).map(([key, r]) => (
          <button key={key} className={`tab${range === key ? ' active' : ''}`} onClick={() => setRange(key)}>{r.label}</button>
        ))}
      </div>

      <div className="filters">
        <input type="search" placeholder="Search patient, NIC or doctor" value={search}
               onChange={(e) => setSearch(e.target.value)} />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {APPOINTMENT_STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
        </select>
        <select value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
          <option value="">All doctors</option>
          {(doctors.data || []).map((d) => <option key={d.doctorId} value={d.doctorId}>{d.fullName}</option>)}
        </select>
        <span className="filters-count">{rows.length} appointment(s)</span>
      </div>

      <ErrorMessage error={appointments.error} onRetry={appointments.reload} />
      {appointments.loading && !appointments.data
        ? <Loading />
        : <DataTable columns={columns} rows={rows} rowKey="appointmentId"
                     onRowClick={(r) => navigate(`/appointments/${r.appointmentId}`)} />}
    </>
  );
}
