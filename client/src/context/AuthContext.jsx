import { createContext, useContext, useState, useEffect } from 'react';
import { getMe, logoutUser } from '../api/backend';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const userData = await getMe();
        if (userData && userData._id) {
          setUser(userData);
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    initAuth();

    // Global listener for token invalidation
    const handleUnauthorized = () => {
      setUser(null);
    };
    window.addEventListener('lunar_unauthorized', handleUnauthorized);
    return () => window.removeEventListener('lunar_unauthorized', handleUnauthorized);
  }, []);

  const login = (userData) => {
    setUser(userData);
  };

  const logout = async () => {
    try {
      await logoutUser();
    } catch (e) {
      console.warn('Logout request failed', e);
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
