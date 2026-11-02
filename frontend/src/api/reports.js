import { api } from './client.js';

export const reportApi = {
  dashboard: () => api.get('/dashboard'),
  monthlyRevenue: ({ year }) => api.get('/reports/monthly-revenue', { year }),
  doctorPerformance: ({ from, to }) => api.get('/reports/doctor-performance', { from, to }),
  specializationDemand: ({ from, to }) => api.get('/reports/specialization-demand', { from, to }),
  sessionOccupancy: ({ from, to }) => api.get('/reports/session-occupancy', { from, to }),
  patientHistory: ({ patientId }) => api.get(`/reports/patient-history/${patientId}`),
  outstandingPayments: () => api.get('/reports/outstanding-payments'),
  followupsDue: ({ days }) => api.get('/reports/followups-due', { days }),
};
