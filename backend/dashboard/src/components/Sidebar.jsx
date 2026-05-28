import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Sidebar() {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  const adminNav = [
    { to: '/admin', icon: '📊', label: 'Dashboard' },
    { to: '/admin/chain', icon: '⛓️', label: 'Chain Txns' },
    { to: '/admin/stores', icon: '🏪', label: 'Manage Stores' },
    { to: '/admin/users', icon: '👥', label: 'Manage Users' },
  ];

  const ownerNav = [
    { to: '/owner', icon: '📊', label: 'Dashboard' },
    { to: '/owner/services', icon: '⚡', label: 'My Services' },
    { to: '/owner/sessions', icon: '📜', label: 'Session History' },
  ];

  const clientNav = [
    { to: '/client', icon: '💳', label: 'My Wallet' },
    { to: '/client/chain', icon: '⛓️', label: 'Chain Activity' },
  ];

  const navItems = role === 'admin' ? adminNav : role === 'owner' ? ownerNav : clientNav;

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-icon">P</div>
        <div>
          <h1>PulsePay</h1>
          <span className="role-badge">{role}</span>
        </div>
      </div>

      <div className="sidebar-section">Navigation</div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/admin' || item.to === '/owner'}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>
          {role === 'admin' ? user?.email : role === 'owner' ? user?.storeName : user?.email}
        </div>
        <button className="btn btn-ghost btn-sm" style={{ width: '100%' }} onClick={handleLogout}>
          🚪 Logout
        </button>
      </div>
    </aside>
  );
}
