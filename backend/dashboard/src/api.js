const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });

  // Safely parse JSON — guard against empty bodies (204, network errors, HTML pages)
  const contentType = res.headers.get('content-type') || '';
  let data = {};
  if (contentType.includes('application/json')) {
    const text = await res.text();
    data = text ? JSON.parse(text) : {};
  }

  if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`);
  return data;
}

const api = {
  // Auth
  adminLogin: (email, password) =>
    request('/auth/admin/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  storeLogin: (email, password) =>
    request('/stores/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  userLogin: (email, password) =>
    request('/users/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  getAdminDashboard: () => request('/admin/dashboard'),
  getAdminChainTransactions: (params = '') => request(`/admin/chain-transactions${params ? '?' + params : ''}`),

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
  getWalletBalance: (id, live = true) => request(`/wallets/${id}/balance?live=${live ? 'true' : 'false'}`),
  getWalletOnChainBalance: (id) => request(`/wallets/${id}/onchain-balance`),
  getWalletOnChainTransactions: (id, limit = 25) => request(`/wallets/${id}/onchain-transactions?limit=${limit}`),
  getWalletActivity: (id) => request(`/wallets/${id}/activity`),
  getTransactions: (id, limit = 50) => request(`/wallets/${id}/transactions?limit=${limit}`),
  createWalletChallenge: (id, evmAddress) =>
    request(`/wallets/${id}/metamask/challenge`, { method: 'POST', body: JSON.stringify({ evmAddress }) }),
  verifyWalletSignature: (id, data) =>
    request(`/wallets/${id}/metamask/verify`, { method: 'POST', body: JSON.stringify(data) }),

  // Sessions
  getSession: (id) => request(`/sessions/${id}`),
  getActiveSessions: (walletId) => request(`/sessions/active/${walletId}`),
  getSessionsByStore: (storeId) => request(`/sessions/store/${storeId}/active`),
  getSessionHistory: (walletId, limit = 50) => request(`/sessions/history/${walletId}?limit=${limit}`),
  createPaymentIntent: (sessionId, data = {}) =>
    request(`/sessions/${sessionId}/payment-intent`, { method: 'POST', body: JSON.stringify(data) }),
  settleSession: (sessionId, data) =>
    request(`/sessions/${sessionId}/settle`, { method: 'POST', body: JSON.stringify(data) }),

  // Receipts / settlements
  getReceipts: (params = '') => request(`/receipts${params ? '?' + params : ''}`),
  getSettlements: (params = '') => request(`/settlements${params ? '?' + params : ''}`),
};

export default api;
