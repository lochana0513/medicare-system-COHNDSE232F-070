import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import { ToastProvider } from './components/Toast.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Appointments from './pages/Appointments.jsx';
import BookAppointment from './pages/BookAppointment.jsx';
import AppointmentDetail from './pages/AppointmentDetail.jsx';
import Patients from './pages/Patients.jsx';
import PatientDetail from './pages/PatientDetail.jsx';
import Doctors from './pages/Doctors.jsx';
import Specializations from './pages/Specializations.jsx';
import Hospitals from './pages/Hospitals.jsx';
import Schedules from './pages/Schedules.jsx';
import Consultations from './pages/Consultations.jsx';
import Payments from './pages/Payments.jsx';
import Reports from './pages/Reports.jsx';

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="appointments" element={<Appointments />} />
          <Route path="appointments/new" element={<BookAppointment />} />
          <Route path="appointments/:id" element={<AppointmentDetail />} />
          <Route path="patients" element={<Patients />} />
          <Route path="patients/:id" element={<PatientDetail />} />
          <Route path="doctors" element={<Doctors />} />
          <Route path="specializations" element={<Specializations />} />
          <Route path="hospitals" element={<Hospitals />} />
          <Route path="schedules" element={<Schedules />} />
          <Route path="consultations" element={<Consultations />} />
          <Route path="payments" element={<Payments />} />
          <Route path="reports" element={<Reports />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </ToastProvider>
  );
}
