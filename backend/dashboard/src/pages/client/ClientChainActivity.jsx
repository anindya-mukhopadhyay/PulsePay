import { useEffect, useState } from 'react';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';

function walletIdOf(user) {
  return user?.walletId?._id || user?.walletId || '';
}

export default function ClientChainActivity() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const walletId = walletIdOf(user);
    if (!walletId) {
      setLoading(false);
      return;
    }

    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const [txRes, receiptRes] = await Promise.all([
          api.getWalletOnChainTransactions(walletId, 50),
          api.getReceipts(`walletId=${walletId}&limit=50`),
        ]);

        if (!mounted) return;
        setTransactions(txRes.data?.transactions || []);
        setReceipts(receiptRes.data || []);
        setError(txRes.data?.explorerError || '');
      } catch (err) {
        if (!mounted) return;
        setError(err.message || 'Failed to load chain activity');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [user]);

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h2>Chain Activity & Receipts</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Every settled stream and digital invoice in one place</p>
        </div>
      </div>

      {error && <div className="login-error">{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 20 }}>
        <div className="glass-card" style={{ padding: 20 }}>
          <div className="page-header" style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 18 }}>On-chain Transactions</h2>
            <span className="badge blue">{transactions.length}</span>
          </div>
          {loading ? (
            <div className="empty-state" style={{ padding: '24px 8px' }}>
              <div className="empty-icon">⏳</div>
              <h3>Loading chain data...</h3>
            </div>
          ) : transactions.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px 8px' }}>
              <div className="empty-icon">⛓️</div>
              <h3>No chain transactions yet</h3>
            </div>
          ) : (
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Status</th>
                    <th>Method</th>
                    <th>Tx Hash</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx, index) => (
                    <tr key={`${tx.hash || index}-${index}`}>
                      <td>{tx.timestamp ? new Date(tx.timestamp).toLocaleString() : '—'}</td>
                      <td><span className={`badge ${tx.status === 'ok' || tx.status === 'CONFIRMED' ? 'green' : tx.status === 'error' || tx.status === 'FAILED' ? 'red' : 'orange'}`}>{String(tx.status || 'unknown').toUpperCase()}</span></td>
                      <td>{tx.method || 'transfer'}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: 12 }}>
                        {tx.hash ? (
                          <a href={tx.explorerUrl} target="_blank" rel="noreferrer">{`${tx.hash.slice(0, 10)}…${tx.hash.slice(-8)}`}</a>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="glass-card" style={{ padding: 20 }}>
          <div className="page-header" style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 18 }}>Invoices & Receipts</h2>
            <span className="badge purple">{receipts.length}</span>
          </div>
          {loading ? (
            <div className="empty-state" style={{ padding: '24px 8px' }}>
              <div className="empty-icon">⏳</div>
              <h3>Loading receipts...</h3>
            </div>
          ) : receipts.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px 8px' }}>
              <div className="empty-icon">🧾</div>
              <h3>No receipts yet</h3>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 520, overflowY: 'auto' }}>
              {receipts.map((receipt) => (
                <div key={receipt._id} style={{ padding: 12, border: '1px solid var(--border-glass)', borderRadius: 12, background: 'rgba(255,255,255,0.02)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontWeight: 700 }}>{receipt.invoiceNumber}</span>
                    <span className={`badge ${receipt.status === 'PAID' ? 'green' : receipt.status === 'FAILED' ? 'red' : 'orange'}`}>{receipt.status}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {receipt.serviceId?.name || 'Streaming utility'} • {receipt.serviceId?.serviceType || 'UNKNOWN'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {new Date(receipt.createdAt).toLocaleString()}
                  </div>
                  <div style={{ marginTop: 4, fontWeight: 700 }}>₹{Number(receipt.amount || 0).toFixed(2)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
