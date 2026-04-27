import { useState, useEffect } from 'react';
import api from '../../api';

const STATUS_BADGE = { VERIFIED: 'green', PENDING: 'orange', REJECTED: 'red' };
const TYPE_BADGE = { GYM: 'purple', EV: 'cyan', WIFI: 'blue', PARKING: 'green' };

export default function ManageStores() {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const load = () => {
    setLoading(true);
    api.getStores(filter ? `verificationStatus=${filter}` : '')
      .then(r => setStores(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, [filter]);

  const handleVerify = async (id, status) => {
    try { await api.verifyStore(id, status); load(); } catch {}
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this store?')) return;
    try { await api.deleteStore(id); load(); } catch {}
  };

  return (
    <div className="animate-in">
      <div className="page-header">
        <h2>Stores ({stores.length})</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          {['', 'PENDING', 'VERIFIED', 'REJECTED'].map(f => (
            <button key={f} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setFilter(f)}>
              {f || 'All'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="empty-state"><div className="empty-icon">⏳</div><h3>Loading…</h3></div>
      ) : stores.length === 0 ? (
        <div className="empty-state"><div className="empty-icon">🏪</div><h3>No stores found</h3></div>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Store</th><th>Owner</th><th>Type</th><th>Status</th>
                <th>Wallet</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {stores.map(s => (
                <tr key={s._id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{s.storeName}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.email}</div>
                  </td>
                  <td>{s.ownerName}</td>
                  <td><span className={`badge ${TYPE_BADGE[s.storeType] || 'blue'}`}>{s.storeType}</span></td>
                  <td><span className={`badge ${STATUS_BADGE[s.verificationStatus] || 'orange'}`}>{s.verificationStatus}</span></td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>
                    {s.walletId?.evmAddress ? `${s.walletId.evmAddress.slice(0, 8)}…` : '—'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {s.verificationStatus === 'PENDING' && (
                        <>
                          <button className="btn btn-success btn-sm" onClick={() => handleVerify(s._id, 'VERIFIED')}>✅</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleVerify(s._id, 'REJECTED')}>❌</button>
                        </>
                      )}
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(s._id)}>🗑️</button>
                    </div>
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
