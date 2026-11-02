import { api } from './client.js';

export const appointmentApi = {
  list: (params) => api.get('/appointments', params),
  get: (id) => api.get(`/appointments/${id}`),
  audit: (id) => api.get(`/appointments/${id}/audit`),
  book: (data) => api.post('/appointments', data),
  confirm: (id) => api.post(`/appointments/${id}/confirm`),
  cancel: (id) => api.post(`/appointments/${id}/cancel`),
  pay: (id, paymentMethod) => api.post(`/appointments/${id}/payment`, { paymentMethod }),
  recordConsultation: (id, data) => api.post(`/appointments/${id}/consultation`, data),
  markNoShows: () => api.post('/appointments/mark-no-shows'),
};

export const consultationApi = {
  list: (params) => api.get('/consultations', params),
  get: (id) => api.get(`/consultations/${id}`),
  addItem: (id, data) => api.post(`/consultations/${id}/items`, data),
  removeItem: (id, itemId) => api.del(`/consultations/${id}/items/${itemId}`),
};

export const paymentApi = {
  list: (params) => api.get('/payments', params),
};
