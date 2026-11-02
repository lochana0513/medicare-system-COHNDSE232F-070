import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DataTable from '../components/DataTable.jsx';
import FormModal from '../components/FormModal.jsx';
import Icon from '../components/Icon.jsx';
import { useToast } from '../components/Toast.jsx';
import { ErrorMessage, Loading, PageHeader } from '../components/common.jsx';
import { doctorApi, specializationApi } from '../api/masterData.js';
import useApi from '../hooks/useApi.js';
import { DOCTOR_STATUSES, label, money } from '../utils/format.js';
import { doctorFields } from '../utils/formFields.js';

export default function Doctors() {
  const notify = useToast();
  const navigate = useNavigate();
  const [filters, setFilters] = useState({ specializationId: '', status: '', q: '' });
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);

  const specializations = useApi(() => specializationApi.list(), []);
  const doctors = useApi(() => doctorApi.list(filters), [filters]);

  useEffect(() => {
    const timer = setTimeout(() => setFilters((f) => ({ ...f, q: search })), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const save = async (values) => {
    if (editing.doctorId) {
      await doctorApi.update(editing.doctorId, values);
      notify('Doctor updated');
    } else {
      await doctorApi.create(values);
      notify('Doctor added');
    }
    setEditing(null);
    doctors.reload();
  };

  const changeStatus = async (row, status) => {
    try {
      await doctorApi.setStatus(row.doctorId, status);
      notify(`${row.fullName} is now ${label(status).toLowerCase()}`);
      doctors.reload();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const remove = async (row) => {
    if (!window.confirm(`Delete ${row.fullName}?`)) return;
    try {
      await doctorApi.remove(row.doctorId);
      notify('Doctor deleted');
      doctors.reload();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const columns = [
    {
      key: 'fullName', label: 'Doctor', render: (r) => (
        <div><strong>{r.fullName}</strong><div className="muted">{r.slmcRegNo}</div></div>
      ),
    },
    { key: 'specializationName', label: 'Specialization' },
    { key: 'phone', label: 'Contact', render: (r) => <div>{r.phone}<div className="muted">{r.email}</div></div> },
    { key: 'experienceYears', label: 'Experience', align: 'center', render: (r) => `${r.experienceYears} yrs` },
    { key: 'consultationFee', label: 'Fee', align: 'right', render: (r) => money(r.consultationFee) },
    {
      key: 'status', label: 'Status', render: (r) => (
        <select className="inline-select" value={r.status} onClick={(e) => e.stopPropagation()}
                onChange={(e) => changeStatus(r, e.target.value)}>
          {DOCTOR_STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
        </select>
      ),
    },
    {
      key: 'actions', label: '', align: 'right', render: (r) => (
        <div className="row-actions">
          <button className="btn btn-small btn-light" onClick={() => navigate(`/schedules?doctorId=${r.doctorId}`)}>Sessions</button>
          <button className="btn btn-small btn-light" onClick={() => setEditing(r)}>Edit</button>
          <button className="btn btn-small btn-danger-light" onClick={() => remove(r)}>Delete</button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Doctors"
        subtitle="Registered doctors, their specialization and consultation fees"
        actions={<button className="btn btn-primary" onClick={() => setEditing({})}><Icon name="plus" /> Add doctor</button>}
      />

      <div className="filters">
        <input type="search" placeholder="Search name or SLMC number" value={search}
               onChange={(e) => setSearch(e.target.value)} />
        <select value={filters.specializationId} onChange={(e) => setFilters({ ...filters, specializationId: e.target.value })}>
          <option value="">All specializations</option>
          {(specializations.data || []).map((s) => <option key={s.specializationId} value={s.specializationId}>{s.name}</option>)}
        </select>
        <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
          <option value="">All statuses</option>
          {DOCTOR_STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
        </select>
      </div>

      <ErrorMessage error={doctors.error} onRetry={doctors.reload} />
      {doctors.loading && !doctors.data
        ? <Loading />
        : <DataTable columns={columns} rows={doctors.data || []} rowKey="doctorId" />}

      {editing && (
        <FormModal
          title={editing.doctorId ? `Edit ${editing.fullName}` : 'Add doctor'}
          fields={doctorFields(specializations.data || [])}
          initial={editing}
          onSubmit={save}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}
