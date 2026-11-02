import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ConsultationForm from '../components/ConsultationForm.jsx';
import ConsultationView from '../components/ConsultationView.jsx';
import DataTable from '../components/DataTable.jsx';
import Icon from '../components/Icon.jsx';
import Modal from '../components/Modal.jsx';
import { useToast } from '../components/Toast.jsx';
import { Card, ErrorMessage, InfoList, Loading, PageHeader, StatusBadge } from '../components/common.jsx';
import { appointmentApi, consultationApi } from '../api/appointments.js';
import useApi from '../hooks/useApi.js';
import { formatDate, formatDateTime, formatDateWithDay, label, money, PAYMENT_METHODS, today } from '../utils/format.js';

export default function AppointmentDetail() {
  const { id } = useParams();
  const notify = useToast();
  const [busy, setBusy] = useState(false);
  const [paying, setPaying] = useState(false);
  const [consulting, setConsulting] = useState(false);

  const appointment = useApi(() => appointmentApi.get(id), [id]);
  const audit = useApi(() => appointmentApi.audit(id), [id]);
  const consultationId = appointment.data?.consultationId;
  const consultation = useApi(
    () => (consultationId ? consultationApi.get(consultationId) : Promise.resolve(null)),
    [consultationId],
  );

  if (appointment.error) return <ErrorMessage error={appointment.error} />;
  if (!appointment.data) return <Loading />;
  const a = appointment.data;

  const refresh = () => {
    appointment.reload();
    audit.reload();
  };

  const run = async (action, successMessage) => {
    setBusy(true);
    try {
      await action();
      notify(successMessage);
      refresh();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const open = a.status === 'BOOKED' || a.status === 'CONFIRMED';
  const canPay = a.status !== 'CANCELLED' && a.status !== 'NO_SHOW' && a.paymentStatus !== 'PAID' && a.paymentStatus !== 'REFUNDED';
  const canConsult = open && a.appointmentDate <= today();

  const cancel = () => {
    const refundNote = a.paymentStatus === 'PAID' ? ' The payment will be refunded.' : '';
    if (window.confirm(`Cancel this appointment?${refundNote}`)) {
      run(() => appointmentApi.cancel(id), 'Appointment cancelled');
    }
  };

  const recordConsultation = async (data) => {
    await appointmentApi.recordConsultation(id, data);
    notify('Consultation recorded - appointment completed');
    setConsulting(false);
    refresh();
  };

  const auditColumns = [
    { key: 'changedAt', label: 'When', render: (r) => formatDateTime(r.changedAt) },
    { key: 'change', label: 'Change', render: (r) => <>{r.oldStatus ? <StatusBadge status={r.oldStatus} /> : <span className="muted">New</span>} <span className="arrow">&rarr;</span> <StatusBadge status={r.newStatus} /></> },
    { key: 'changedBy', label: 'By' },
  ];

  return (
    <>
      <PageHeader
        title={`Appointment #${a.appointmentId}`}
        subtitle={`${formatDateWithDay(a.appointmentDate)} | Queue number ${a.queueNo}`}
        actions={
          <>
            <Link className="btn btn-light" to="/appointments"><Icon name="back" /> Appointments</Link>
            {a.status === 'BOOKED' && (
              <button className="btn btn-primary-light" disabled={busy}
                      onClick={() => run(() => appointmentApi.confirm(id), 'Appointment confirmed')}>Confirm</button>
            )}
            {canPay && <button className="btn btn-light" disabled={busy} onClick={() => setPaying(true)}>Take payment</button>}
            {canConsult && <button className="btn btn-primary" disabled={busy} onClick={() => setConsulting(true)}>Record consultation</button>}
            {open && <button className="btn btn-danger-light" disabled={busy} onClick={cancel}>Cancel appointment</button>}
          </>
        }
      />

      <div className="status-strip">
        <div><span>Appointment</span><StatusBadge status={a.status} /></div>
        <div><span>Payment</span>{a.paymentStatus ? <StatusBadge status={a.paymentStatus} /> : <span className="muted">No payment record</span>}</div>
        {open && a.appointmentDate > today() && <div className="muted">Consultation can be recorded on the appointment day.</div>}
      </div>

      <div className="grid grid-3">
        <Card title="Patient">
          <InfoList items={[
            ['Name', <Link key="p" to={`/patients/${a.patientId}`}>{a.patientName}</Link>],
            ['NIC', a.patientNic],
            ['Phone', a.patientPhone],
          ]} />
        </Card>
        <Card title="Doctor & session">
          <InfoList items={[
            ['Doctor', a.doctorName],
            ['Specialization', a.specialization],
            ['Hospital', `${a.hospitalName}, ${a.hospitalCity}`],
            ['Session', `${a.startTime} - ${a.endTime}`],
          ]} />
        </Card>
        <Card title="Booking & payment">
          <InfoList items={[
            ['Booked at', formatDateTime(a.bookedAt)],
            ['Notes', a.notes],
            ['Amount', money(a.amount)],
            ['Method', label(a.paymentMethod)],
            ['Paid on', a.paymentDate ? formatDate(a.paymentDate) : null],
          ]} />
        </Card>
      </div>

      {consultationId && (
        <Card title="Consultation">
          {consultation.data ? <ConsultationView consultation={consultation.data} /> : <Loading />}
        </Card>
      )}

      <Card title="Status history (APPOINTMENT_AUDIT)">
        <DataTable columns={auditColumns} rows={audit.data || []} rowKey="auditId" />
      </Card>

      {paying && (
        <PaymentModal
          appointment={a}
          onClose={() => setPaying(false)}
          onPay={(method) => run(() => appointmentApi.pay(id, method), 'Payment received').then(() => setPaying(false))}
        />
      )}
      {consulting && (
        <ConsultationForm appointment={a} onSubmit={recordConsultation} onClose={() => setConsulting(false)} />
      )}
    </>
  );
}

function PaymentModal({ appointment, onPay, onClose }) {
  const [method, setMethod] = useState(appointment.paymentMethod || 'CASH');
  return (
    <Modal
      title="Take payment"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-light" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onPay(method)}>Receive {money(appointment.amount)}</button>
        </>
      }
    >
      <InfoList items={[
        ['Patient', appointment.patientName],
        ['Doctor', appointment.doctorName],
        ['Amount', <strong key="a">{money(appointment.amount)}</strong>],
      ]} />
      <div className="field">
        <label>Payment method</label>
        <select value={method} onChange={(e) => setMethod(e.target.value)}>
          {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{label(m)}</option>)}
        </select>
      </div>
    </Modal>
  );
}
