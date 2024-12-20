import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Dashboard from './components/dashboard/Dashboard';
import AppointmentForm from './components/hrm/AppointmentForm';
import DailyAttendance from './components/hrm/DailyAttendance';
import Employees from './components/hrm/Employees';
import LeaveApplicationForm from './components/hrm/LeaveApplicationForm';
import LoanApplicationForm from './components/hrm/LoanApplicationForm';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/hrm/appointment" element={<AppointmentForm />} />
          <Route path="/hrm/attendance" element={<DailyAttendance />} />
          <Route path="/hrm/employees" element={<Employees />} />
          <Route path="/hrm/leave-application" element={<LeaveApplicationForm />} />
          <Route path="/hrm/loan-application" element={<LoanApplicationForm />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App; 