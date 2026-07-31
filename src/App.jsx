import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import { ErrorBoundary } from './components/ErrorBoundary';

import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Freelancers from './pages/Freelancers';
import Services from './pages/Services';
import Engagements from './pages/Engagements';
import Invoices from './pages/Invoices';
import Fees from './pages/Fees';
import Expenses from './pages/Expenses';
import PayrollAnalytics from './pages/PayrollAnalytics';
import Receivables from './pages/Receivables';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route path="/" element={
        <ProtectedRoute>
          <ErrorBoundary>
            <Layout />
          </ErrorBoundary>
        </ProtectedRoute>
      }>
        <Route index element={<Dashboard />} />
        <Route path="clients" element={<Clients />} />
        <Route path="freelancers" element={<Freelancers />} />
        <Route path="services" element={<Services />} />
        <Route path="engagements" element={<Engagements />} />
        <Route path="invoices" element={<Invoices />} />
        <Route path="fees" element={<Fees />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="receivables" element={<Receivables />} />
        <Route path="payroll-analytics" element={<PayrollAnalytics />} />
      </Route>
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
