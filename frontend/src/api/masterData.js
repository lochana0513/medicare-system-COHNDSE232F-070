import { api } from './client.js';

export const specializationApi = {
  list: () => api.get('/specializations'),
  create: (data) => api.post('/specializations', data),
  update: (id, data) => api.put(`/specializations/${id}`, data),
  remove: (id) => api.del(`/specializations/${id}`),
};

export const hospitalApi = {
  list: (params) => api.get('/hospitals', params),
  create: (data) => api.post('/hospitals', data),
  update: (id, data) => api.put(`/hospitals/${id}`, data),
  remove: (id) => api.del(`/hospitals/${id}`),
};

export const doctorApi = {
  list: (params) => api.get('/doctors', params),
  get: (id) => api.get(`/doctors/${id}`),
  create: (data) => api.post('/doctors', data),
  update: (id, data) => api.put(`/doctors/${id}`, data),
  setStatus: (id, status) => api.patch(`/doctors/${id}/status`, { status }),
  remove: (id) => api.del(`/doctors/${id}`),
};

export const scheduleApi = {
  list: (params) => api.get('/schedules', params),
  get: (id) => api.get(`/schedules/${id}`),
  sessions: (id, weeks = 6) => api.get(`/schedules/${id}/sessions`, { weeks }),
  create: (data) => api.post('/schedules', data),
  update: (id, data) => api.put(`/schedules/${id}`, data),
  remove: (id) => api.del(`/schedules/${id}`),
};
