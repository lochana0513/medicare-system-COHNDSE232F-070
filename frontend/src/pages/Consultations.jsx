import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ConsultationView from '../components/ConsultationView.jsx';
import DataTable from '../components/DataTable.jsx';
import Modal from '../components/Modal.jsx';
import { ErrorMessage, Loading, PageHeader } from '../components/common.jsx';
import { consultationApi } from '../api/appointments.js';
import { doctorApi } from '../api/masterData.js';
import useApi from '../hooks/useApi.js';
import { formatDate } from '../utils/format.js';

export default function Consultations() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => setQuery(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const doctors = useApi(() => doctorApi.list(), []);
  const consultations = useApi(() => consultationApi.list({ q: query, doctorId }), [query, doctorId]);

  const columns = [
    { key: 'consultationDate', label: 'Date', render: (r) => formatDate(r.consultationDate) },
    { key: 'patientName', label: 'Patient', render: (r) => <strong>{r.patientName}</strong> },
    { key: 'doctorName', label: 'Doctor', render: (r) => <div>{r.doctorName}<div className="muted">{r.specialization}</div></div> },
    { key: 'diagnosis', label: 'Diagnosis' },
    { key: 'itemCount', label: 'Medicines', align: 'center' },
    { key: 'followUpDate', label: 'Follow-up', render: (r) => (r.followUpDate ? formatDate(r.followUpDate) : '-') },
  ];

  return (
    <>
      <PageHeader title="Consultations" subtitle="Medical records with diagnoses and prescriptions" />
      <div className="filters">
        <input type="search" placeholder="Search diagnosis or patient" value={search}
               onChange={(e) => setSearch(e.target.value)} />
        <select value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
          <option value="">All doctors</option>
          {(doctors.data || []).map((d) => <option key={d.doctorId} value={d.doctorId}>{d.fullName}</option>)}
        </select>
      </div>

      <ErrorMessage error={consultations.error} onRetry={consultations.reload} />
      {consultations.loading && !consultations.data
        ? <Loading />
        : <DataTable columns={columns} rows={consultations.data || []} rowKey="consultationId"
                     onRowClick={(r) => setSelected(r.consultationId)} />}

      {selected && (
        <ConsultationModal id={selected} onClose={() => setSelected(null)}
                           onOpenAppointment={(appointmentId) => navigate(`/appointments/${appointmentId}`)} />
      )}
    </>
  );
}

function ConsultationModal({ id, onClose, onOpenAppointment }) {
  const { data, error } = useApi(() => consultationApi.get(id), [id]);
  return (
    <Modal
      wide
      title={data ? `Consultation - ${data.patientName}` : 'Consultation'}
      onClose={onClose}
      footer={data && (
        <button className="btn btn-light" onClick={() => onOpenAppointment(data.appointmentId)}>Open appointment</button>
      )}
    >
      <ErrorMessage error={error} />
      {data ? <ConsultationView consultation={data} /> : <Loading />}
    </Modal>
  );
}
