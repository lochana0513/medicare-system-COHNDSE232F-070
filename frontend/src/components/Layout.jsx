import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import Icon from './Icon.jsx';
import { getUser, setUser } from '../api/client.js';
import { formatDateWithDay, today } from '../utils/format.js';

const NAV = [
  { to: '/', label: 'Dashboard', icon: 'dashboard', end: true },
  { to: '/appointments', label: 'Appointments', icon: 'calendar' },
  { to: '/patients', label: 'Patients', icon: 'users' },
  { to: '/consultations', label: 'Consultations', icon: 'clipboard' },
  { to: '/payments', label: 'Payments', icon: 'card' },
  { section: 'Management' },
  { to: '/doctors', label: 'Doctors', icon: 'doctor' },
  { to: '/specializations', label: 'Specializations', icon: 'tag' },
  { to: '/hospitals', label: 'Hospitals', icon: 'hospital' },
  { to: '/schedules', label: 'Doctor Schedules', icon: 'clock' },
  { section: 'Analysis' },
  { to: '/reports', label: 'Reports', icon: 'chart' },
];

const USERS = ['RECEPTION', 'DOCTOR', 'ADMIN'];

export default function Layout() {
  const [user, setCurrentUser] = useState(getUser());

  const changeUser = (value) => {
    setUser(value);
    setCurrentUser(value);
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">+</span>
          <div>
            <strong>MediCare</strong>
            <small>Appointment System</small>
          </div>
        </div>
        <nav>
          {NAV.map((item) =>
            item.section ? (
              <div key={item.section} className="nav-section">{item.section}</div>
            ) : (
              <NavLink key={item.to} to={item.to} end={item.end}
                       className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                <Icon name={item.icon} />
                <span>{item.label}</span>
              </NavLink>
            ),
          )}
        </nav>
      </aside>

      <div className="main">
        <header className="topbar">
          <span className="topbar-date">{formatDateWithDay(today())}</span>
          <label className="topbar-user">
            Signed in as
            <select value={user} onChange={(e) => changeUser(e.target.value)}>
              {USERS.map((u) => <option key={u} value={u}>{u.charAt(0) + u.slice(1).toLowerCase()}</option>)}
            </select>
          </label>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
