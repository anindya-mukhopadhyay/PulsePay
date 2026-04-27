import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';

const SERVICE_TYPES = [
  { id: 'EV', name: 'EV Charging', icon: '⚡', color: 'purple', desc: 'Per-second electrical charging settlement' },
  { id: 'WIFI', name: 'Public WiFi', icon: '📶', color: 'blue', desc: 'Data streaming & session-based access' },
  { id: 'PARKING', name: 'Smart Parking', icon: '🅿️', color: 'orange', desc: 'Automated duration-based parking' },
  { id: 'GYM', name: 'Gym Access', icon: '🏋️', color: 'green', desc: 'Per-minute workout facility access' },
];

export default function MyServices() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newService, setNewService] = useState({ name: '', serviceType: 'EV', ratePerMinute: '', minBalanceRequired: '' });

  const load = () => {
    setLoading(true);
    api.getStoreServices(user._id)
      .then(r => setServices(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, [user]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.createService({
        storeId: user._id,
        ...newService,
        ratePerMinute: Number(newService.ratePerMinute),
        minBalanceRequired: Number(newService.minBalanceRequired)
      });
      setShowModal(false);
      setNewService({ name: '', serviceType: 'EV', ratePerMinute: '', minBalanceRequired: '' });
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if(!confirm('Are you sure you want to delete this service?')) return;
    try { await api.deleteService(id); load(); } catch {}
  };

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h2>Utility Services</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Manage your streaming payment gateways</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <span style={{ fontSize: 18 }}>+</span> Create New Service
        </button>
      </div>

      {loading ? (
        <div className="empty-state"><div className="empty-icon">⏳</div><h3>Loading Services...</h3></div>
      ) : services.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">⚡</div>
          <h3>No Services Found</h3>
          <p>Create your first per-second billing service to start accepting payments.</p>
          <button className="btn btn-ghost" style={{ marginTop: 20 }} onClick={() => setShowModal(true)}>+ Add Service</button>
        </div>
      ) : (
        <div className="services-grid">
          {services.map(s => {
            const type = SERVICE_TYPES.find(t => t.id === s.serviceType) || SERVICE_TYPES[0];
            return (
              <div key={s._id} className="glass-card service-card">
                <div className="service-header">
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div className={`stat-icon`} style={{ 
                      margin: 0, width: 40, height: 40, fontSize: 18,
                      background: `var(--gradient-${type.color})`,
                      borderRadius: '10px'
                    }}>
                      {type.icon}
                    </div>
                    <div>
                      <div className="service-name">{s.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>{type.name}</div>
                    </div>
                  </div>
                  <span className={`badge ${s.isActive ? 'green' : 'red'}`}>{s.isActive ? 'Live' : 'Paused'}</span>
                </div>
                
                <div className="service-rates" style={{ marginTop: 20 }}>
                  <div className="rate-chip">
                    <div className="rate-label">Per Minute Rate</div>
                    <div className="rate-value">₹{s.ratePerMinute.toFixed(2)}</div>
                  </div>
                  <div className="rate-chip">
                    <div className="rate-label">Per Second Rate</div>
                    <div className="rate-value" style={{ color: 'var(--accent-purple)' }}>₹{s.ratePerSecond.toFixed(4)}</div>
                  </div>
                </div>
                
                <div style={{ padding: '12px 0', borderTop: '1px solid var(--border-glass)', margin: '16px 0 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)' }}>
                    <span>Min. Balance Required</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>₹{s.minBalanceRequired}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => navigate(`/owner/services/${s.qrCodeId}/qr`)}>
                    Get QR Code
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(s._id)}>🗑️</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <h3>Configure New Service</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label>Service Category</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
                  {SERVICE_TYPES.map(t => (
                    <div 
                      key={t.id} 
                      onClick={() => setNewService({...newService, serviceType: t.id})}
                      style={{
                        padding: 12, borderRadius: 12, cursor: 'pointer', border: '1px solid var(--border-glass)',
                        background: newService.serviceType === t.id ? 'rgba(139,92,246,0.1)' : 'transparent',
                        borderColor: newService.serviceType === t.id ? 'var(--accent-purple)' : 'var(--border-glass)',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ fontSize: 20, marginBottom: 4 }}>{t.icon}</div>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{t.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{t.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Display Name</label>
                <input className="form-input" required value={newService.name} onChange={e => setNewService({...newService, name: e.target.value})} placeholder="e.g. Premium High-Speed Access" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label>Rate Per Minute (₹)</label>
                  <input className="form-input" type="number" step="0.01" required value={newService.ratePerMinute} onChange={e => setNewService({...newService, ratePerMinute: e.target.value})} placeholder="2.50" />
                </div>
                <div className="form-group">
                  <label>Min Balance (₹)</label>
                  <input className="form-input" type="number" required value={newService.minBalanceRequired} onChange={e => setNewService({...newService, minBalanceRequired: e.target.value})} placeholder="50" />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ minWidth: 160 }}>Create & Generate QR</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
