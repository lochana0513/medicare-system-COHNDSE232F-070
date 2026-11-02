import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DataTable from '../components/DataTable.jsx';
import FormModal from '../components/FormModal.jsx';
import Icon from '../components/Icon.jsx';
import { useToast } from '../components/Toast.jsx';
import { ErrorMessage, Loading, PageHeader } from '../components/common.jsx';
import { patientApi } from '../api/patients.js';
import useApi from '../hooks/useApi.js';
import { formatDate, GENDERS } from '../utils/format.js';
import { patientFields } from '../utils/formFields.js';

export default function Patients() {
  const notify = useToast();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [registering, setRegistering] = useState(false);
  const { data, error, loading, reload } = useApi(() => patientApi.list(query), [query]);

  useEffect(() => {
    const timer = setTimeout(() => setQuery(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const register = async (values) => {
    const patient = await patientApi.register(values);
    notify(`${patient.fullName} registered (ID ${patient.patientId})`);
    setRegistering(false);
    navigate(`/patients/${patient.patientId}`);
  };

  const columns = [
    { key: 'patientId', label: 'ID' },
    { key: 'fullName', label: 'Name', render: (r) => <strong>{r.fullName}</strong> },
    { key: 'nic', label: 'NIC' },
    { key: 'age', label: 'Age', align: 'center' },
    { key: 'gender', label: 'Gender', render: (r) => GENDERS[r.gender] },
    { key: 'phone', label: 'Phone' },
    { key: 'bloodGroup', label: 'Blood', align: 'center' },
    { key: 'registeredDate', label: 'Registered', render: (r) => formatDate(r.registeredDate) },
  ];

  return (
    <>
      <PageHeader
        title="Patients"
        subtitle="Search, register and manage patients"
        actions={<button className="btn btn-primary" onClick={() => setRegistering(true)}><Icon name="plus" /> Register patient</button>}
      />
      <div className="filters">
        <input type="search" className="grow" placeholder="Search by name, NIC or phone" value={search}
               onChange={(e) => setSearch(e.target.value)} />
      </div>

      <ErrorMessage error={error} onRetry={reload} />
      {loading && !data
        ? <Loading />
        : <DataTable columns={columns} rows={data || []} rowKey="patientId"
                     onRowClick={(r) => navigate(`/patients/${r.patientId}`)} />}

      {registering && (
        <FormModal title="Register patient" fields={patientFields} submitLabel="Register"
                   onSubmit={register} onClose={() => setRegistering(false)} />
      )}
    </>
  );
}
