import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import DataTable from '../components/DataTable.jsx';
import FormModal from '../components/FormModal.jsx';
import Icon from '../components/Icon.jsx';
import Modal from '../components/Modal.jsx';
import { useToast } from '../components/Toast.jsx';
import { Bar, ErrorMessage, Loading, PageHeader, StatusBadge } from '../components/common.jsx';
import { doctorApi, hospitalApi, scheduleApi } from '../api/masterData.js';
import useApi from '../hooks/useApi.js';
import { DAY_NAMES, DAYS, formatDateWithDay, money } from '../utils/format.js';
import { scheduleFields } from '../utils/formFields.js';

export default function Schedules() {
  const notify = useToast();
  const [params, setParams] = useSearchParams();
  const filters = {
    doctorId: params.get('doctorId') || '',
    hospitalId: params.get('hospitalId') || '',
    day: params.get('day') || '',
  };
  const [editing, setEditing] = useState(null);
  const [availability, setAvailability] = useState(null);

  const doctors = useApi(() => doctorApi.list(), []);
  const hospitals = useApi(() => hospitalApi.list(), []);
  const schedules = useApi(() => scheduleApi.list(filters), [filters.doctorId, filters.hospitalId, filters.day]);

  const setFilter = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next);
  };

  const save = async (values) => {
    if (editing.scheduleId) {
      await scheduleApi.update(editing.scheduleId, values);
      notify('Session updated');
    } else {
      await scheduleApi.create(values);
      notify('Session added');
    }
    setEditing(null);
    schedules.reload();
  };

  const remove = async (row) => {
    if (!window.confirm(`Delete the ${DAY_NAMES[row.dayOfWeek]} session of ${row.doctorName}?`)) return;
    try {
      await scheduleApi.remove(row.scheduleId);
      notify('Session deleted');
      schedules.reload();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const columns = [
    { key: 'doctorName', label: 'Doctor', render: (r) => <div><strong>{r.doctorName}</strong><div className="muted">{r.specializationName}</div></div> },
    { key: 'hospitalName', label: 'Hospital', render: (r) => <div>{r.hospitalName}<div className="muted">{r.city}</div></div> },
    { key: 'dayOfWeek', label: 'Day', render: (r) => DAY_NAMES[r.dayOfWeek] },
    { key: 'time', label: 'Time', render: (r) => `${r.startTime} - ${r.endTime}` },
    { key: 'maxPatients', label: 'Max patients', align: 'center' },
    { key: 'consultationFee', label: 'Fee', align: 'right', render: (r) => money(r.consultationFee) },
    { key: 'doctorStatus', label: 'Doctor status', render: (r) => <StatusBadge status={r.doctorStatus} /> },
    {
      key: 'actions', label: '', align: 'right', render: (r) => (
        <div className="row-actions">
          <button className="btn btn-small btn-primary-light" onClick={() => setAvailability(r)}>Availability</button>
          <button className="btn btn-small btn-light" onClick={() => setEditing(r)}>Edit</button>
          <button className="btn btn-small btn-danger-light" onClick={() => remove(r)}>Delete</button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Doctor Schedules"
        subtitle="Weekly consultation sessions of each doctor at each hospital"
        actions={<button className="btn btn-primary" onClick={() => setEditing({ ...filters })}><Icon name="plus" /> Add session</button>}
      />

      <div className="filters">
        <select value={filters.doctorId} onChange={(e) => setFilter('doctorId', e.target.value)}>
          <option value="">All doctors</option>
          {(doctors.data || []).map((d) => <option key={d.doctorId} value={d.doctorId}>{d.fullName}</option>)}
        </select>
        <select value={filters.hospitalId} onChange={(e) => setFilter('hospitalId', e.target.value)}>
          <option value="">All hospitals</option>
          {(hospitals.data || []).map((h) => <option key={h.hospitalId} value={h.hospitalId}>{h.name}</option>)}
        </select>
        <select value={filters.day} onChange={(e) => setFilter('day', e.target.value)}>
          <option value="">All days</option>
          {DAYS.map((d) => <option key={d} value={d}>{DAY_NAMES[d]}</option>)}
        </select>
      </div>

      <ErrorMessage error={schedules.error} onRetry={schedules.reload} />
      {schedules.loading && !schedules.data
        ? <Loading />
        : <DataTable columns={columns} rows={schedules.data || []} rowKey="scheduleId" />}

      {editing && (
        <FormModal
          title={editing.scheduleId ? 'Edit session' : 'Add session'}
          fields={scheduleFields(doctors.data || [], hospitals.data || [])}
          initial={editing}
          onSubmit={save}
          onClose={() => setEditing(null)}
        />
      )}
      {availability && <AvailabilityModal schedule={availability} onClose={() => setAvailability(null)} />}
    </>
  );
}

function AvailabilityModal({ schedule, onClose }) {
  const navigate = useNavigate();
  const { data, error, loading } = useApi(() => scheduleApi.sessions(schedule.scheduleId, 6), [schedule.scheduleId]);

  return (
    <Modal title={`${schedule.doctorName} - ${DAY_NAMES[schedule.dayOfWeek]}s`} onClose={onClose}>
      <p className="muted">{schedule.hospitalName} | {schedule.startTime} - {schedule.endTime}</p>
      <ErrorMessage error={error} />
      {loading ? <Loading /> : (
        <div className="session-list">
          {(data || []).map((s) => {
            const booked = s.maxPatients - s.availableSlots;
            return (
              <div key={s.date} className="session-row">
                <div className="session-date">{formatDateWithDay(s.date)}</div>
                <div className="session-bar">
                  <Bar value={booked} max={s.maxPatients} />
                  <small>{s.availableSlots} of {s.maxPatients} slots free</small>
                </div>
                <button className="btn btn-small btn-primary" disabled={s.availableSlots === 0 || schedule.doctorStatus !== 'ACTIVE'}
                        onClick={() => navigate(`/appointments/new?scheduleId=${schedule.scheduleId}&date=${s.date}`)}>
                  Book
                </button>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
