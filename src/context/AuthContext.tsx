import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { initialUser } from '../data/mockData';
import { isSupabaseConfigured, getProfileFromDb, upsertProfileInDb, uploadAvatarInDb, isValidUuid } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isSupabaseConnected: boolean;
  login: (email: string, password?: string) => Promise<boolean>;
  loginWithOAuth: (provider: 'google' | 'github', emailOverride?: string) => Promise<boolean>;
  register: (name: string, email: string, password?: string, targetRole?: string, targetCompany?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  updateUserMetrics: (updates: Partial<User>) => Promise<void>;
  updateAvatar: (avatarUrl: string) => Promise<string | null>;
  reloadSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'preppilot_auth_user';
const AUTH_LOGGED_OUT_KEY = 'preppilot_logged_out';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      if (typeof window !== 'undefined') {
        if (localStorage.getItem(AUTH_LOGGED_OUT_KEY) === 'true') return null;
        const stored = localStorage.getItem(AUTH_STORAGE_KEY);
        if (stored) return JSON.parse(stored) as User;
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
      email: authUser?.email || overrides?.email || 'candidate@preppilot.ai',
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
        initialUser.targetRole,
      targetCompany:
        rawProfile?.targetCompany ||
        rawProfile?.target_company ||
        authUser?.targetCompany ||
        meta.target_company ||
        overrides?.targetCompany ||
        initialUser.targetCompany,
      experienceLevel:
        rawProfile?.experienceLevel ||
        rawProfile?.experience_level ||
        overrides?.experienceLevel ||
        'senior-staff',
      readinessScore: Number(
        rawProfile?.readinessScore ??
        rawProfile?.readiness_score ??
        overrides?.readinessScore ??
        78
      ),
      streakDays: Number(
        rawProfile?.streakDays ??
        rawProfile?.streak_days ??
        overrides?.streakDays ??
        5
      ),
    };

    setUser(mappedUser);
    try {
      localStorage.removeItem(AUTH_LOGGED_OUT_KEY);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(mappedUser));
    } catch {
      // Ignore storage errors in sandboxed contexts
    }
  };

  // Initialize Auth state from cached session & protected server profile
  const initializeAuth = async () => {
    setIsLoading(true);
    const configured = isSupabaseConfigured();
    setIsSupabaseConnected(configured);

    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const parsedUser: User = JSON.parse(stored);
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
        const explicitlyLoggedOut = localStorage.getItem(AUTH_LOGGED_OUT_KEY) === '1';
        if (explicitlyLoggedOut) {
          setUser(null);
        } else {
          setUser(initialUser);
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(initialUser));
        }
      }
    } catch {
      setUser(initialUser);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initializeAuth();
  }, []);

  const login = async (email: string, password = 'password123'): Promise<boolean> => {
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json?.error || 'Failed to authenticate. Please check your credentials.');
      }

      if (json?.user) {
        await mapServerAuthUser(json.user, { email });
        setIsLoading(false);
        return true;
      }
    } catch (err: any) {
      if (err instanceof Error && err.message && !err.message.toLowerCase().includes('fetch')) {
        setIsLoading(false);
        throw err;
      }
      console.warn('Auth endpoint unavailable, falling back to local session:', err);
    }

    // Fallback local mode
    const loggedInUser: User = {
      ...initialUser,
      id: `usr_${Date.now()}`,
      email,
      authProvider: 'email',
      name: email.split('@')[0].replace('.', ' ').replace(/^\w/, (c) => c.toUpperCase()) || 'Alex Morgan',
    };
    setUser(loggedInUser);
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(loggedInUser));
    } catch {}
    setIsLoading(false);
    return true;
  };

  const loginWithOAuth = async (provider: 'google' | 'github', emailOverride?: string): Promise<boolean> => {
    setIsLoading(true);
    const trimmedOverride = typeof emailOverride === 'string' ? emailOverride.trim() : '';
    const providerEmail = trimmedOverride || `${provider}.candidate@example.com`;
    const defaultName =
      trimmedOverride
        ? trimmedOverride.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
        : provider === 'google'
          ? 'Alex Morgan (Google)'
          : 'Alex Morgan (GitHub)';

    try {
      const res = await fetch('/api/auth/oauth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, email: trimmedOverride || undefined }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || `Failed to sign in with ${provider}.`);
      }
      if (json?.user) {
        await mapServerAuthUser(json.user, {
          email: providerEmail,
          name: json.user.name || defaultName,
          authProvider: provider,
        });
        setIsLoading(false);
        return true;
      }
    } catch (err: any) {
      if (err instanceof Error && err.message && !err.message.toLowerCase().includes('fetch')) {
        setIsLoading(false);
        throw err;
      }
    }

    const loggedInUser: User = {
      ...initialUser,
      id: `oauth_${provider}_${Date.now()}`,
      email: providerEmail,
      authProvider: provider,
      name: defaultName,
    };
    setUser(loggedInUser);
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(loggedInUser));
    } catch {}
    setIsLoading(false);
    return true;
  };

  const register = async (
    name: string,
    email: string,
    password = 'password123',
    targetRole = 'Senior Frontend Engineer',
    targetCompany = 'Stripe'
  ): Promise<boolean> => {
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, targetRole, targetCompany }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json?.error || 'Failed to create account. Please try again.');
      }

      if (json?.user) {
        await mapServerAuthUser(json.user, {
          name,
          email,
          authProvider: 'email',
          targetRole: targetRole || 'Software Engineer',
          targetCompany: targetCompany || 'Stripe',
          readinessScore: 65,
          streakDays: 1,
        });
        setIsLoading(false);
        return true;
      }
    } catch (err: any) {
      if (err instanceof Error && err.message && !err.message.toLowerCase().includes('fetch')) {
        setIsLoading(false);
        throw err;
      }
      console.warn('Register endpoint unavailable, falling back to local session:', err);
    }

    // Fallback simulation
    const newUser: User = {
      ...initialUser,
      id: `usr_${Date.now()}`,
      name,
      email,
      authProvider: 'email',
      targetRole: targetRole || 'Software Engineer',
      targetCompany: targetCompany || 'Stripe',
      readinessScore: 65,
      streakDays: 1,
    };
    setUser(newUser);
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newUser));
    } catch {}
    setIsLoading(false);
    return true;
  };

  const logout = async () => {
    setUser(null);
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.setItem(AUTH_LOGGED_OUT_KEY, '1');
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
