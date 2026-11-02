import { useState } from 'react';
import Modal from './Modal.jsx';

/**
 * Modal form built from a field list:
 *   { name, label, type: text|email|number|date|time|select|textarea, options, required, full, placeholder }
 * Empty values are sent as null; number fields are converted to numbers.
 */
export default function FormModal({ title, fields, initial = {}, submitLabel = 'Save', onSubmit, onClose }) {
  const [values, setValues] = useState(() =>
    Object.fromEntries(fields.map((f) => [f.name, initial[f.name] ?? f.defaultValue ?? ''])),
  );
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);

  const change = (name, value) => setValues((v) => ({ ...v, [name]: value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    setMessage(null);

    const payload = {};
    fields.forEach((f) => {
      const value = values[f.name];
      if (value === '' || value === undefined) payload[f.name] = null;
      else payload[f.name] = f.type === 'number' || f.numeric ? Number(value) : value;
    });

    try {
      await onSubmit(payload);
    } catch (err) {
      setErrors(err.fieldErrors || {});
      setMessage(err.message);
      setSaving(false);
    }
  };

  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-light" onClick={onClose}>Cancel</button>
          <button type="submit" form="entity-form" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : submitLabel}
          </button>
        </>
      }
    >
      <form id="entity-form" className="form-grid" onSubmit={submit} noValidate>
        {message && <div className="alert alert-error full">{message}</div>}
        {fields.map((f) => (
          <Field key={f.name} field={f} value={values[f.name]} error={errors[f.name]}
                 onChange={(v) => change(f.name, v)} />
        ))}
      </form>
    </Modal>
  );
}

export function Field({ field, value, error, onChange }) {
  const { name, label, type = 'text', options = [], required, full, placeholder, ...rest } = field;
  const id = `field-${name}`;
  let input;

  if (type === 'select') {
    input = (
      <select id={id} value={value ?? ''} onChange={(e) => onChange(e.target.value)} required={required}>
        <option value="">{placeholder || 'Select...'}</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    );
  } else if (type === 'textarea') {
    input = <textarea id={id} rows={3} value={value ?? ''} placeholder={placeholder}
                      onChange={(e) => onChange(e.target.value)} />;
  } else {
    input = <input id={id} type={type} value={value ?? ''} placeholder={placeholder} required={required}
                   step={rest.step} min={rest.min} max={rest.max}
                   onChange={(e) => onChange(e.target.value)} />;
  }

  return (
    <div className={`field${full ? ' full' : ''}${error ? ' has-error' : ''}`}>
      <label htmlFor={id}>{label}{required && <span className="required">*</span>}</label>
      {input}
      {error && <small className="field-error">{error}</small>}
    </div>
  );
}
