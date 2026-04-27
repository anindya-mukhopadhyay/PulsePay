import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import ManageStores from './pages/admin/ManageStores';
import ManageUsers from './pages/admin/ManageUsers';
import OwnerDashboard from './pages/owner/OwnerDashboard';
import MyServices from './pages/owner/MyServices';
import ServiceQR from './pages/owner/ServiceQR';
import SessionHistory from './pages/owner/SessionHistory';
import Sidebar from './components/Sidebar';
import Header from './components/Header';

function ProtectedRoute({ children, allowedRole }) {
  const { user, role } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRole && role !== allowedRole) return <Navigate to="/login" replace />;
  return children;
}

function DashboardLayout({ children, title, subtitle }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-area">
        <Header title={title} subtitle={subtitle} />
        <div className="page-content">{children}</div>
      </div>
    </div>
  );
}

export default function App() {
  const { user, role } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={role === 'admin' ? '/admin' : '/owner'} replace /> : <LoginPage />} />

      {/* Admin Routes */}
      <Route path="/admin" element={<ProtectedRoute allowedRole="admin"><DashboardLayout title="Dashboard" subtitle="Platform overview"><AdminDashboard /></DashboardLayout></ProtectedRoute>} />
      <Route path="/admin/stores" element={<ProtectedRoute allowedRole="admin"><DashboardLayout title="Manage Stores" subtitle="Verify and manage store accounts"><ManageStores /></DashboardLayout></ProtectedRoute>} />
      <Route path="/admin/users" element={<ProtectedRoute allowedRole="admin"><DashboardLayout title="Manage Users" subtitle="View all registered users"><ManageUsers /></DashboardLayout></ProtectedRoute>} />

      {/* Owner Routes */}
      <Route path="/owner" element={<ProtectedRoute allowedRole="owner"><DashboardLayout title="Dashboard" subtitle="Your store overview"><OwnerDashboard /></DashboardLayout></ProtectedRoute>} />
      <Route path="/owner/services" element={<ProtectedRoute allowedRole="owner"><DashboardLayout title="My Services" subtitle="Manage services & QR codes"><MyServices /></DashboardLayout></ProtectedRoute>} />
      <Route path="/owner/services/:qrCodeId/qr" element={<ProtectedRoute allowedRole="owner"><DashboardLayout title="Service QR Code" subtitle="Display or print this QR"><ServiceQR /></DashboardLayout></ProtectedRoute>} />
      <Route path="/owner/sessions" element={<ProtectedRoute allowedRole="owner"><DashboardLayout title="Session History" subtitle="View earnings & session logs"><SessionHistory /></DashboardLayout></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
