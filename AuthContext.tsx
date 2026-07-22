import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';

interface User { id: string; username: string; email: string; role: string; }
interface AuthContextType { user: User | null; token: string | null; login: (u: User, t: string) => void; logout: () => void; }

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      // Fetch user profile to validate
      axios.get('http://localhost:5000/api/user/profile')
        .then(res => setUser(res.data))
        .catch(() => logout());
    }
  }, [token]);

  const login = (u: User, t: string) => {
    setUser(u);
    setToken(t);
    localStorage.setItem('token', t);
    axios.defaults.headers.common['Authorization'] = `Bearer ${t}`;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
  };

  return <AuthContext.Provider value={{ user, token, login, logout }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext)!;