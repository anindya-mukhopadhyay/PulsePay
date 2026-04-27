import { useState, useEffect } from 'react';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';

export default function SessionHistory() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !user.walletId) {
      setLoading(false);
      return;
    }
    // Note: getSessionHistory takes userWalletId, we might need to adjust backend or use transactions
    // For owner, looking at their wallet transactions is the most accurate ledger of earnings
    api.getTransactions(user.walletId._id || user.walletId)
      .then(r => setSessions(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  return (
    <div className="animate-in">
      <div className="page-header">
        <h2>Earnings History</h2>
      </div>

      {loading ? (
        <div className="empty-state"><div className="empty-icon">⏳</div><h3>Loading…</h3></div>
      ) : sessions.length === 0 ? (
        <div className="empty-state"><div className="empty-icon">📜</div><h3>No transactions yet</h3></div>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Balance After</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map(t => (
                <tr key={t._id}>
                  <td>{new Date(t.timestamp).toLocaleString()}</td>
                  <td>
                    <span className={`badge ${t.direction === 'CREDIT' ? 'green' : 'red'}`}>
                      {t.reason.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600, color: t.direction === 'CREDIT' ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                    {t.direction === 'CREDIT' ? '+' : '-'}₹{t.amount.toFixed(6)}
                  </td>
                  <td style={{ fontFamily: 'monospace' }}>
                    ₹{t.balanceAfter.toFixed(6)}
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
