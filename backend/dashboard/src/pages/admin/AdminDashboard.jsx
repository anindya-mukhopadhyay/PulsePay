import { useEffect, useMemo, useState } from 'react';
import api from '../../api';

const SERVICE_COLORS = {
  EV: 'cyan',
  WIFI: 'blue',
  PARKING: 'orange',
  GYM: 'green',
  CONTENT: 'purple',
  COWORK: 'blue',
  LOUNGE: 'orange',
  STORAGE: 'green',
  UNKNOWN: 'red',
};

function formatMoney(amount) {
  return `₹${Number(amount || 0).toFixed(2)}`;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    users: 0,
    stores: 0,
    verifiedStores: 0,
    pendingStores: 0,
    linkedWallets: 0,
    activeSessions: 0,
    confirmedSettlements: 0,
    pendingSettlements: 0,
    totalStreamedAmount: 0,
    serviceBreakdown: [],
    chainBreakdown: [],
    recentChainTransactions: [],
    chainName: '',
    blockchainMode: '',
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await api.getAdminDashboard();
        if (!mounted) return;
        setStats((current) => ({ ...current, ...(res.data || {}) }));
      } catch (_) {
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    const timer = setInterval(load, 8000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  const totalChainFiat = useMemo(
    () => (stats.chainBreakdown || []).reduce((sum, row) => sum + Number(row.totalAmountFiat || 0), 0),
    [stats.chainBreakdown]
  );

  return (
    <div className="animate-in">
      <div className="stats-grid">
        <div className="glass-card stat-card purple">
          <div className="stat-icon">👥</div>
          <div className="stat-value">{stats.users}</div>
          <div className="stat-label">Total Clients</div>
        </div>
        <div className="glass-card stat-card blue">
          <div className="stat-icon">🏪</div>
          <div className="stat-value">{stats.stores}</div>
          <div className="stat-label">Merchant Accounts</div>
        </div>
        <div className="glass-card stat-card cyan">
          <div className="stat-icon">🔐</div>
          <div className="stat-value">{stats.linkedWallets}</div>
          <div className="stat-label">Verified Wallets</div>
        </div>
        <div className="glass-card stat-card green">
          <div className="stat-icon">🟢</div>
          <div className="stat-value">{stats.activeSessions}</div>
          <div className="stat-label">Live Sessions</div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="glass-card stat-card orange">
          <div className="stat-icon">🧾</div>
          <div className="stat-value">{formatMoney(stats.totalStreamedAmount)}</div>
          <div className="stat-label">Lifetime Streamed Value</div>
        </div>
        <div className="glass-card stat-card blue">
          <div className="stat-icon">⛓️</div>
          <div className="stat-value">{stats.confirmedSettlements}</div>
          <div className="stat-label">Confirmed On-chain Settlements</div>
        </div>
        <div className="glass-card stat-card orange">
          <div className="stat-icon">⏳</div>
          <div className="stat-value">{stats.pendingSettlements}</div>
          <div className="stat-label">Pending On-chain Settlements</div>
        </div>
        <div className="glass-card stat-card purple">
          <div className="stat-icon">🌐</div>
          <div className="stat-value">{formatMoney(totalChainFiat)}</div>
          <div className="stat-label">Chain-Indexed Volume</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20, marginBottom: 24 }}>
        <div className="glass-card" style={{ padding: 20 }}>
          <div className="page-header" style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 18 }}>Service-wise Payment Performance</h2>
            <span className="badge purple">{(stats.serviceBreakdown || []).length} types</span>
          </div>
          {(stats.serviceBreakdown || []).length === 0 ? (
            <div className="empty-state" style={{ padding: '24px 12px' }}>
              <div className="empty-icon">📊</div>
              <h3>{loading ? 'Loading analytics...' : 'No session data yet'}</h3>
            </div>
          ) : (
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Service Type</th>
                    <th>Sessions</th>
                    <th>Total</th>
                    <th>Avg / Session</th>
                  </tr>
                </thead>
                <tbody>
                  {(stats.serviceBreakdown || []).map((row) => (
                    <tr key={row.serviceType}>
                      <td><span className={`badge ${SERVICE_COLORS[row.serviceType] || 'red'}`}>{row.serviceType}</span></td>
                      <td>{row.sessions}</td>
                      <td style={{ fontWeight: 700 }}>{formatMoney(row.totalAmount)}</td>
                      <td>{formatMoney(row.avgAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="glass-card" style={{ padding: 20 }}>
          <div className="page-header" style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 18 }}>Chain Status Breakdown</h2>
            <span className="badge blue">{stats.chainName || 'Chain'}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {(stats.chainBreakdown || []).map((row, idx) => (
              <div key={`${row.chainId}-${row.status}-${idx}`} style={{ padding: 12, border: '1px solid var(--border-glass)', borderRadius: 12, background: 'rgba(255,255,255,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span className="badge blue">Chain {row.chainId}</span>
                  <span className={`badge ${row.status === 'CONFIRMED' ? 'green' : row.status === 'FAILED' ? 'red' : 'orange'}`}>{row.status}</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  {row.statusCount} txns • {formatMoney(row.totalAmountFiat)}
                </div>
              </div>
            ))}
            {(stats.chainBreakdown || []).length === 0 && (
              <div className="empty-state" style={{ padding: '24px 8px' }}>
                <div className="empty-icon">⛓️</div>
                <h3>{loading ? 'Loading chain state...' : 'No on-chain settlements yet'}</h3>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="glass-card" style={{ padding: 20 }}>
        <div className="page-header" style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 18 }}>Recent On-chain Transactions</h2>
          <span className="badge green">{stats.blockchainMode || 'offchain'}</span>
        </div>
        {(stats.recentChainTransactions || []).length === 0 ? (
          <div className="empty-state" style={{ padding: '24px 12px' }}>
            <div className="empty-icon">🔎</div>
            <h3>{loading ? 'Loading transactions...' : 'No chain transactions yet'}</h3>
          </div>
        ) : (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Service</th>
                  <th>Status</th>
                  <th>Flow</th>
                  <th>Amount</th>
                  <th>Tx Hash</th>
                </tr>
              </thead>
              <tbody>
                {(stats.recentChainTransactions || []).map((tx) => (
                  <tr key={tx._id}>
                    <td>{new Date(tx.createdAt).toLocaleString()}</td>
                    <td>
                      <div>{tx.serviceName || 'Streaming utility'}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{tx.serviceType || 'UNKNOWN'}</div>
                    </td>
                    <td><span className={`badge ${tx.status === 'CONFIRMED' ? 'green' : tx.status === 'FAILED' ? 'red' : 'orange'}`}>{tx.status}</span></td>
                    <td><span className="badge blue">{tx.flowType}</span></td>
                    <td style={{ fontWeight: 700 }}>{formatMoney(tx.amountFiat)}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>
                      {tx.transactionHash ? (
                        <a href={tx.explorerUrl} target="_blank" rel="noreferrer">{`${tx.transactionHash.slice(0, 10)}…${tx.transactionHash.slice(-8)}`}</a>
                      ) : (
                        tx.userOperationHash ? `${tx.userOperationHash.slice(0, 10)}…` : '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
