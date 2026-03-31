import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi, storeTokens, clearTokens, getStoredToken, userApi, subscriptionApi } from '../services/api';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  language: string;
  isVerified: boolean;
}

interface Subscription {
  id: string;
  subscriberNumber: string;
  distributionCompany: string;
  householdSize: number;
}

interface AuthContextType {
  user: AuthUser | null;
  subscription: Subscription | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  createSubscription: (data: {
    subscriberNumber: string;
    distributionCompany: 'JEPCO' | 'IDECO' | 'EDCO';
    householdSize: number;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    (async () => {
      try {
        const token = await getStoredToken();
        if (token) {
          const profile = await userApi.getMe();
          setUser({
            id: profile.id,
            email: profile.email,
            name: profile.name,
            language: profile.language,
            isVerified: profile.isVerified,
          });
          try {
            const sub = await subscriptionApi.getMine();
            setSubscription(sub);
          } catch {
            // No subscription yet — that's OK
          }
        }
      } catch {
        await clearTokens();
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await authApi.login({ email, password });
    await storeTokens(result.accessToken, result.refreshToken);
    setUser(result.user);
    try {
      const sub = await subscriptionApi.getMine();
      setSubscription(sub);
    } catch {
      // No subscription yet
    }
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const result = await authApi.register({ name, email, password });
    await storeTokens(result.accessToken, result.refreshToken);
    setUser(result.user);
  }, []);

  const createSubscription = useCallback(async (data: {
    subscriberNumber: string;
    distributionCompany: 'JEPCO' | 'IDECO' | 'EDCO';
    householdSize: number;
  }) => {
    const sub = await subscriptionApi.create(data);
    setSubscription(sub as Subscription);
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
    setSubscription(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const profile = await userApi.getMe();
      setUser({
        id: profile.id,
        email: profile.email,
        name: profile.name,
        language: profile.language,
        isVerified: profile.isVerified,
      });
      const sub = await subscriptionApi.getMine();
      setSubscription(sub);
    } catch {
      // Ignore
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        subscription,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        createSubscription,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
