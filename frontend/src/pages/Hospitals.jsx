import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DataTable from '../components/DataTable.jsx';
import FormModal from '../components/FormModal.jsx';
import Icon from '../components/Icon.jsx';
import { useToast } from '../components/Toast.jsx';
import { ErrorMessage, Loading, PageHeader } from '../components/common.jsx';
import { hospitalApi } from '../api/masterData.js';
import useApi from '../hooks/useApi.js';
import { hospitalFields } from '../utils/formFields.js';

export default function Hospitals() {
  const notify = useToast();
  const navigate = useNavigate();
  const { data, error, loading, reload } = useApi(() => hospitalApi.list(), []);
  const [editing, setEditing] = useState(null);

  const save = async (values) => {
    if (editing.hospitalId) {
      await hospitalApi.update(editing.hospitalId, values);
      notify('Hospital updated');
    } else {
      await hospitalApi.create(values);
      notify('Hospital added');
    }
    setEditing(null);
    reload();
  };

  const remove = async (row) => {
    if (!window.confirm(`Delete "${row.name}"?`)) return;
    try {
      await hospitalApi.remove(row.hospitalId);
      notify('Hospital deleted');
      reload();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const columns = [
    { key: 'name', label: 'Hospital / Clinic', render: (r) => <strong>{r.name}</strong> },
    { key: 'address', label: 'Address' },
    { key: 'city', label: 'City' },
    { key: 'phone', label: 'Phone' },
    { key: 'email', label: 'Email' },
    { key: 'doctorCount', label: 'Doctors', align: 'center' },
    { key: 'sessionCount', label: 'Weekly sessions', align: 'center' },
    {
      key: 'actions', label: '', align: 'right', render: (r) => (
        <div className="row-actions">
          <button className="btn btn-small btn-light" onClick={() => navigate(`/schedules?hospitalId=${r.hospitalId}`)}>Sessions</button>
          <button className="btn btn-small btn-light" onClick={() => setEditing(r)}>Edit</button>
          <button className="btn btn-small btn-danger-light" onClick={() => remove(r)}>Delete</button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Hospitals & Clinics"
        subtitle="Locations where doctors hold their sessions"
        actions={<button className="btn btn-primary" onClick={() => setEditing({})}><Icon name="plus" /> Add hospital</button>}
      />
      <ErrorMessage error={error} onRetry={reload} />
      {loading && !data ? <Loading /> : <DataTable columns={columns} rows={data || []} rowKey="hospitalId" />}

      {editing && (
        <FormModal
          title={editing.hospitalId ? 'Edit hospital' : 'Add hospital'}
          fields={hospitalFields}
          initial={editing}
          onSubmit={save}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}
