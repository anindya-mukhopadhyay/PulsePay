import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [tab, setTab] = useState('admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { loginAdmin, loginOwner, loginClient } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (tab === 'admin') {
        await loginAdmin(email, password);
        navigate('/admin');
      } else if (tab === 'owner') {
        await loginOwner(email, password);
        navigate('/owner');
      } else {
        await loginClient(email, password);
        navigate('/client');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card glass-card animate-in">
        <div className="login-brand">
          <div className="brand-logo">⚡</div>
          <h1>PulsePay</h1>
          <p>Streaming Payment Dashboard</p>
        </div>

        <div className="login-tabs">
          <button className={`login-tab ${tab === 'admin' ? 'active' : ''}`} onClick={() => { setTab('admin'); setError(''); }}>
            🛡️ Admin
          </button>
          <button className={`login-tab ${tab === 'owner' ? 'active' : ''}`} onClick={() => { setTab('owner'); setError(''); }}>
            🏪 Store Owner
          </button>
          <button className={`login-tab ${tab === 'client' ? 'active' : ''}`} onClick={() => { setTab('client'); setError(''); }}>
            👤 Client
          </button>
        </div>

        {error && <div className="login-error">⚠️ {error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              className="form-input"
              type="email"
              placeholder={tab === 'admin' ? 'admin@pulsepay.local' : tab === 'owner' ? 'store@example.com' : 'user@example.com'}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input className="form-input" type="password" placeholder="Enter password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button className="btn btn-primary" type="submit" style={{ width: '100%', marginTop: 8 }} disabled={loading}>
            {loading ? '⏳ Signing in…' : `Sign in as ${tab === 'admin' ? 'Admin' : tab === 'owner' ? 'Store Owner' : 'Client'}`}
          </button>
        </form>
      </div>
    </div>
  );
}
