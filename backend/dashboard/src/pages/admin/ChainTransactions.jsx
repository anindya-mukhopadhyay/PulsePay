import { useEffect, useState } from 'react';
import api from '../../api';

const FLOW_TYPES = ['', 'erc4337', 'superfluid', 'offchain'];
const STATUS_TYPES = ['', 'CONFIRMED', 'SUBMITTED', 'FAILED', 'PENDING'];
const SERVICE_TYPES = ['', 'EV', 'WIFI', 'PARKING', 'GYM', 'CONTENT', 'COWORK', 'LOUNGE', 'STORAGE'];

function queryString(filters) {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.flowType) params.set('flowType', filters.flowType);
  if (filters.serviceType) params.set('serviceType', filters.serviceType);
  if (filters.limit) params.set('limit', String(filters.limit));
  return params.toString();
}

function formatMoney(amount) {
  return `₹${Number(amount || 0).toFixed(2)}`;
}

export default function ChainTransactions() {
  const [filters, setFilters] = useState({ status: '', flowType: '', serviceType: '', limit: 50 });
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.getAdminChainTransactions(queryString(filters));
        if (!mounted) return;
        setRows(res.data || []);
        setTotal(res.total || 0);
      } catch (_) {
        if (!mounted) return;
        setRows([]);
        setTotal(0);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [filters]);

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h2>All Chain Transactions</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Live settlement monitoring across all services</p>
        </div>
        <span className="badge purple">{total} total records</span>
      </div>

      <div className="glass-card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
          <select className="form-input form-select" value={filters.status} onChange={(e) => setFilters((v) => ({ ...v, status: e.target.value }))}>
            {STATUS_TYPES.map((value) => <option key={value || 'all-status'} value={value}>{value || 'All Status'}</option>)}
          </select>
          <select className="form-input form-select" value={filters.flowType} onChange={(e) => setFilters((v) => ({ ...v, flowType: e.target.value }))}>
            {FLOW_TYPES.map((value) => <option key={value || 'all-flow'} value={value}>{value || 'All Flows'}</option>)}
          </select>
          <select className="form-input form-select" value={filters.serviceType} onChange={(e) => setFilters((v) => ({ ...v, serviceType: e.target.value }))}>
            {SERVICE_TYPES.map((value) => <option key={value || 'all-service'} value={value}>{value || 'All Services'}</option>)}
          </select>
          <input
            className="form-input"
            type="number"
            min="10"
            max="200"
            value={filters.limit}
            onChange={(e) => setFilters((v) => ({ ...v, limit: Math.min(Math.max(Number(e.target.value || 50), 10), 200) }))}
            placeholder="Limit"
          />
        </div>
      </div>

      {loading ? (
        <div className="empty-state"><div className="empty-icon">⏳</div><h3>Loading chain transactions...</h3></div>
      ) : rows.length === 0 ? (
        <div className="empty-state"><div className="empty-icon">⛓️</div><h3>No matching transactions</h3></div>
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
                <th>From</th>
                <th>To</th>
                <th>Transaction</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row._id}>
                  <td>{new Date(row.createdAt).toLocaleString()}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{row.serviceName || 'Streaming utility'}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{row.serviceType || 'UNKNOWN'}</div>
                  </td>
                  <td><span className={`badge ${row.status === 'CONFIRMED' ? 'green' : row.status === 'FAILED' ? 'red' : 'orange'}`}>{row.status}</span></td>
                  <td><span className="badge blue">{row.flowType}</span></td>
                  <td style={{ fontWeight: 700 }}>{formatMoney(row.amountFiat)}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{row.fromAddress ? `${row.fromAddress.slice(0, 8)}…${row.fromAddress.slice(-6)}` : '—'}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{row.toAddress ? `${row.toAddress.slice(0, 8)}…${row.toAddress.slice(-6)}` : '—'}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>
                    {row.transactionHash ? (
                      <a href={row.explorerUrl} target="_blank" rel="noreferrer">{`${row.transactionHash.slice(0, 10)}…${row.transactionHash.slice(-8)}`}</a>
                    ) : (
                      row.userOperationHash ? `${row.userOperationHash.slice(0, 10)}…` : '—'
                    )}
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
