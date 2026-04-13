import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('lunaranime_user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch { /* ignore */ }
    }
    setLoading(false);

    // Global listener for token invalidation
    const handleUnauthorized = () => {
      setUser(null);
    };
    window.addEventListener('lunar_unauthorized', handleUnauthorized);
    return () => window.removeEventListener('lunar_unauthorized', handleUnauthorized);
  }, []);

  const login = (userData) => {
    setUser(userData);
    localStorage.setItem('lunaranime_user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('lunaranime_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
