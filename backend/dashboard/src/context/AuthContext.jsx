import { createContext, useContext, useState, useCallback } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('pp_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [role, setRole] = useState(() => localStorage.getItem('pp_role') || null);

  const loginAdmin = useCallback(async (email, password) => {
    const res = await api.adminLogin(email, password);
    const u = { email: res.data.email, token: res.data.token, role: 'admin' };
    setUser(u);
    setRole('admin');
    localStorage.setItem('pp_user', JSON.stringify(u));
    localStorage.setItem('pp_role', 'admin');
    return u;
  }, []);

  const loginOwner = useCallback(async (email, password) => {
    const res = await api.storeLogin(email, password);
    const u = { ...res.data, role: 'owner' };
    setUser(u);
    setRole('owner');
    localStorage.setItem('pp_user', JSON.stringify(u));
    localStorage.setItem('pp_role', 'owner');
    return u;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setRole(null);
    localStorage.removeItem('pp_user');
    localStorage.removeItem('pp_role');
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, loginAdmin, loginOwner, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
