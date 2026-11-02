import { useState } from 'react';
import Modal from './Modal.jsx';
import Icon from './Icon.jsx';
import { addDays, today } from '../utils/format.js';

const emptyItem = () => ({ medicineName: '', dosage: '', frequency: '', durationDays: '', instructions: '' });

const FREQUENCIES = ['Once daily', 'Twice daily', 'Three times daily', 'Four times daily', 'At night', 'When needed'];

/** Records a consultation with its prescription items for an appointment. */
export default function ConsultationForm({ appointment, onSubmit, onClose }) {
  const [form, setForm] = useState({ symptoms: '', diagnosis: '', notes: '', followUpDate: '' });
  const [items, setItems] = useState([emptyItem()]);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);

  const setItem = (index, key, value) =>
    setItems((list) => list.map((item, i) => (i === index ? { ...item, [key]: value } : item)));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    setMessage(null);
    const payload = {
      symptoms: form.symptoms || null,
      diagnosis: form.diagnosis,
      notes: form.notes || null,
      followUpDate: form.followUpDate || null,
      items: items
        .filter((i) => i.medicineName.trim())
        .map((i) => ({ ...i, durationDays: Number(i.durationDays), instructions: i.instructions || null })),
    };
    try {
      await onSubmit(payload);
    } catch (err) {
      setErrors(err.fieldErrors || {});
      setMessage(err.message);
      setSaving(false);
    }
  };

  const itemError = (index, key) => errors[`items[${index}].${key}`];

  return (
    <Modal
      wide
      title={`Consultation - ${appointment.patientName}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-light" onClick={onClose}>Cancel</button>
          <button type="submit" form="consultation-form" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save consultation'}
          </button>
        </>
      }
    >
      <form id="consultation-form" onSubmit={submit} noValidate>
        {message && <div className="alert alert-error">{message}</div>}
        <div className="form-grid">
          <div className="field full">
            <label htmlFor="symptoms">Symptoms</label>
            <textarea id="symptoms" rows={2} value={form.symptoms} onChange={(e) => setForm({ ...form, symptoms: e.target.value })} />
          </div>
          <div className={`field full${errors.diagnosis ? ' has-error' : ''}`}>
            <label htmlFor="diagnosis">Diagnosis<span className="required">*</span></label>
            <input id="diagnosis" value={form.diagnosis} onChange={(e) => setForm({ ...form, diagnosis: e.target.value })} />
            {errors.diagnosis && <small className="field-error">{errors.diagnosis}</small>}
          </div>
          <div className="field">
            <label htmlFor="notes">Doctor's notes</label>
            <input id="notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className={`field${errors.followUpDate ? ' has-error' : ''}`}>
            <label htmlFor="followUp">Follow-up date</label>
            <input id="followUp" type="date" min={addDays(today(), 1)} value={form.followUpDate}
                   onChange={(e) => setForm({ ...form, followUpDate: e.target.value })} />
            <div className="quick-dates">
              {[7, 14, 30].map((d) => (
                <button key={d} type="button" className="link-button"
                        onClick={() => setForm({ ...form, followUpDate: addDays(today(), d) })}>+{d} days</button>
              ))}
            </div>
          </div>
        </div>

        <h4 className="section-title">Prescription</h4>
        <datalist id="frequencies">
          {FREQUENCIES.map((f) => <option key={f} value={f} />)}
        </datalist>
        <div className="prescription">
          <div className="prescription-row prescription-head">
            <span>Medicine</span><span>Dosage</span><span>Frequency</span><span>Days</span><span>Instructions</span><span />
          </div>
          {items.map((item, i) => (
            <div key={i} className="prescription-row">
              <input placeholder="e.g. Paracetamol" value={item.medicineName} onChange={(e) => setItem(i, 'medicineName', e.target.value)} />
              <input placeholder="500 mg" value={item.dosage} className={itemError(i, 'dosage') ? 'invalid' : ''}
                     onChange={(e) => setItem(i, 'dosage', e.target.value)} />
              <input list="frequencies" placeholder="Twice daily" value={item.frequency} className={itemError(i, 'frequency') ? 'invalid' : ''}
                     onChange={(e) => setItem(i, 'frequency', e.target.value)} />
              <input type="number" min="1" max="365" value={item.durationDays} className={itemError(i, 'durationDays') ? 'invalid' : ''}
                     onChange={(e) => setItem(i, 'durationDays', e.target.value)} />
              <input placeholder="After meals" value={item.instructions} onChange={(e) => setItem(i, 'instructions', e.target.value)} />
              <button type="button" className="icon-button" aria-label="Remove medicine"
                      onClick={() => setItems((list) => (list.length === 1 ? [emptyItem()] : list.filter((_, j) => j !== i)))}>
                <Icon name="close" size={16} />
              </button>
            </div>
          ))}
          <button type="button" className="btn btn-small btn-light" onClick={() => setItems((list) => [...list, emptyItem()])}>
            <Icon name="plus" size={14} /> Add medicine
          </button>
        </div>
      </form>
    </Modal>
  );
}
