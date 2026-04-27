const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

const api = {
  // Auth
  adminLogin: (email, password) =>
    request('/auth/admin/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  storeLogin: (email, password) =>
    request('/stores/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  // Users
  getUsers: () => request('/users'),
  getUser: (id) => request(`/users/${id}`),
  deleteUser: (id) => request(`/users/${id}`, { method: 'DELETE' }),

  // Stores
  getStores: (params = '') => request(`/stores${params ? '?' + params : ''}`),
  getStore: (id) => request(`/stores/${id}`),
  verifyStore: (id, status) =>
    request(`/stores/${id}/verify`, { method: 'PUT', body: JSON.stringify({ verificationStatus: status }) }),
  deleteStore: (id) => request(`/stores/${id}`, { method: 'DELETE' }),
  getStoreServices: (storeId) => request(`/stores/${storeId}/services`),

  // Services
  getServices: (params = '') => request(`/services${params ? '?' + params : ''}`),
  getService: (id) => request(`/services/${id}`),
  createService: (data) =>
    request('/services', { method: 'POST', body: JSON.stringify(data) }),
  updateService: (id, data) =>
    request(`/services/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteService: (id) => request(`/services/${id}`, { method: 'DELETE' }),

  // Wallets
  getWallet: (id) => request(`/wallets/${id}`),
  getWalletBalance: (id) => request(`/wallets/${id}/balance`),
  getTransactions: (id, limit = 50) => request(`/wallets/${id}/transactions?limit=${limit}`),

  // Sessions
  getSession: (id) => request(`/sessions/${id}`),
  getActiveSessions: (walletId) => request(`/sessions/active/${walletId}`),
  getSessionsByStore: (storeId) => request(`/sessions/store/${storeId}/active`),
  getSessionHistory: (walletId, limit = 50) => request(`/sessions/history/${walletId}?limit=${limit}`),
};

export default api;
