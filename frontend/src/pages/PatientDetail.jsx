import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import DataTable from '../components/DataTable.jsx';
import FormModal from '../components/FormModal.jsx';
import Icon from '../components/Icon.jsx';
import { useToast } from '../components/Toast.jsx';
import { Card, ErrorMessage, InfoList, Loading, PageHeader, StatusBadge } from '../components/common.jsx';
import { patientApi } from '../api/patients.js';
import useApi from '../hooks/useApi.js';
import { formatDate, GENDERS, money } from '../utils/format.js';
import { patientFields } from '../utils/formFields.js';

export default function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const notify = useToast();
  const [editing, setEditing] = useState(false);

  const patient = useApi(() => patientApi.get(id), [id]);
  const appointments = useApi(() => patientApi.appointments(id), [id]);
  const history = useApi(() => patientApi.history(id), [id]);

  if (patient.error) return <ErrorMessage error={patient.error} />;
  if (!patient.data) return <Loading />;
  const p = patient.data;

  const save = async (values) => {
    await patientApi.update(id, values);
    notify('Patient details updated');
    setEditing(false);
    patient.reload();
  };

  const remove = async () => {
    if (!window.confirm(`Delete patient ${p.fullName}?`)) return;
    try {
      await patientApi.remove(id);
      notify('Patient deleted');
      navigate('/patients');
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const appointmentColumns = [
    { key: 'appointmentDate', label: 'Date', render: (r) => formatDate(r.appointmentDate) },
    { key: 'time', label: 'Session', render: (r) => `${r.startTime} - ${r.endTime}` },
    { key: 'queueNo', label: 'Queue', align: 'center' },
    { key: 'doctorName', label: 'Doctor', render: (r) => <div>{r.doctorName}<div className="muted">{r.specialization}</div></div> },
    { key: 'hospitalName', label: 'Hospital' },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'amount', label: 'Payment', align: 'right', render: (r) => r.paymentStatus ? <>{money(r.amount)} <StatusBadge status={r.paymentStatus} /></> : '-' },
  ];

  return (
    <>
      <PageHeader
        title={p.fullName}
        subtitle={`Patient ID ${p.patientId} | NIC ${p.nic}`}
        actions={
          <>
            <Link className="btn btn-light" to="/patients"><Icon name="back" /> Patients</Link>
            <button className="btn btn-light" onClick={() => setEditing(true)}>Edit</button>
            <button className="btn btn-danger-light" onClick={remove}>Delete</button>
            <Link className="btn btn-primary" to={`/appointments/new?patientId=${p.patientId}`}><Icon name="plus" /> Book appointment</Link>
          </>
        }
      />

      <div className="grid grid-2-1">
        <Card title="Medical history">
          <ErrorMessage error={history.error} />
          {history.loading && !history.data ? <Loading /> : (
            (history.data || []).length === 0
              ? <p className="muted">No consultations recorded yet.</p>
              : <div className="timeline">
                  {history.data.map((c) => (
                    <div key={c.consultationId} className="timeline-item">
                      <div className="timeline-date">{formatDate(c.consultationDate)}</div>
                      <div className="timeline-body">
                        <strong>{c.diagnosis}</strong>
                        <div className="muted">{c.doctorName} ({c.specialization}) at {c.hospitalName}</div>
                        {c.symptoms && <div>Symptoms: {c.symptoms}</div>}
                        {c.medicines && <div className="medicines">Rx: {c.medicines}</div>}
                        {c.followUpDate && <div className="muted">Follow-up: {formatDate(c.followUpDate)}</div>}
                      </div>
                    </div>
                  ))}
                </div>
          )}
        </Card>

        <Card title="Patient details">
          <InfoList items={[
            ['Age', `${p.age} years`],
            ['Date of birth', formatDate(p.dateOfBirth)],
            ['Gender', GENDERS[p.gender]],
            ['Blood group', p.bloodGroup],
            ['Phone', p.phone],
            ['Email', p.email],
            ['Address', p.address],
            ['Registered', formatDate(p.registeredDate)],
          ]} />
        </Card>
      </div>

      <Card title="Appointments">
        <ErrorMessage error={appointments.error} />
        <DataTable columns={appointmentColumns} rows={appointments.data || []} rowKey="appointmentId"
                   onRowClick={(r) => navigate(`/appointments/${r.appointmentId}`)}
                   emptyText="No appointments yet" />
      </Card>

      {editing && (
        <FormModal title="Edit patient" fields={patientFields} initial={p}
                   onSubmit={save} onClose={() => setEditing(false)} />
      )}
    </>
  );
}
