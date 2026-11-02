import { useState } from 'react';
import DataTable from '../components/DataTable.jsx';
import FormModal from '../components/FormModal.jsx';
import Icon from '../components/Icon.jsx';
import { useToast } from '../components/Toast.jsx';
import { ErrorMessage, Loading, PageHeader } from '../components/common.jsx';
import { specializationApi } from '../api/masterData.js';
import useApi from '../hooks/useApi.js';
import { specializationFields } from '../utils/formFields.js';

export default function Specializations() {
  const notify = useToast();
  const { data, error, loading, reload } = useApi(() => specializationApi.list(), []);
  const [editing, setEditing] = useState(null);

  const save = async (values) => {
    if (editing.specializationId) {
      await specializationApi.update(editing.specializationId, values);
      notify('Specialization updated');
    } else {
      await specializationApi.create(values);
      notify('Specialization added');
    }
    setEditing(null);
    reload();
  };

  const remove = async (row) => {
    if (!window.confirm(`Delete specialization "${row.name}"?`)) return;
    try {
      await specializationApi.remove(row.specializationId);
      notify('Specialization deleted');
      reload();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const columns = [
    { key: 'name', label: 'Specialization', render: (r) => <strong>{r.name}</strong> },
    { key: 'description', label: 'Description' },
    { key: 'doctorCount', label: 'Doctors', align: 'center' },
    {
      key: 'actions', label: '', align: 'right', render: (r) => (
        <div className="row-actions">
          <button className="btn btn-small btn-light" onClick={() => setEditing(r)}>Edit</button>
          <button className="btn btn-small btn-danger-light" onClick={() => remove(r)}>Delete</button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Specializations"
        subtitle="Medical specialties offered on the platform"
        actions={<button className="btn btn-primary" onClick={() => setEditing({})}><Icon name="plus" /> Add specialization</button>}
      />
      <ErrorMessage error={error} onRetry={reload} />
      {loading && !data ? <Loading /> : <DataTable columns={columns} rows={data || []} rowKey="specializationId" />}

      {editing && (
        <FormModal
          title={editing.specializationId ? 'Edit specialization' : 'Add specialization'}
          fields={specializationFields}
          initial={editing}
          onSubmit={save}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}
