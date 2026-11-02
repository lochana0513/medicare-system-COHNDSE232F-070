import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import { useToast } from '../components/Toast.jsx';
import { Card, ErrorMessage, InfoList, Loading, PageHeader } from '../components/common.jsx';
import { appointmentApi } from '../api/appointments.js';
import { doctorApi, scheduleApi, specializationApi } from '../api/masterData.js';
import { patientApi } from '../api/patients.js';
import useApi from '../hooks/useApi.js';
import { DAY_NAMES, formatDateWithDay, label, money, PAYMENT_METHODS } from '../utils/format.js';

export default function BookAppointment() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const notify = useToast();

  const [patientId, setPatientId] = useState(params.get('patientId') || '');
  const [patientSearch, setPatientSearch] = useState('');
  const [specializationId, setSpecializationId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [scheduleId, setScheduleId] = useState(params.get('scheduleId') || '');
  const [date, setDate] = useState(params.get('date') || '');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const patients = useApi(() => patientApi.list(), []);
  const specializations = useApi(() => specializationApi.list(), []);
  const doctors = useApi(() => doctorApi.list({ status: 'ACTIVE', specializationId }), [specializationId]);
  const schedules = useApi(() => (doctorId ? scheduleApi.list({ doctorId }) : Promise.resolve([])), [doctorId]);
  const sessions = useApi(() => (scheduleId ? scheduleApi.sessions(scheduleId, 6) : Promise.resolve([])), [scheduleId]);

  // When opened with ?scheduleId=..., preselect that doctor and specialization
  useEffect(() => {
    const initial = params.get('scheduleId');
    if (!initial) return;
    scheduleApi.get(initial).then((s) => {
      setDoctorId(String(s.doctorId));
      setScheduleId(String(s.scheduleId));
    }).catch(() => {});
  }, [params]);

  const filteredPatients = useMemo(() => {
    const term = patientSearch.trim().toLowerCase();
    const list = patients.data || [];
    if (!term) return list;
    return list.filter((p) => `${p.fullName} ${p.nic} ${p.phone}`.toLowerCase().includes(term));
  }, [patients.data, patientSearch]);

  const patient = (patients.data || []).find((p) => String(p.patientId) === String(patientId));
  const schedule = (schedules.data || []).find((s) => String(s.scheduleId) === String(scheduleId));

  const chooseDoctor = (id) => {
    setDoctorId(id);
    setScheduleId('');
    setDate('');
  };

  const chooseSchedule = (id) => {
    setScheduleId(id);
    setDate('');
  };

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      const appointment = await appointmentApi.book({
        patientId: Number(patientId), scheduleId: Number(scheduleId), appointmentDate: date, paymentMethod, notes: notes || null,
      });
      notify(`Appointment booked - queue number ${appointment.queueNo}`);
      navigate(`/appointments/${appointment.appointmentId}`);
    } catch (err) {
      setError(err);
      setSaving(false);
    }
  };

  const ready = patientId && scheduleId && date;

  return (
    <>
      <PageHeader
        title="Book appointment"
        subtitle="Choose the patient, doctor and session"
        actions={<Link className="btn btn-light" to="/appointments"><Icon name="back" /> Appointments</Link>}
      />

      <div className="grid grid-2-1">
        <div className="stack">
          <Card title="1. Patient" actions={<Link to="/patients" className="link-button">Register new patient</Link>}>
            <div className="filters compact">
              <input type="search" className="grow" placeholder="Search name, NIC or phone"
                     value={patientSearch} onChange={(e) => setPatientSearch(e.target.value)} />
            </div>
            {patients.loading && !patients.data ? <Loading /> : (
              <select className="full-width" size={6} value={patientId} onChange={(e) => setPatientId(e.target.value)}>
                {filteredPatients.map((p) => (
                  <option key={p.patientId} value={p.patientId}>{p.fullName} - {p.nic} - {p.phone}</option>
                ))}
              </select>
            )}
          </Card>

          <Card title="2. Doctor and session">
            <div className="form-grid">
              <div className="field">
                <label>Specialization</label>
                <select value={specializationId} onChange={(e) => { setSpecializationId(e.target.value); chooseDoctor(''); }}>
                  <option value="">All specializations</option>
                  {(specializations.data || []).map((s) => <option key={s.specializationId} value={s.specializationId}>{s.name}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Doctor</label>
                <select value={doctorId} onChange={(e) => chooseDoctor(e.target.value)}>
                  <option value="">Select doctor...</option>
                  {(doctors.data || []).map((d) => (
                    <option key={d.doctorId} value={d.doctorId}>{d.fullName} - {d.specializationName} ({money(d.consultationFee)})</option>
                  ))}
                </select>
              </div>
            </div>

            {doctorId && (
              <div className="choice-list">
                {(schedules.data || []).length === 0 && !schedules.loading && <p className="muted">This doctor has no sessions.</p>}
                {(schedules.data || []).map((s) => (
                  <button key={s.scheduleId} type="button"
                          className={`choice${String(s.scheduleId) === String(scheduleId) ? ' selected' : ''}`}
                          onClick={() => chooseSchedule(String(s.scheduleId))}>
                    <strong>{DAY_NAMES[s.dayOfWeek]}</strong>
                    <span>{s.startTime} - {s.endTime}</span>
                    <small>{s.hospitalName}, {s.city}</small>
                  </button>
                ))}
              </div>
            )}
          </Card>

          {scheduleId && (
            <Card title="3. Date">
              {sessions.loading ? <Loading /> : (
                <div className="choice-list">
                  {(sessions.data || []).map((s) => (
                    <button key={s.date} type="button" disabled={s.availableSlots === 0}
                            className={`choice${s.date === date ? ' selected' : ''}`}
                            onClick={() => setDate(s.date)}>
                      <strong>{formatDateWithDay(s.date)}</strong>
                      <small>{s.availableSlots === 0 ? 'Fully booked' : `${s.availableSlots} of ${s.maxPatients} slots free`}</small>
                    </button>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>

        <Card title="Booking summary" className="sticky">
          <InfoList items={[
            ['Patient', patient ? `${patient.fullName} (${patient.nic})` : null],
            ['Doctor', schedule?.doctorName],
            ['Specialization', schedule?.specializationName],
            ['Hospital', schedule ? `${schedule.hospitalName}, ${schedule.city}` : null],
            ['Session', schedule ? `${schedule.startTime} - ${schedule.endTime}` : null],
            ['Date', date ? formatDateWithDay(date) : null],
            ['Fee', schedule ? money(schedule.consultationFee) : null],
          ]} />

          <div className="field">
            <label>Payment method</label>
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{label(m)}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Notes</label>
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
          </div>

          <ErrorMessage error={error} />
          <button className="btn btn-primary btn-block" disabled={!ready || saving} onClick={submit}>
            {saving ? 'Booking...' : 'Confirm booking'}
          </button>
        </Card>
      </div>
    </>
  );
}
