import { useAuth } from '../context/AuthContext';

export default function Header({ title, subtitle }) {
  const { user, role } = useAuth();
  const initial = role === 'admin' ? 'A' : (user?.storeName?.[0] || 'O');
  const name = role === 'admin' ? 'Admin' : (user?.storeName || 'Owner');

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
