import { Link, useNavigate } from 'react-router-dom';
import DataTable from '../components/DataTable.jsx';
import Icon from '../components/Icon.jsx';
import { Card, ErrorMessage, Loading, PageHeader, StatusBadge } from '../components/common.jsx';
import { appointmentApi } from '../api/appointments.js';
import { reportApi } from '../api/reports.js';
import useApi from '../hooks/useApi.js';
import { formatDate, label, money, today } from '../utils/format.js';

export default function Dashboard() {
  const navigate = useNavigate();
  const dashboard = useApi(() => reportApi.dashboard(), []);
  const todays = useApi(() => appointmentApi.list({ date: today() }), []);
  const followups = useApi(() => reportApi.followupsDue({ days: 7 }), []);

  if (dashboard.error) return <ErrorMessage error={dashboard.error} onRetry={dashboard.reload} />;
  if (!dashboard.data) return <Loading />;

  const { summary, statusThisMonth, revenueTrend } = dashboard.data;
  const maxStatus = Math.max(1, ...statusThisMonth.map((s) => s.total));
  const maxRevenue = Math.max(1, ...revenueTrend.map((m) => m.revenue));

  const stats = [
    { label: "Today's appointments", value: summary.todayAppointments, to: '/appointments', icon: 'calendar' },
    { label: 'Upcoming bookings', value: summary.upcomingAppointments, to: '/appointments', icon: 'clock' },
    { label: 'Registered patients', value: summary.totalPatients, to: '/patients', icon: 'users' },
    { label: 'Active doctors', value: summary.activeDoctors, to: '/doctors', icon: 'doctor' },
    { label: 'Revenue this month', value: money(summary.revenueThisMonth), to: '/payments', icon: 'card' },
    { label: 'Outstanding payments', value: money(summary.outstandingAmount), to: '/reports', icon: 'chart' },
  ];

  const todayColumns = [
    { key: 'time', label: 'Session', render: (r) => `${r.startTime} - ${r.endTime}` },
    { key: 'queueNo', label: 'Queue', align: 'center', render: (r) => <span className="queue">#{r.queueNo}</span> },
    { key: 'patientName', label: 'Patient', render: (r) => <strong>{r.patientName}</strong> },
    { key: 'doctorName', label: 'Doctor' },
    { key: 'hospitalName', label: 'Hospital' },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  const todayRows = [...(todays.data || [])].sort((a, b) =>
    a.startTime.localeCompare(b.startTime) || a.queueNo - b.queueNo);

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Overview of today's activity"
        actions={<Link className="btn btn-primary" to="/appointments/new"><Icon name="plus" /> Book appointment</Link>}
      />

      <div className="stats">
        {stats.map((s) => (
          <Link key={s.label} to={s.to} className="stat">
            <span className="stat-icon"><Icon name={s.icon} size={20} /></span>
            <div>
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-2">
        <Card title="Revenue - last 6 months">
          <div className="column-chart">
            {revenueTrend.map((m) => (
              <div key={m.month} className="column">
                <span className="column-value">{Math.round(m.revenue / 1000)}k</span>
                <div className="column-bar" style={{ height: `${(m.revenue / maxRevenue) * 100}%` }}
                     title={`${m.month}: ${money(m.revenue)} from ${m.appointments} appointments`} />
                <span className="column-label">{m.month.slice(5)}/{m.month.slice(2, 4)}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Appointments this month by status">
          {statusThisMonth.length === 0 ? <p className="muted">No appointments this month.</p> : (
            <div className="hbars">
              {statusThisMonth.map((s) => (
                <div key={s.status} className="hbar">
                  <span className="hbar-label">{label(s.status)}</span>
                  <div className="hbar-track">
                    <div className={`hbar-fill fill-${s.status.toLowerCase()}`} style={{ width: `${(s.total / maxStatus) * 100}%` }} />
                  </div>
                  <span className="hbar-value">{s.total}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-2-1">
        <Card title="Today's appointments" actions={<Link className="link-button" to="/appointments">View all</Link>}>
          <DataTable columns={todayColumns} rows={todayRows} rowKey="appointmentId"
                     onRowClick={(r) => navigate(`/appointments/${r.appointmentId}`)}
                     emptyText="No appointments today" />
        </Card>

        <Card title="Follow-ups due this week">
          {(followups.data || []).length === 0 ? <p className="muted">No follow-ups due.</p> : (
            <ul className="simple-list">
              {followups.data.map((f, i) => (
                <li key={i}>
                  <div>
                    <strong>{f.patientName}</strong>
                    <div className="muted">{f.doctorName} - {f.diagnosis}</div>
                  </div>
                  <div className="align-right">
                    <div>{formatDate(f.followUpDate)}</div>
                    <span className={`badge ${f.alreadyBooked === 'YES' ? 'badge-completed' : 'badge-pending'}`}>
                      {f.alreadyBooked === 'YES' ? 'Booked' : 'Not booked'}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
