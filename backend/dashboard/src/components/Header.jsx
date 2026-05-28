import { useAuth } from '../context/AuthContext';

export default function Header({ title, subtitle }) {
  const { user, role } = useAuth();
  const initial = role === 'admin'
    ? 'A'
    : role === 'owner'
      ? (user?.storeName?.[0] || 'O')
      : (user?.fullName?.[0] || 'C');
  const name = role === 'admin' ? 'Admin' : role === 'owner' ? (user?.storeName || 'Owner') : (user?.fullName || 'Client');

  return (
    <header className="header">
      <div className="header-title">
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <div className="header-user">
        <div className="avatar">{initial}</div>
        <span className="user-name">{name}</span>
      </div>
    </header>
  );
}
