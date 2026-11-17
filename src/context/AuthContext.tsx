import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { initialUser } from '../data/mockData';
import { isSupabaseConfigured, getProfileFromDb, upsertProfileInDb, uploadAvatarInDb, isValidUuid } from '../lib/supabase';
import { rememberOAuthAccount } from '../components/common/OAuthAccountModal';

interface OAuthInput {
  email: string;
  name?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isSupabaseConnected: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  loginWithOAuth: (provider: 'google' | 'github', accountInfo: OAuthInput | string) => Promise<boolean>;
  register: (name: string, email: string, password: string, targetRole?: string, targetCompany?: string) => Promise<boolean>;
  resetPassword: (email: string, newPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserMetrics: (updates: Partial<User>) => Promise<void>;
  updateAvatar: (avatarUrl: string) => Promise<string | null>;
  reloadSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'preppilot_auth_user';
const AUTH_LOGGED_OUT_KEY = 'preppilot_logged_out';

const DUMMY_OAUTH_EMAILS = new Set([
  'google.candidate@example.com',
  'github.candidate@example.com',
]);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      if (typeof window !== 'undefined') {
        const loggedOut = localStorage.getItem(AUTH_LOGGED_OUT_KEY);
        if (loggedOut === 'true' || loggedOut === '1') return null;
        const stored = localStorage.getItem(AUTH_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as User;
          if (parsed?.email && DUMMY_OAUTH_EMAILS.has(parsed.email.toLowerCase())) {
            localStorage.removeItem(AUTH_STORAGE_KEY);
            return null;
          }
          return parsed;
        }
      }
    } catch {
      // Ignore storage errors in sandboxed contexts
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState<boolean>(isSupabaseConfigured());

  const mapServerAuthUser = async (authUser: any, overrides?: Partial<User>) => {
    const dbProfile = isValidUuid(authUser?.id) ? await getProfileFromDb(authUser.id) : null;
    const rawProfile = dbProfile as any;
    const meta = authUser?.user_metadata || {};

    const mappedUser: User = {
      id: authUser?.id || `usr_${Date.now()}`,
      name:
        dbProfile?.fullName ||
        rawProfile?.full_name ||
        authUser?.name ||
        meta.full_name ||
        meta.name ||
        overrides?.name ||
        authUser?.email?.split('@')[0] ||
        'Candidate',
      email: authUser?.email || overrides?.email || '',
      avatarUrl:
        rawProfile?.avatarUrl ||
        rawProfile?.avatar_url ||
        authUser?.avatarUrl ||
        meta.avatar_url ||
        overrides?.avatarUrl ||
        initialUser.avatarUrl,
      authProvider:
        rawProfile?.authProvider ||
        rawProfile?.auth_provider ||
        authUser?.authProvider ||
        overrides?.authProvider ||
        'email',
      targetRole:
        rawProfile?.targetRole ||
        rawProfile?.target_role ||
        authUser?.targetRole ||
        meta.target_role ||
        overrides?.targetRole ||
        'Software Developer',
      targetCompany:
        rawProfile?.targetCompany ||
        rawProfile?.target_company ||
        authUser?.targetCompany ||
        meta.target_company ||
        overrides?.targetCompany ||
        'Stripe',
      experienceLevel:
        rawProfile?.experienceLevel ||
        rawProfile?.experience_level ||
        overrides?.experienceLevel ||
        'mid',
      readinessScore: Number(
        rawProfile?.readinessScore ??
        rawProfile?.readiness_score ??
        overrides?.readinessScore ??
        68
      ),
      streakDays: Number(
        rawProfile?.streakDays ??
        rawProfile?.streak_days ??
        overrides?.streakDays ??
        1
      ),
    };

    setUser(mappedUser);
    try {
      localStorage.removeItem(AUTH_LOGGED_OUT_KEY);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(mappedUser));
    } catch {
      // Ignore storage errors in sandboxed contexts
    }
    return mappedUser;
  };

  // Initialize Auth state strictly from active stored session (never auto-login guests)
  const initializeAuth = async () => {
    setIsLoading(true);
    const configured = isSupabaseConfigured();
    setIsSupabaseConnected(configured);

    try {
      const loggedOut = localStorage.getItem(AUTH_LOGGED_OUT_KEY);
      if (loggedOut === 'true' || loggedOut === '1') {
        setUser(null);
        return;
      }

      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const parsedUser: User = JSON.parse(stored);
        if (parsedUser?.email && DUMMY_OAUTH_EMAILS.has(parsedUser.email.toLowerCase())) {
          localStorage.removeItem(AUTH_STORAGE_KEY);
          setUser(null);
          return;
        }
        setUser(parsedUser);

        if (configured && isValidUuid(parsedUser.id)) {
          const dbProfile = await getProfileFromDb(parsedUser.id);
          if (dbProfile) {
            const rawProfile = dbProfile as any;
            const refreshedUser: User = {
              ...parsedUser,
              name: dbProfile.fullName || rawProfile.full_name || parsedUser.name,
              avatarUrl: rawProfile.avatarUrl || rawProfile.avatar_url || parsedUser.avatarUrl,
              authProvider: rawProfile.authProvider || rawProfile.auth_provider || parsedUser.authProvider,
              targetRole: rawProfile.targetRole || rawProfile.target_role || parsedUser.targetRole,
              targetCompany: rawProfile.targetCompany || rawProfile.target_company || parsedUser.targetCompany,
              experienceLevel: rawProfile.experienceLevel || rawProfile.experience_level || parsedUser.experienceLevel,
              readinessScore: Number(rawProfile.readinessScore ?? rawProfile.readiness_score ?? parsedUser.readinessScore),
              streakDays: Number(rawProfile.streakDays ?? rawProfile.streak_days ?? parsedUser.streakDays),
            };
            setUser(refreshedUser);
            localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(refreshedUser));
          }
        }
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void initializeAuth();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.user) {
        throw new Error(json?.error || 'Invalid email or password.');
      }

      await mapServerAuthUser(json.user, { email: email.trim().toLowerCase() });
      return true;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithOAuth = async (
    provider: 'google' | 'github',
    accountInfo: OAuthInput | string
  ): Promise<boolean> => {
    const email = (typeof accountInfo === 'string' ? accountInfo : accountInfo?.email || '').trim().toLowerCase();
    const name = typeof accountInfo === 'string' ? undefined : accountInfo?.name?.trim();
    if (!email) {
      throw new Error(`Please provide your ${provider === 'google' ? 'Google email' : 'GitHub email or username'} to continue.`);
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/oauth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, email, name }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.user) {
        throw new Error(json?.error || `Failed to sign in with ${provider}.`);
      }

      const mapped = await mapServerAuthUser(json.user, {
        email: json.user.email || email,
        name: json.user.name || name,
        authProvider: provider,
      });

      rememberOAuthAccount({
        provider,
        email: mapped.email,
        name: mapped.name,
      });
      return true;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    targetRole = 'Software Developer',
    targetCompany = 'Stripe'
  ): Promise<boolean> => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          targetRole: targetRole.trim() || 'Software Developer',
          targetCompany: targetCompany.trim() || 'Stripe',
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.user) {
        throw new Error(json?.error || 'Failed to create account. Please try again.');
      }

      await mapServerAuthUser(json.user, {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        authProvider: 'email',
        targetRole: targetRole.trim() || 'Software Developer',
        targetCompany: targetCompany.trim() || 'Stripe',
        readinessScore: 65,
        streakDays: 1,
      });
      return true;
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (email: string, newPassword: string): Promise<void> => {
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase(), newPassword }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json?.error || 'Failed to reset password.');
    }
  };

  const logout = async () => {
    setUser(null);
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.setItem(AUTH_LOGGED_OUT_KEY, 'true');
    } catch {}
  };

  const updateUserMetrics = async (updates: Partial<User>) => {
    if (!user) return;
    const updated = { ...user, ...updates };
    setUser(updated);
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updated));
    } catch {}

    if (isSupabaseConfigured() && isValidUuid(user.id)) {
      await upsertProfileInDb(user.id, {
        email: updated.email,
        fullName: updated.name,
        avatarUrl: updated.avatarUrl,
        authProvider: updated.authProvider,
        targetRole: updated.targetRole,
        targetCompany: updated.targetCompany,
        experienceLevel: updated.experienceLevel,
        readinessScore: updated.readinessScore,
        streakDays: updated.streakDays,
      });
    }
  };

  const updateAvatar = async (avatarUrl: string): Promise<string | null> => {
    if (!user) return null;
    const savedAvatar = await uploadAvatarInDb(user.id, avatarUrl, user.email);
    const finalAvatar = savedAvatar || initialUser.avatarUrl;
    const updated = { ...user, avatarUrl: finalAvatar };
    setUser(updated);
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updated));
    } catch {}
    return finalAvatar;
  };

  const reloadSession = async () => {
    await initializeAuth();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        isSupabaseConnected,
        login,
        loginWithOAuth,
        register,
        resetPassword,
        logout,
        updateUserMetrics,
        updateAvatar,
        reloadSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
