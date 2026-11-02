export const DAY_NAMES = {
  MON: 'Monday', TUE: 'Tuesday', WED: 'Wednesday', THU: 'Thursday', FRI: 'Friday', SAT: 'Saturday', SUN: 'Sunday',
};
export const DAYS = Object.keys(DAY_NAMES);

export const APPOINTMENT_STATUSES = ['BOOKED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];
export const PAYMENT_STATUSES = ['PENDING', 'PAID', 'REFUNDED', 'FAILED'];
export const PAYMENT_METHODS = ['CASH', 'CARD', 'ONLINE', 'INSURANCE'];
export const DOCTOR_STATUSES = ['ACTIVE', 'ON_LEAVE', 'INACTIVE'];
export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
export const GENDERS = { M: 'Male', F: 'Female', O: 'Other' };

function toDate(value) {
  const text = String(value);
  return text.length === 10 ? new Date(`${text}T00:00:00`) : new Date(text);
}

export function formatDate(value) {
  if (!value) return '-';
  return toDate(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateWithDay(value) {
  if (!value) return '-';
  return toDate(value).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(value) {
  if (!value) return '-';
  return toDate(value).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function money(value) {
  if (value === null || value === undefined) return '-';
  return `LKR ${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function number(value) {
  return value === null || value === undefined ? '-' : Number(value).toLocaleString('en-US');
}

/** "ON_LEAVE" -> "On Leave" */
export function label(value) {
  if (!value) return '-';
  return String(value).replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Local date as yyyy-mm-dd (toISOString would shift the day in Sri Lanka time). */
export function isoDate(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(iso, days) {
  const date = toDate(iso);
  date.setDate(date.getDate() + days);
  return isoDate(date);
}

export const today = () => isoDate();
