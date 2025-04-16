import React from 'react';
import PropTypes from 'prop-types';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Dashboard from './components/dashboard/Dashboard';
import LoginPage from './components/auth/LoginPage';
import AppointmentForm from './components/hrm/AppointmentForm';
import DailyAttendance from './components/gate/DailyAttendance';
import Employees from './components/hrm/Employees';
import LeaveApplicationForm from './components/hrm/LeaveApplicationForm';
import LoanApplicationForm from './components/hrm/LoanApplicationForm';
import SalaryForm from './components/hrm/SalaryForm';
import WorkersSalaryForm from './components/hrm/WorkersSalaryForm';
import FinalSettlementForm from './components/hrm/FinalSettlementForm';
import SalaryIncrementForm from './components/hrm/SalaryIncrementForm';
import PurchaseForm from './components/gate/PurchaseForm';
import PurchaseReturnForm from './components/gate/PurchaseReturnForm';
import SaleOutForm from './components/gate/SaleOutForm';
import SaleReturnForm from './components/gate/SaleReturnForm';
import StoreInForm from './components/gate/StoreInForm';
import StoreOutForm from './components/gate/StoreOutForm';
import Accounts from './components/accounts/Accounts';
import Inventory from './components/store/Inventory';
import { AuthProvider, useAuth } from './context/AuthContext';
import MaintenanceHistory from './components/maintenance/MaintenanceHistory';
import StockHistory from './components/stock/StockHistory';
import ProductionForm from './components/production/ProductionForm';
import ProductionHistory from './components/production/ProductionHistory';
import IncomeStatementForm from './components/accounts/IncomeStatementForm';
import PaymentReceived from './components/accounts/PaymentReceived';
import PaymentIssued from './components/accounts/PaymentIssued';
import PaymentHistory from './components/accounts/PaymentHistory';
import ExpenseForm from './components/accounts/ExpenseForm';
import ExpenseHistory from './components/accounts/ExpenseHistory';
import BankManager from './components/accounts/BankManager';
import SaleSummary from './components/reports/SaleSummary';
import DailyActivityReport from './components/reports/DailyActivityReport';
import ReturnsSummary from './components/reports/ReturnsSummary';
import CashFlowSummary from './components/reports/CashFlowSummary';

// Protected Route component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" />;
  }

  return <Layout>{children}</Layout>;
};

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
  allowedRoles: PropTypes.arrayOf(PropTypes.string).isRequired
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          
          {/* Protected Dashboard */}
          <Route path="/" element={
            <ProtectedRoute allowedRoles={['STORE', 'ACCOUNTS', 'DIRECTOR', 'GATE']}>
              <Dashboard />
            </ProtectedRoute>
          } />

          {/* Protected HRM Routes */}
          <Route path="/hrm/*" element={
            <ProtectedRoute allowedRoles={['ACCOUNTS', 'DIRECTOR']}>
              <Routes>
                <Route path="appointment" element={<AppointmentForm />} />
                <Route path="attendance" element={<DailyAttendance />} />
                <Route path="employees" element={<Employees />} />
                <Route path="leave-application" element={<LeaveApplicationForm />} />
                <Route path="loan-application" element={<LoanApplicationForm />} />
                <Route path="SalaryForm" element={<SalaryForm />} />
                <Route path="workers-salary" element={<WorkersSalaryForm />} />
                <Route path="final-settlement" element={<FinalSettlementForm />} />
                <Route path="salary-increment" element={<SalaryIncrementForm />} />
              </Routes>
            </ProtectedRoute>
          } />

          {/* Protected Gate Routes */}
          <Route path="/gate/*" element={
            <ProtectedRoute allowedRoles={['GATE']}>
              <Routes>
                <Route path="in/purchase" element={<PurchaseForm />} />
                <Route path="in/sale-return" element={<SaleReturnForm />} />
                <Route path="in/store" element={<StoreInForm />} />
                <Route path="out/purchase-return" element={<PurchaseReturnForm />} />
                <Route path="out/sale" element={<SaleOutForm />} />
                <Route path="out/store" element={<StoreOutForm />} />
                <Route path="attendance" element={<DailyAttendance />} />
              </Routes>
            </ProtectedRoute>
          } />

          {/* Protected Store Routes */}
          <Route path="/store/*" element={
            <ProtectedRoute allowedRoles={['STORE', 'DIRECTOR']}>
              <Routes>
                <Route path="in" element={<StoreInForm />} />
                <Route path="out" element={<StoreOutForm />} />
                <Route path="inventory" element={<Inventory />} />
              </Routes>
            </ProtectedRoute>
          } />

          {/* Protected Accounts Routes */}
          <Route path="/accounts/*" element={
            <ProtectedRoute allowedRoles={['ACCOUNTS', 'DIRECTOR', 'TAX']}>
              <Routes>
                <Route path="/" element={<Accounts />} />
                <Route path="payments/received" element={<PaymentReceived />} />
                <Route path="payments/issued" element={<PaymentIssued />} />
                <Route path="payments/history" element={<PaymentHistory />} />
                <Route path="expenses/add" element={<ExpenseForm />} />
                <Route path="expenses/history" element={<ExpenseHistory />} />
                <Route path="bank-manager" element={<BankManager />} />
              </Routes>
            </ProtectedRoute>
          } />

          {/* Protected Maintenance Routes */}
          <Route path="/maintenance/*" element={
            <ProtectedRoute allowedRoles={['DIRECTOR']}>
              <Routes>
                <Route path="history" element={<MaintenanceHistory />} />
              </Routes>
            </ProtectedRoute>
          } />

          {/* Protected Reports Routes */}
          <Route path="/reports/*" element={
            <ProtectedRoute allowedRoles={['ACCOUNTS', 'DIRECTOR']}>
              <Routes>
                <Route path="purchase-summary" element={<StockHistory />} />
                <Route path="sale-summary" element={<SaleSummary />} />
                <Route path="daily-activity" element={<DailyActivityReport />} />
                <Route path="returns-summary" element={<ReturnsSummary />} />
                <Route path="cash-flow" element={<CashFlowSummary />} />
              </Routes>
            </ProtectedRoute>
          } />

          {/* Add Production Routes */}
          <Route path="/production/*" element={
            <ProtectedRoute allowedRoles={['ACCOUNTS', 'DIRECTOR']}>
              <Routes>
                <Route path="add" element={<ProductionForm />} />
                <Route path="history" element={<ProductionHistory />} />
              </Routes>
            </ProtectedRoute>
          } />

          {/* Add Income Statement Route */}
          <Route path="/income-statement" element={
            <ProtectedRoute allowedRoles={['ACCOUNTS', 'DIRECTOR']}>
              <IncomeStatementForm />
            </ProtectedRoute>
          } />

          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App; 