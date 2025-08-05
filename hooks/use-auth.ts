import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = () => {
      const authenticated = sessionStorage.getItem('adminAuthenticated') === 'true';
      const user = sessionStorage.getItem('adminUsername');
      
      setIsAuthenticated(authenticated);
      setUsername(user || '');
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = (user: string) => {
    sessionStorage.setItem('adminAuthenticated', 'true');
    sessionStorage.setItem('adminUsername', user);
    setIsAuthenticated(true);
    setUsername(user);
  };

  const logout = () => {
    sessionStorage.removeItem('adminAuthenticated');
    sessionStorage.removeItem('adminUsername');
    setIsAuthenticated(false);
    setUsername('');
    router.push('/admin/login');
  };

  const requireAuth = () => {
    if (!loading && !isAuthenticated) {
      router.push('/admin/login');
      return false;
    }
    return true;
  };

  return {
    isAuthenticated,
    username,
    loading,
    login,
    logout,
    requireAuth,
  };
} 