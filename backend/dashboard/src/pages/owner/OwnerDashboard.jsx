import { useState, useEffect } from 'react';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';

export default function OwnerDashboard() {
  const { user } = useAuth();
  const [services, setServices] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [activeSessions, setActiveSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let isMounted = true;
    
    const fetchStats = async () => {
      try {
        const [srvRes, walRes] = await Promise.all([
          api.getStoreServices(user._id),
          user.walletId ? api.getWallet(`${user.walletId._id || user.walletId}?t=${Date.now()}`) : Promise.resolve({ data: null })
        ]);
        
        if (!isMounted) return;
        setServices(srvRes.data || []);
        setWallet(walRes.data);
        
        // Also fetch active sessions for the "Live Monitor"
        // Note: In a real app, this would be a single dashboard stats endpoint
        const activeRes = await api.getSessionsByStore?.(user._id) || { data: [] };
        if (isMounted) setActiveSessions(activeRes.data || []);
        
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 2000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [user]);

  return (
    <div className="animate-in">
      <div className="page-header" style={{ marginBottom: 32 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800 }}>Command Center</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Real-time overview of your PulsePay network</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="badge purple" style={{ padding: '6px 12px' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff', marginRight: 8, display: 'inline-block', boxShadow: '0 0 10px #fff' }}></span>
            Live Monitoring Active
          </div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="glass-card stat-card purple" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.15) 0%, rgba(6,8,26,0.5) 100%)' }}>
          <div className="stat-icon">💰</div>
          <div className="stat-value" style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{ fontSize: 18, fontWeight: 500, color: 'var(--text-secondary)' }}>₹</span>
            <span className="pulse-text">{(wallet?.balance || 0).toFixed(2)}</span>
          </div>
          <div className="stat-label">Total Revenue Settled</div>
        </div>
        
        <div className="glass-card stat-card blue">
          <div className="stat-icon">⚡</div>
          <div className="stat-value">{services.length}</div>
          <div className="stat-label">Configured Services</div>
        </div>

        <div className="glass-card stat-card green">
          <div className="stat-icon">🟢</div>
          <div className="stat-value">{activeSessions.length || 0}</div>
          <div className="stat-label">Active Connections</div>
        </div>

        <div className="glass-card stat-card orange">
          <div className="stat-icon">📅</div>
          <div className="stat-value">₹{(wallet?.balance * 0.12 || 0).toFixed(2)}</div>
          <div className="stat-label">Today's Earnings (Est.)</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 24, marginBottom: 32 }}>
        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700 }}>Live Activity Monitor</h3>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Updating every 2s</span>
          </div>
          
          {activeSessions.length === 0 ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.3 }}>📡</div>
              <p>Waiting for incoming connections...</p>
              <p style={{ fontSize: 12 }}>Scan a QR code from the iOS app to see it here.</p>
            </div>
          ) : (
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>User / Device</th>
                    <th>Service</th>
                    <th>Duration</th>
                    <th>Accrued</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {activeSessions.map(s => (
                    <tr key={s._id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="avatar" style={{ width: 28, height: 28, fontSize: 10 }}>U</div>
                          <span style={{ fontWeight: 600 }}>{String(s.userWalletId || '').slice(-6) || 'Guest'}</span>
                        </div>
                      </td>
                      <td>{s.serviceId?.name || 'Utility'}</td>
                      <td>{Math.floor((Date.now() - new Date(s.startedAt)) / 1000)}s</td>
                      <td style={{ color: 'var(--accent-green)', fontWeight: 700 }}>₹{s.totalAmountTransferred.toFixed(4)}</td>
                      <td><span className="badge green">Streaming</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="glass-card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Account Details</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', paddingBottom: 12 }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Store Name</span>
              <span style={{ fontWeight: 600 }}>{user?.storeName}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', paddingBottom: 12 }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Owner</span>
              <span style={{ fontWeight: 600 }}>{user?.ownerName}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', paddingBottom: 12 }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Business Type</span>
              <span className="badge blue">{user?.storeType || 'Utility'}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>EVM Settlement Address</span>
              <div style={{ 
                padding: '10px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: 8, 
                fontFamily: 'monospace', fontSize: 11, border: '1px solid var(--border-glass)',
                color: 'var(--accent-cyan)', overflow: 'hidden', textOverflow: 'ellipsis'
              }}>
                {user?.walletId?.evmAddress || wallet?.evmAddress || '0x...'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
