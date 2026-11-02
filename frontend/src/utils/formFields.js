import { BLOOD_GROUPS, DAY_NAMES, DOCTOR_STATUSES, GENDERS, label } from './format.js';

const options = (values, toLabel = label) => values.map((v) => ({ value: v, label: toLabel(v) }));

export const specializationFields = [
  { name: 'name', label: 'Name', required: true, full: true },
  { name: 'description', label: 'Description', type: 'textarea', full: true },
];

export const hospitalFields = [
  { name: 'name', label: 'Hospital name', required: true, full: true },
  { name: 'address', label: 'Address', required: true, full: true },
  { name: 'city', label: 'City', required: true },
  { name: 'phone', label: 'Phone', required: true, placeholder: '0112345678' },
  { name: 'email', label: 'Email', type: 'email', full: true },
];

export const doctorFields = (specializations) => [
  { name: 'firstName', label: 'First name', required: true },
  { name: 'lastName', label: 'Last name', required: true },
  {
    name: 'specializationId', label: 'Specialization', type: 'select', numeric: true, required: true,
    options: specializations.map((s) => ({ value: s.specializationId, label: s.name })),
  },
  { name: 'slmcRegNo', label: 'SLMC registration no.', required: true, placeholder: 'SLMC-12345' },
  { name: 'email', label: 'Email', type: 'email', required: true },
  { name: 'phone', label: 'Phone', required: true, placeholder: '0771234567' },
  { name: 'consultationFee', label: 'Consultation fee (LKR)', type: 'number', required: true, min: 0, step: '0.01' },
  { name: 'experienceYears', label: 'Experience (years)', type: 'number', required: true, min: 0, max: 60 },
  { name: 'status', label: 'Status', type: 'select', options: options(DOCTOR_STATUSES), defaultValue: 'ACTIVE' },
];

export const scheduleFields = (doctors, hospitals) => [
  {
    name: 'doctorId', label: 'Doctor', type: 'select', numeric: true, required: true, full: true,
    options: doctors.map((d) => ({ value: d.doctorId, label: `${d.fullName} (${d.specializationName})` })),
  },
  {
    name: 'hospitalId', label: 'Hospital', type: 'select', numeric: true, required: true, full: true,
    options: hospitals.map((h) => ({ value: h.hospitalId, label: `${h.name}, ${h.city}` })),
  },
  { name: 'dayOfWeek', label: 'Day', type: 'select', required: true, options: options(Object.keys(DAY_NAMES), (d) => DAY_NAMES[d]) },
  { name: 'maxPatients', label: 'Max patients', type: 'number', required: true, min: 1, max: 100 },
  { name: 'startTime', label: 'Start time', type: 'time', required: true },
  { name: 'endTime', label: 'End time', type: 'time', required: true },
];

export const patientFields = [
  { name: 'firstName', label: 'First name', required: true },
  { name: 'lastName', label: 'Last name', required: true },
  { name: 'nic', label: 'NIC', required: true, placeholder: '199012345678 or 901234567V' },
  { name: 'dateOfBirth', label: 'Date of birth', type: 'date', required: true },
  { name: 'gender', label: 'Gender', type: 'select', required: true, options: options(Object.keys(GENDERS), (g) => GENDERS[g]) },
  { name: 'bloodGroup', label: 'Blood group', type: 'select', options: options(BLOOD_GROUPS, (b) => b), placeholder: 'Unknown' },
  { name: 'phone', label: 'Phone', required: true, placeholder: '0771234567' },
  { name: 'email', label: 'Email', type: 'email' },
  { name: 'address', label: 'Address', type: 'textarea', full: true },
];
