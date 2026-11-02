const BASE_URL = import.meta.env.VITE_API_URL || '/api';
const USER_KEY = 'medicare.user';

export class ApiError extends Error {
  constructor(status, message, fieldErrors) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors || {};
  }
}

/** Name sent in the X-User header; the database stores it in the appointment audit trail. */
export function getUser() {
  try {
    return localStorage.getItem(USER_KEY) || 'RECEPTION';
  } catch {
    return 'RECEPTION';
  }
}

export function setUser(user) {
  try {
    localStorage.setItem(USER_KEY, user);
  } catch {
    // storage unavailable: keep the default
  }
}

function toQuery(params) {
  if (!params) return '';
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.append(key, value);
  });
  const text = query.toString();
  return text ? `?${text}` : '';
}

async function request(method, path, body) {
  let response;
  try {
    response = await fetch(BASE_URL + path, {
      method,
      headers: { 'Content-Type': 'application/json', 'X-User': getUser() },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Please check that the backend is running.');
  }

  if (response.status === 204) return null;
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new ApiError(response.status, data?.message || `Request failed (${response.status})`, data?.fieldErrors);
  }
  return data;
}

export const api = {
  get: (path, params) => request('GET', path + toQuery(params)),
  post: (path, body) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
  patch: (path, body) => request('PATCH', path, body),
  del: (path) => request('DELETE', path),
};
