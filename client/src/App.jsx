import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Dashboard from './components/dashboard/Dashboard';
import AppointmentForm from './components/hrm/AppointmentForm';
import DailyAttendance from './components/hrm/DailyAttendance';
import Employees from './components/hrm/Employees';
import LeaveApplicationForm from './components/hrm/LeaveApplicationForm';
import LoanApplicationForm from './components/hrm/LoanApplicationForm';
import SalaryForm from './components/hrm/SalaryForm';
import WorkersSalaryForm from './components/hrm/WorkersSalaryForm';
import FinalSettlementForm from './components/hrm/FinalSettlementForm';
import SalaryIncrementForm from './components/hrm/SalaryIncrementForm';

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
          <Route path="/hrm/SalaryForm" element={<SalaryForm />} />
          <Route path="/hrm/workers-salary" element={<WorkersSalaryForm />} />
          <Route path="/hrm/final-settlement" element={<FinalSettlementForm />} />
          <Route path="/hrm/salary-increment" element={<SalaryIncrementForm />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App; 