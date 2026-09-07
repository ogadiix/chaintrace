import React, { createContext, useContext, useState, useCallback } from 'react';
import type { User } from '@chaintrace/types';

interface AuthContextType {
  authToken: string;
  currentUser: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  setSession: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_STORAGE_KEY = 'chaintrace_auth_token';
const USER_STORAGE_KEY = 'chaintrace_current_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authToken, setAuthToken] = useState<string>(() => {
    return sessionStorage.getItem(TOKEN_STORAGE_KEY) || '';
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const stored = sessionStorage.getItem(USER_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Sync token changes to sessionStorage
  const setSession = useCallback((token: string, user: User) => {
    setAuthToken(token);
    setCurrentUser(user);
    sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
    sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  }, []);

  const logout = useCallback(() => {
    setAuthToken('');
    setCurrentUser(null);
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    sessionStorage.removeItem(USER_STORAGE_KEY);
  }, []);

  const login = useCallback(async (email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password: pass }),
      });

      const data = await res.json();
      if (!res.ok) {
        return {
          success: false,
          error: data.detail || 'Authentication failed. Please verify your institutional credentials.',
        };
      }

      setSession(data.accessToken, data.user);
      return { success: true };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unable to establish secure connection to the authentication service.',
      };
    } finally {
      setIsLoading(false);
    }
  }, [setSession]);

  return (
    <AuthContext.Provider
      value={{
        authToken,
        currentUser,
        isAuthenticated: Boolean(authToken && currentUser),
        isLoading,
        login,
        setSession,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
