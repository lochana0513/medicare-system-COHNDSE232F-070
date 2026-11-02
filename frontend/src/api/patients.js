import { api } from './client.js';

export const patientApi = {
  list: (q) => api.get('/patients', { q }),
  get: (id) => api.get(`/patients/${id}`),
  appointments: (id) => api.get(`/patients/${id}/appointments`),
  history: (id) => api.get(`/patients/${id}/history`),
  register: (data) => api.post('/patients', data),
  update: (id, data) => api.put(`/patients/${id}`, data),
  remove: (id) => api.del(`/patients/${id}`),
};
