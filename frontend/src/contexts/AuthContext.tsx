import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { api } from '../api/client';
import { queryClient } from '../queryClient';
import type { LoginRequest, RegisterRequest, User } from '../types';
import { AuthContext } from './AuthContextDef';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const currentUser = await api.getMe();
      setUser(currentUser);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      queryClient.clear();
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const login = useCallback(async (data: LoginRequest) => {
    queryClient.clear();
    const loggedInUser = await api.login(data);
    setUser(loggedInUser);
  }, []);

  const register = useCallback(async (data: RegisterRequest) => {
    queryClient.clear();
    const newUser = await api.register(data);
    setUser(newUser);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // Logout failed on server, but still clear local state
    }
    setUser(null);
    queryClient.clear();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

