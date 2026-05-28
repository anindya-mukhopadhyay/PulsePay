import { useEffect, useMemo, useState } from 'react';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';

function walletIdOf(user) {
  return user?.walletId?._id || user?.walletId || '';
}

function formatMoney(amount) {
  return `₹${Number(amount || 0).toFixed(2)}`;
}

export default function ClientDashboard() {
  const { user } = useAuth();
  const [balance, setBalance] = useState(null);
  const [activity, setActivity] = useState({ totals: {}, serviceBreakdown: [], recentReceipts: [], recentSettlements: [] });
  const [chainTx, setChainTx] = useState([]);
  const [chainError, setChainError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const walletId = walletIdOf(user);
    if (!walletId) {
      setLoading(false);
      return;
    }

    let mounted = true;
    const load = async () => {
      try {
        const [balanceRes, activityRes, chainRes] = await Promise.all([
          api.getWalletBalance(walletId, true),
          api.getWalletActivity(walletId),
          api.getWalletOnChainTransactions(walletId, 15),
        ]);

        if (!mounted) return;
        setBalance(balanceRes.data || null);
        setActivity(activityRes.data || { totals: {}, serviceBreakdown: [], recentReceipts: [], recentSettlements: [] });
        setChainTx(chainRes.data?.transactions || []);
        setChainError(chainRes.data?.explorerError || '');
      } catch (err) {
        if (!mounted) return;
        setChainError(err.message || 'Failed to fetch wallet data');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    const timer = setInterval(load, 10000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [user]);

  const onChainBalance = useMemo(
    () => Number(balance?.onChain?.paymentAsset?.balance || 0),
    [balance]
  );

  return (
    <div className="animate-in">
      <div className="stats-grid">
        <div className="glass-card stat-card purple">
          <div className="stat-icon">💳</div>
          <div className="stat-value">{formatMoney(balance?.availableBalance || 0)}</div>
          <div className="stat-label">Wallet Available Balance (Ledger)</div>
        </div>
        <div className="glass-card stat-card cyan">
          <div className="stat-icon">⛓️</div>
          <div className="stat-value">{onChainBalance.toFixed(6)} {balance?.onChain?.paymentAsset?.symbol || ''}</div>
          <div className="stat-label">Live On-chain Balance</div>
        </div>
        <div className="glass-card stat-card blue">
          <div className="stat-icon">📜</div>
          <div className="stat-value">{activity?.totals?.totalSessions || 0}</div>
          <div className="stat-label">Completed Streaming Sessions</div>
        </div>
        <div className="glass-card stat-card orange">
          <div className="stat-icon">💸</div>
          <div className="stat-value">{formatMoney(activity?.totals?.totalAmount || 0)}</div>
          <div className="stat-label">Total Paid Across Services</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20, marginBottom: 24 }}>
        <div className="glass-card" style={{ padding: 20 }}>
          <div className="page-header" style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 18 }}>Service-wise Payments</h2>
          </div>
          {(activity?.serviceBreakdown || []).length === 0 ? (
            <div className="empty-state" style={{ padding: '24px 8px' }}>
              <div className="empty-icon">📊</div>
              <h3>{loading ? 'Loading service data...' : 'No paid sessions yet'}</h3>
            </div>
          ) : (
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Service</th>
                    <th>Sessions</th>
                    <th>Total Paid</th>
                    <th>Avg / Session</th>
                  </tr>
                </thead>
                <tbody>
                  {(activity.serviceBreakdown || []).map((item) => (
                    <tr key={item.serviceType}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{item.serviceName}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.serviceType}</div>
                      </td>
                      <td>{item.sessions}</td>
                      <td style={{ fontWeight: 700 }}>{formatMoney(item.totalAmount)}</td>
                      <td>{formatMoney(item.avgAmountPerSession)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="glass-card" style={{ padding: 20 }}>
          <div className="page-header" style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 18 }}>Wallet Account</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ padding: 12, border: '1px solid var(--border-glass)', borderRadius: 12 }}>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Primary On-chain Address</div>
              <div style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--accent-cyan)' }}>{balance?.onChainAddress || 'Not linked'}</div>
            </div>
            <div style={{ padding: 12, border: '1px solid var(--border-glass)', borderRadius: 12 }}>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Native Balance</div>
              <div style={{ fontWeight: 700 }}>
                {Number(balance?.onChain?.native?.balance || 0).toFixed(6)} {balance?.onChain?.native?.symbol || ''}
              </div>
            </div>
            <div style={{ padding: 12, border: '1px solid var(--border-glass)', borderRadius: 12 }}>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Payment Asset</div>
              <div style={{ fontWeight: 700 }}>
                {Number(balance?.onChain?.paymentAsset?.balance || 0).toFixed(6)} {balance?.onChain?.paymentAsset?.symbol || ''}
              </div>
            </div>
            {balance?.onChainError && (
              <div className="login-error" style={{ margin: 0 }}>
                {balance.onChainError}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="glass-card" style={{ padding: 20 }}>
        <div className="page-header" style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 18 }}>Recent On-chain Transactions</h2>
          <span className="badge blue">{chainTx.length} records</span>
        </div>
        {chainError && <div className="login-error">{chainError}</div>}
        {chainTx.length === 0 ? (
          <div className="empty-state" style={{ padding: '24px 8px' }}>
            <div className="empty-icon">⛓️</div>
            <h3>{loading ? 'Loading transactions...' : 'No chain transactions found for this wallet'}</h3>
          </div>
        ) : (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Status</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Tx Hash</th>
                </tr>
              </thead>
              <tbody>
                {chainTx.map((tx, index) => (
                  <tr key={`${tx.hash || 'row'}-${index}`}>
                    <td>{tx.timestamp ? new Date(tx.timestamp).toLocaleString() : '—'}</td>
                    <td><span className={`badge ${tx.status === 'ok' || tx.status === 'CONFIRMED' ? 'green' : tx.status === 'error' || tx.status === 'FAILED' ? 'red' : 'orange'}`}>{String(tx.status || 'unknown').toUpperCase()}</span></td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{tx.from ? `${tx.from.slice(0, 8)}…${tx.from.slice(-6)}` : '—'}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{tx.to ? `${tx.to.slice(0, 8)}…${tx.to.slice(-6)}` : '—'}</td>
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
    </div>
  );
}
