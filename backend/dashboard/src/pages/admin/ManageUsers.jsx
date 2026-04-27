import { useState, useEffect } from 'react';
import api from '../../api';

export default function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getUsers()
      .then(r => setUsers(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="animate-in">
      <div className="page-header">
        <h2>Users ({users.length})</h2>
      </div>

      {loading ? (
        <div className="empty-state"><div className="empty-icon">⏳</div><h3>Loading…</h3></div>
      ) : users.length === 0 ? (
        <div className="empty-state"><div className="empty-icon">👥</div><h3>No users yet</h3></div>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th><th>Email</th><th>Phone</th>
                <th>Status</th><th>KYC</th><th>Balance</th><th>EVM Address</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u._id}>
                  <td style={{ fontWeight: 600 }}>{u.fullName}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
                  <td>{u.phone || '—'}</td>
                  <td>
                    <span className={`badge ${u.status === 'ACTIVE' ? 'green' : 'red'}`}>{u.status}</span>
                  </td>
                  <td>
                    <span className={`badge ${u.kycLevel === 'VERIFIED' ? 'green' : 'blue'}`}>{u.kycLevel}</span>
                  </td>
                  <td style={{ fontWeight: 600 }}>
                    ₹{(u.walletId?.balance || 0).toFixed(2)}
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>
                    {u.walletId?.evmAddress ? `${u.walletId.evmAddress.slice(0, 10)}…` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
