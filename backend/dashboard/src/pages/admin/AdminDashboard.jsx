import { useState, useEffect } from 'react';
import api from '../../api';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ users: 0, stores: 0, verified: 0, pending: 0 });

  useEffect(() => {
    Promise.all([api.getUsers(), api.getStores()])
      .then(([u, s]) => {
        const stores = s.data || [];
        setStats({
          users: u.count || 0,
          stores: stores.length,
          verified: stores.filter(x => x.verificationStatus === 'VERIFIED').length,
          pending: stores.filter(x => x.verificationStatus === 'PENDING').length,
        });
      })
      .catch(() => {});
  }, []);

  return (
    <div className="animate-in">
      <div className="stats-grid">
        <div className="glass-card stat-card purple">
          <div className="stat-icon">👥</div>
          <div className="stat-value">{stats.users}</div>
          <div className="stat-label">Total Users</div>
        </div>
        <div className="glass-card stat-card blue">
          <div className="stat-icon">🏪</div>
          <div className="stat-value">{stats.stores}</div>
          <div className="stat-label">Total Stores</div>
        </div>
        <div className="glass-card stat-card green">
          <div className="stat-icon">✅</div>
          <div className="stat-value">{stats.verified}</div>
          <div className="stat-label">Verified Stores</div>
        </div>
        <div className="glass-card stat-card orange">
          <div className="stat-icon">⏳</div>
          <div className="stat-value">{stats.pending}</div>
          <div className="stat-label">Pending Verification</div>
        </div>
      </div>

      <div className="glass-card" style={{ padding: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🚀</div>
        <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Welcome to PulsePay Admin</h3>
        <p style={{ color: 'var(--text-secondary)' }}>
          Use the sidebar to manage stores, users, and monitor the platform.
        </p>
      </div>
    </div>
  );
}
