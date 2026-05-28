import { useEffect, useState } from 'react';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';

function walletIdOf(user) {
  return user?.walletId?._id || user?.walletId || '';
}

function formatMoney(amount) {
  return `₹${Number(amount || 0).toFixed(2)}`;
}

export default function SessionHistory() {
  const { user } = useAuth();
  const walletId = walletIdOf(user);
  const [ledger, setLedger] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!walletId) {
      setLoading(false);
      return;
    }

    let mounted = true;
    const load = async () => {
      try {
        const walletAddress = user?.walletId?.smartAccountAddress || user?.walletId?.evmAddress || '';
        const [ledgerRes, receiptRes, settlementRes] = await Promise.all([
          api.getTransactions(walletId, 100),
          api.getReceipts(`walletId=${walletId}&limit=50`),
          walletAddress ? api.getSettlements(`walletAddress=${walletAddress}&limit=50`) : Promise.resolve({ data: [] }),
        ]);

        if (!mounted) return;
        setLedger(ledgerRes.data || []);
        setReceipts(receiptRes.data || []);
        setSettlements(settlementRes.data || []);
      } catch (_) {
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [walletId, user?.walletId?.evmAddress]);

  return (
    <div className="animate-in">
      <div className="page-header">
        <h2>Settlement & Earnings History</h2>
      </div>

      {loading ? (
        <div className="empty-state"><div className="empty-icon">⏳</div><h3>Loading records…</h3></div>
      ) : (
        <>
          <div className="glass-card" style={{ padding: 20, marginBottom: 20 }}>
            <div className="page-header" style={{ marginBottom: 12 }}>
              <h2 style={{ fontSize: 18 }}>Ledger Entries</h2>
              <span className="badge blue">{ledger.length}</span>
            </div>
            {ledger.length === 0 ? (
              <div className="empty-state" style={{ padding: '24px 8px' }}>
                <div className="empty-icon">📜</div>
                <h3>No ledger entries yet</h3>
              </div>
            ) : (
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Reason</th>
                      <th>Direction</th>
                      <th>Amount</th>
                      <th>Balance After</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.map((item) => (
                      <tr key={item._id}>
                        <td>{new Date(item.timestamp).toLocaleString()}</td>
                        <td>{item.reason.replace(/_/g, ' ')}</td>
                        <td><span className={`badge ${item.direction === 'CREDIT' ? 'green' : 'red'}`}>{item.direction}</span></td>
                        <td style={{ fontWeight: 700 }}>{item.direction === 'CREDIT' ? '+' : '-'}{formatMoney(item.amount)}</td>
                        <td>{formatMoney(item.balanceAfter)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div className="glass-card" style={{ padding: 20 }}>
              <div className="page-header" style={{ marginBottom: 12 }}>
                <h2 style={{ fontSize: 18 }}>Receipts</h2>
                <span className="badge purple">{receipts.length}</span>
              </div>
              {receipts.length === 0 ? (
                <div className="empty-state" style={{ padding: '24px 8px' }}>
                  <div className="empty-icon">🧾</div>
                  <h3>No receipts yet</h3>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 420, overflowY: 'auto' }}>
                  {receipts.map((item) => (
                    <div key={item._id} style={{ padding: 12, border: '1px solid var(--border-glass)', borderRadius: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div style={{ fontWeight: 700 }}>{item.invoiceNumber}</div>
                        <span className={`badge ${item.status === 'PAID' ? 'green' : item.status === 'FAILED' ? 'red' : 'orange'}`}>{item.status}</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{item.serviceId?.name || 'Streaming utility'}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{new Date(item.createdAt).toLocaleString()}</div>
                      <div style={{ marginTop: 4, fontWeight: 700 }}>{formatMoney(item.amount)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="glass-card" style={{ padding: 20 }}>
              <div className="page-header" style={{ marginBottom: 12 }}>
                <h2 style={{ fontSize: 18 }}>On-chain Settlements</h2>
                <span className="badge blue">{settlements.length}</span>
              </div>
              {settlements.length === 0 ? (
                <div className="empty-state" style={{ padding: '24px 8px' }}>
                  <div className="empty-icon">⛓️</div>
                  <h3>No settlements yet</h3>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 420, overflowY: 'auto' }}>
                  {settlements.map((item) => (
                    <div key={item._id} style={{ padding: 12, border: '1px solid var(--border-glass)', borderRadius: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span className={`badge ${item.status === 'CONFIRMED' ? 'green' : item.status === 'FAILED' ? 'red' : 'orange'}`}>{item.status}</span>
                        <span className="badge blue">{item.flowType}</span>
                      </div>
                      <div style={{ marginTop: 6, fontWeight: 700 }}>{formatMoney(item.amountFiat)}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        {item.transactionHash ? (
                          <a href={item.explorerUrl} target="_blank" rel="noreferrer">{`${item.transactionHash.slice(0, 10)}…${item.transactionHash.slice(-8)}`}</a>
                        ) : (
                          item.userOperationHash ? `${item.userOperationHash.slice(0, 10)}…` : 'No tx hash'
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{new Date(item.createdAt).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
