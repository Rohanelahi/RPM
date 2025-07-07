import { createBrowserRouter } from 'react-router-dom';
import Dashboard from '../components/dashboard/Dashboard';
import AppointmentForm from '../components/hrm/AppointmentForm';
import DailyAttendance from '../components/hrm/DailyAttendance';
import Employees from '../components/hrm/Employees';
import Header from '../components/layout/Header';
import Sidebar from '../components/layout/Sidebar';
import LeaveApplicationForm from '../components/hrm/LeaveApplicationForm';
import LoanApplicationForm from '../components/hrm/LoanApplicationForm';
import ChartOfAccountsLevel4 from '../components/accounts/ChartOfAccountsLevel4';

const AppLayout = ({ children }) => (
  <>
    <Header />
    <Sidebar />
    {children}
  </>
);

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout><Dashboard /></AppLayout>
  },
  {
    path: '/hrm/employees',
    element: <AppLayout><Employees /></AppLayout>
  },
  {
    path: '/hrm/appointment',
    element: <AppLayout><AppointmentForm /></AppLayout>
  },
  {
    path: '/hrm/attendance',
    element: <AppLayout><DailyAttendance /></AppLayout>
  },
  {
    path: '/hrm/leave-application',
    element: <AppLayout><LeaveApplicationForm /></AppLayout>
  },
  {
    path: '/hrm/loan-application',
    element: <AppLayout><LoanApplicationForm /></AppLayout>
  },
  {
    path: '/accounts/chart/level4',
    element: <AppLayout><ChartOfAccountsLevel4 /></AppLayout>
  }
]);

export default router; 