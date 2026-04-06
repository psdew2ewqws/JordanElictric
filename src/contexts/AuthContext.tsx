import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import type { Session } from '@supabase/supabase-js';

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
  updateSubscription: (data: Partial<{
    subscriberNumber: string;
    distributionCompany: string;
    householdSize: number;
  }>) => Promise<void>;
  updateUser: (data: { name?: string; phone?: string; language?: 'AR' | 'EN' }) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load profile + subscription from Supabase tables
  const loadProfile = useCallback(async (userId: string) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email, name, language, is_verified')
      .eq('id', userId)
      .single();

    if (profile) {
      setUser({
        id: profile.id,
        email: profile.email,
        name: profile.name,
        language: profile.language,
        isVerified: profile.is_verified,
      });
    }

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('id, file_number, distribution_company, household_size')
      .eq('user_id', userId)
      .single();

    if (sub) {
      setSubscription({
        id: sub.id,
        subscriberNumber: sub.file_number,
        distributionCompany: sub.distribution_company,
        householdSize: sub.household_size,
      });
    } else {
      setSubscription(null);
    }
  }, []);

  // Listen for auth state changes
  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadProfile(session.user.id).finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    // Subscribe to auth changes
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          await loadProfile(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setSubscription(null);
        }
      }
    );

    return () => authSub.unsubscribe();
  }, [loadProfile]);

  const login = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    // Profile is loaded by the auth state listener
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, language: 'AR' } },
    });
    if (error) throw new Error(error.message);

    // Update the profile name (trigger created it with metadata, but let's be sure)
    if (data.user) {
      await supabase
        .from('profiles')
        .update({ name, email })
        .eq('id', data.user.id);
    }
  }, []);

  const createSubscription = useCallback(async (data: {
    subscriberNumber: string;
    distributionCompany: 'JEPCO' | 'IDECO' | 'EDCO';
    householdSize: number;
  }) => {
    const session = await supabase.auth.getSession();
    const userId = session.data.session?.user.id;
    if (!userId) throw new Error('Not authenticated');

    const { data: sub, error } = await supabase
      .from('subscriptions')
      .insert({
        user_id: userId,
        file_number: data.subscriberNumber,
        distribution_company: data.distributionCompany,
        household_size: data.householdSize,
      })
      .select('id, file_number, distribution_company, household_size')
      .single();

    if (error) throw new Error(error.message);

    setSubscription({
      id: sub.id,
      subscriberNumber: sub.file_number,
      distributionCompany: sub.distribution_company,
      householdSize: sub.household_size,
    });
  }, []);

  const updateSubscription = useCallback(async (data: Partial<{
    subscriberNumber: string;
    distributionCompany: string;
    householdSize: number;
  }>) => {
    const session = await supabase.auth.getSession();
    const userId = session.data.session?.user.id;
    if (!userId) throw new Error('Not authenticated');

    // Map frontend field names to DB column names
    const updates: Record<string, unknown> = {};
    if (data.subscriberNumber !== undefined) updates.file_number = data.subscriberNumber;
    if (data.distributionCompany !== undefined) updates.distribution_company = data.distributionCompany;
    if (data.householdSize !== undefined) updates.household_size = data.householdSize;

    const { error } = await supabase
      .from('subscriptions')
      .update(updates)
      .eq('user_id', userId);

    if (error) throw new Error(error.message);

    // Reload subscription
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('id, file_number, distribution_company, household_size')
      .eq('user_id', userId)
      .single();

    if (sub) {
      setSubscription({
        id: sub.id,
        subscriberNumber: sub.file_number,
        distributionCompany: sub.distribution_company,
        householdSize: sub.household_size,
      });
    }
  }, []);

  const updateUser = useCallback(async (data: { name?: string; phone?: string; language?: 'AR' | 'EN' }) => {
    const session = await supabase.auth.getSession();
    const userId = session.data.session?.user.id;
    if (!userId) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('profiles')
      .update(data)
      .eq('id', userId);

    if (error) throw new Error(error.message);

    // Reload profile
    await loadProfile(userId);
  }, [loadProfile]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSubscription(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    const session = await supabase.auth.getSession();
    const userId = session.data.session?.user.id;
    if (userId) await loadProfile(userId);
  }, [loadProfile]);

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
        updateSubscription,
        updateUser,
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
