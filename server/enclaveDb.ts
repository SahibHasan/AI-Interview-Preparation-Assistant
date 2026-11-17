import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { hashPassword, verifyPassword } from './authCrypto';

export type AuthProvider = 'email' | 'google' | 'github';

export const DEFAULT_AVATAR_URL =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256';

export interface StoredUserAccount {
  id: string;
  email: string;
  passwordHash?: string;
  authProvider: AuthProvider;
  providerSubject?: string;
  fullName: string;
  avatarUrl: string;
  targetRole: string;
  targetCompany: string;
  emailVerified: boolean;
  lastLoginAt: string;
  createdAt: string;
  updatedAt: string;
}

interface EnclaveSnapshot {
  userAccounts: Record<string, StoredUserAccount>; // keyed by normalized lowercase email
  profiles: Record<string, any>; // keyed by userId
  resumes: Record<string, any>;
  sessions: Record<string, any[]>;
  evaluations: Record<string, any>;
  evaluationHistory: Record<string, any[]>;
  learningPlans: Record<string, any>;
}

const createEmptySnapshot = (): EnclaveSnapshot => ({
  userAccounts: {},
  profiles: {},
  resumes: {},
  sessions: {},
  evaluations: {},
  evaluationHistory: {},
  learningPlans: {},
});

export class EnclaveDatabase {
  private filePath: string;
  private state: EnclaveSnapshot;

  constructor(dbFilePath = path.resolve(process.cwd(), '.data', 'preppilot_enclave_db.json')) {
    this.filePath = dbFilePath;
    this.state = createEmptySnapshot();
    this.load();
    this.seedDefaults();
  }

  private load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          this.state = {
            userAccounts: parsed.userAccounts || {},
            profiles: parsed.profiles || {},
            resumes: parsed.resumes || {},
            sessions: parsed.sessions || {},
            evaluations: parsed.evaluations || {},
            evaluationHistory: parsed.evaluationHistory || {},
            learningPlans: parsed.learningPlans || {},
          };
        }
      }
    } catch (err) {
      console.warn('[EnclaveDB] Failed to load persisted DB file, starting fresh:', err);
      this.state = createEmptySnapshot();
    }
  }

  private save() {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const tmpPath = `${this.filePath}.tmp`;
      fs.writeFileSync(tmpPath, JSON.stringify(this.state, null, 2), 'utf8');
      fs.renameSync(tmpPath, this.filePath);
    } catch (err) {
      console.warn('[EnclaveDB] Failed to persist DB file:', err);
    }
  }

  private seedDefaults() {
    const demoEmail = 'alex.morgan@example.com';
    if (!this.state.userAccounts[demoEmail]) {
      const now = new Date().toISOString();
      const demoId = 'a1e80000-1111-4444-8888-000000000001';
      this.state.userAccounts[demoEmail] = {
        id: demoId,
        email: demoEmail,
        passwordHash: hashPassword('password123'),
        authProvider: 'email',
        fullName: 'Alex Morgan',
        avatarUrl: DEFAULT_AVATAR_URL,
        targetRole: 'Senior Frontend Engineer',
        targetCompany: 'Stripe',
        emailVerified: true,
        lastLoginAt: now,
        createdAt: now,
        updatedAt: now,
      };
      this.state.profiles[demoId] = {
        id: demoId,
        userId: demoId,
        email: demoEmail,
        fullName: 'Alex Morgan',
        avatarUrl: DEFAULT_AVATAR_URL,
        authProvider: 'email',
        targetRole: 'Senior Frontend Engineer',
        targetCompany: 'Stripe',
        experienceLevel: 'senior-staff',
        readinessScore: 78,
        streakDays: 5,
      };
      this.save();
    }
  }

  public findUserByEmail(email: string): StoredUserAccount | undefined {
    const normalized = String(email || '').trim().toLowerCase();
    return normalized ? this.state.userAccounts[normalized] : undefined;
  }

  public findUserById(userId: string): StoredUserAccount | undefined {
    if (!userId) return undefined;
    return Object.values(this.state.userAccounts).find((u) => u.id === userId);
  }

  public sanitizeUser(account: StoredUserAccount) {
    const profile = this.state.profiles[account.id];
    const resolvedAvatar = profile?.avatarUrl || account.avatarUrl || DEFAULT_AVATAR_URL;
    return {
      id: account.id,
      email: account.email,
      name: profile?.fullName || account.fullName,
      avatarUrl: resolvedAvatar,
      authProvider: account.authProvider,
      targetRole: profile?.targetRole || account.targetRole,
      targetCompany: profile?.targetCompany || account.targetCompany,
      user_metadata: {
        full_name: profile?.fullName || account.fullName,
        avatar_url: resolvedAvatar,
        target_role: profile?.targetRole || account.targetRole,
        target_company: profile?.targetCompany || account.targetCompany,
      },
    };
  }

  public registerEmailUser(input: {
    id?: string;
    email: string;
    password: string;
    name?: string;
    targetRole?: string;
    targetCompany?: string;
    avatarUrl?: string;
  }): { ok: true; user: ReturnType<EnclaveDatabase['sanitizeUser']> } | { ok: false; status: number; error: string } {
    const normalized = String(input.email || '').trim().toLowerCase();
    if (!normalized) {
      return { ok: false, status: 400, error: 'Email is required.' };
    }
    if (!input.password || input.password.length < 6) {
      return { ok: false, status: 400, error: 'Password must be at least 6 characters.' };
    }

    const existing = this.state.userAccounts[normalized];
    if (existing && existing.passwordHash) {
      return { ok: false, status: 409, error: 'An account with this email already exists. Please sign in.' };
    }

    const now = new Date().toISOString();
    const userId = existing?.id || input.id || crypto.randomUUID();
    const fullName =
      input.name?.trim() ||
      existing?.fullName ||
      normalized.split('@')[0]?.replace('.', ' ').replace(/^\w/, (c) => c.toUpperCase()) ||
      'Candidate';
    const targetRole = input.targetRole?.trim() || existing?.targetRole || 'Senior Frontend Engineer';
    const targetCompany = input.targetCompany?.trim() || existing?.targetCompany || 'Stripe';
    const avatarUrl = input.avatarUrl || existing?.avatarUrl || DEFAULT_AVATAR_URL;

    const record: StoredUserAccount = {
      id: userId,
      email: normalized,
      passwordHash: hashPassword(input.password),
      authProvider: 'email',
      fullName,
      avatarUrl,
      targetRole,
      targetCompany,
      emailVerified: true,
      lastLoginAt: now,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    this.state.userAccounts[normalized] = record;
    this.state.profiles[userId] = {
      ...(this.state.profiles[userId] || {}),
      id: userId,
      userId,
      email: normalized,
      fullName,
      avatarUrl,
      authProvider: 'email',
      targetRole,
      targetCompany,
      readinessScore: this.state.profiles[userId]?.readinessScore ?? 65,
      streakDays: this.state.profiles[userId]?.streakDays ?? 1,
    };
    this.save();

    return { ok: true, user: this.sanitizeUser(record) };
  }

  public authenticateEmailUser(input: {
    email: string;
    password?: string;
  }): { ok: true; user: ReturnType<EnclaveDatabase['sanitizeUser']> } | { ok: false; status: number; error: string } {
    const normalized = String(input.email || '').trim().toLowerCase();
    if (!normalized) {
      return { ok: false, status: 400, error: 'Email is required.' };
    }

    const now = new Date().toISOString();
    const existing = this.state.userAccounts[normalized];

    if (!existing) {
      return {
        ok: false,
        status: 401,
        error: 'No account found with this email. Please check your spelling or create an account first.',
      };
    }

    if (existing.passwordHash) {
      if (!input.password || !verifyPassword(input.password, existing.passwordHash)) {
        return { ok: false, status: 401, error: 'Incorrect password. Please try again or reset your password.' };
      }
    } else if (existing.authProvider !== 'email') {
      return {
        ok: false,
        status: 401,
        error: `This account was created with ${existing.authProvider === 'google' ? 'Google' : 'GitHub'}. Sign in with that provider or use Forgot Password to set an email password.`,
      };
    } else if (input.password && input.password !== 'oauth-session') {
      existing.passwordHash = hashPassword(input.password);
    }

    existing.lastLoginAt = now;
    existing.updatedAt = now;
    this.state.userAccounts[normalized] = existing;
    this.save();
    return { ok: true, user: this.sanitizeUser(existing) };
  }

  public resetPassword(input: {
    email: string;
    newPassword: string;
  }): { ok: true } | { ok: false; status: number; error: string } {
    const normalized = String(input.email || '').trim().toLowerCase();
    if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      return { ok: false, status: 400, error: 'Please enter a valid account email address.' };
    }
    if (!input.newPassword || input.newPassword.length < 6) {
      return { ok: false, status: 400, error: 'New password must be at least 6 characters.' };
    }
    const existing = this.state.userAccounts[normalized];
    if (!existing) {
      return {
        ok: false,
        status: 404,
        error: 'No account exists for that email address. Create a new account instead.',
      };
    }
    existing.passwordHash = hashPassword(input.newPassword);
    existing.updatedAt = new Date().toISOString();
    this.state.userAccounts[normalized] = existing;
    this.save();
    return { ok: true };
  }

  public authenticateOAuthUser(input: {
    provider: 'google' | 'github';
    email?: string;
    name?: string;
    avatarUrl?: string;
    providerSubject?: string;
  }) {
    const rawEmail = String(input.email || '').trim().toLowerCase();
    if (!rawEmail) {
      throw new Error(`Please provide your ${input.provider === 'google' ? 'Google email' : 'GitHub email or username'} to sign in.`);
    }
    const normalized = rawEmail.includes('@')
      ? rawEmail
      : `${rawEmail.replace(/^@+/, '').replace(/[^a-z0-9._-]/g, '')}@users.noreply.github.com`;
    const now = new Date().toISOString();
    let existing = this.state.userAccounts[normalized];

    if (existing) {
      existing.lastLoginAt = now;
      existing.updatedAt = now;
      if (!existing.authProvider) {
        existing.authProvider = input.provider;
      }
      if (input.name?.trim() && (!existing.fullName || existing.fullName === 'Candidate')) {
        existing.fullName = input.name.trim();
      }
      // Keep any user-uploaded avatar; only fill if currently blank or default
      if (
        input.avatarUrl &&
        (!existing.avatarUrl || existing.avatarUrl === DEFAULT_AVATAR_URL)
      ) {
        existing.avatarUrl = input.avatarUrl;
      }
      this.state.userAccounts[normalized] = existing;
      this.state.profiles[existing.id] = {
        ...(this.state.profiles[existing.id] || {}),
        id: existing.id,
        userId: existing.id,
        email: existing.email,
        fullName: this.state.profiles[existing.id]?.fullName || existing.fullName,
        avatarUrl: this.state.profiles[existing.id]?.avatarUrl || existing.avatarUrl,
        authProvider: existing.authProvider,
      };
      this.save();
      return this.sanitizeUser(existing);
    }

    const userId = crypto.randomUUID();
    const localHandle = normalized.split('@')[0] || 'Candidate';
    const defaultName =
      input.name?.trim() ||
      localHandle.replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) ||
      'Candidate';
    const avatarUrl = input.avatarUrl || DEFAULT_AVATAR_URL;

    existing = {
      id: userId,
      email: normalized,
      authProvider: input.provider,
      providerSubject: input.providerSubject || `${input.provider}:${normalized}`,
      fullName: defaultName,
      avatarUrl,
      targetRole: 'Software Developer',
      targetCompany: 'Stripe',
      emailVerified: true,
      lastLoginAt: now,
      createdAt: now,
      updatedAt: now,
    };

    this.state.userAccounts[normalized] = existing;
    this.state.profiles[userId] = {
      id: userId,
      userId,
      email: normalized,
      fullName: defaultName,
      avatarUrl,
      authProvider: input.provider,
      targetRole: 'Software Developer',
      targetCompany: 'Stripe',
      experienceLevel: 'mid',
      readinessScore: 68,
      streakDays: 1,
    };
    this.save();

    return this.sanitizeUser(existing);
  }

  public syncExternalUser(input: {
    id: string;
    email: string;
    password?: string;
    name?: string;
    avatarUrl?: string;
    authProvider?: AuthProvider;
    targetRole?: string;
    targetCompany?: string;
  }) {
    const normalized = String(input.email || '').trim().toLowerCase();
    if (!normalized || !input.id) return;
    const now = new Date().toISOString();
    const existing = this.state.userAccounts[normalized];
    const resolvedAvatar =
      (this.state.profiles[input.id]?.avatarUrl && this.state.profiles[input.id]?.avatarUrl !== DEFAULT_AVATAR_URL
        ? this.state.profiles[input.id]?.avatarUrl
        : undefined) ||
      (existing?.avatarUrl && existing.avatarUrl !== DEFAULT_AVATAR_URL ? existing.avatarUrl : undefined) ||
      input.avatarUrl ||
      this.state.profiles[input.id]?.avatarUrl ||
      existing?.avatarUrl ||
      DEFAULT_AVATAR_URL;

    const fullName = input.name || existing?.fullName || 'Candidate';
    const targetRole = input.targetRole || existing?.targetRole || 'Senior Frontend Engineer';
    const targetCompany = input.targetCompany || existing?.targetCompany || 'Stripe';
    const authProvider = input.authProvider || existing?.authProvider || 'email';

    this.state.userAccounts[normalized] = {
      id: input.id,
      email: normalized,
      passwordHash: input.password ? hashPassword(input.password) : existing?.passwordHash,
      authProvider,
      fullName,
      avatarUrl: resolvedAvatar,
      targetRole,
      targetCompany,
      emailVerified: true,
      lastLoginAt: now,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };
    this.state.profiles[input.id] = {
      ...(this.state.profiles[input.id] || {}),
      id: input.id,
      userId: input.id,
      email: normalized,
      fullName: this.state.profiles[input.id]?.fullName || fullName,
      avatarUrl: resolvedAvatar,
      authProvider,
      targetRole: this.state.profiles[input.id]?.targetRole || targetRole,
      targetCompany: this.state.profiles[input.id]?.targetCompany || targetCompany,
    };
    this.save();
  }

  // Profile operations
  public getProfile(userId: string) {
    const profile = this.state.profiles[userId] || null;
    if (!profile) return null;
    const acct = this.findUserById(userId);
    if (!profile.avatarUrl && acct?.avatarUrl) {
      return { ...profile, avatarUrl: acct.avatarUrl, email: profile.email || acct.email };
    }
    return profile;
  }

  public upsertProfile(userId: string, updates: Record<string, any>) {
    const existing = this.state.profiles[userId] || { id: userId, userId };
    const merged = { ...existing, ...updates, id: userId, userId };
    this.state.profiles[userId] = merged;

    // Keep user_accounts synced so re-login returns updated avatarUrl & metadata
    const acct =
      this.findUserById(userId) ||
      (updates.email ? this.findUserByEmail(updates.email) : undefined);

    if (acct) {
      if (updates.avatarUrl) acct.avatarUrl = updates.avatarUrl;
      if (updates.fullName) acct.fullName = updates.fullName;
      if (updates.targetRole) acct.targetRole = updates.targetRole;
      if (updates.targetCompany) acct.targetCompany = updates.targetCompany;
      acct.updatedAt = new Date().toISOString();
      this.state.userAccounts[acct.email] = acct;
    }

    this.save();
    return merged;
  }

  public updateAvatar(userId: string, avatarUrl: string, email?: string) {
    const acct = this.findUserById(userId) || (email ? this.findUserByEmail(email) : undefined);
    const targetUserId = acct?.id || userId;
    const existing = this.state.profiles[targetUserId] || { id: targetUserId, userId: targetUserId };
    this.state.profiles[targetUserId] = {
      ...existing,
      avatarUrl,
      email: email || existing.email || acct?.email,
    };

    if (acct) {
      acct.avatarUrl = avatarUrl;
      acct.updatedAt = new Date().toISOString();
      this.state.userAccounts[acct.email] = acct;
    }

    this.save();
    return avatarUrl;
  }

  // Resumes
  public getResume(userId: string) {
    return this.state.resumes[userId] || null;
  }
  public setResume(userId: string, resume: any) {
    this.state.resumes[userId] = resume;
    this.save();
  }

  // Sessions
  public getSessions(userId: string): any[] {
    return this.state.sessions[userId] || [];
  }
  public prependSession(userId: string, entry: any) {
    const existing = this.state.sessions[userId] || [];
    this.state.sessions[userId] = [entry, ...existing];
    this.save();
  }

  // Evaluations (latest + full per-user history)
  public getEvaluation(userId: string) {
    const history = this.state.evaluationHistory[userId];
    if (Array.isArray(history) && history.length > 0) {
      return history[0];
    }
    return this.state.evaluations[userId] || null;
  }

  public getEvaluations(userId: string): any[] {
    const history = this.state.evaluationHistory[userId];
    if (Array.isArray(history) && history.length > 0) {
      return history;
    }
    const single = this.state.evaluations[userId];
    return single ? [single] : [];
  }

  public getEvaluationByIdOrSession(userId: string, idOrSessionId: string) {
    if (!idOrSessionId) return this.getEvaluation(userId);
    const list = this.getEvaluations(userId);
    return (
      list.find((r) => r.id === idOrSessionId || r.sessionId === idOrSessionId) ||
      null
    );
  }

  public saveEvaluation(userId: string, report: any) {
    const existingList = Array.isArray(this.state.evaluationHistory[userId])
      ? this.state.evaluationHistory[userId]
      : this.state.evaluations[userId]
      ? [this.state.evaluations[userId]]
      : [];

    const filtered = existingList.filter(
      (r) => r.id !== report.id && (!report.sessionId || r.sessionId !== report.sessionId)
    );
    const nextList = [report, ...filtered];

    this.state.evaluations[userId] = report;
    this.state.evaluationHistory[userId] = nextList;

    if (typeof report.overallScore === 'number' && this.state.profiles[userId]) {
      this.state.profiles[userId].readinessScore = Math.round(report.overallScore);
    }

    this.save();
    return report;
  }

  public setEvaluation(userId: string, report: any) {
    return this.saveEvaluation(userId, report);
  }

  // Learning Plans
  public getLearningPlan(userId: string) {
    return this.state.learningPlans[userId] || null;
  }
  public setLearningPlan(userId: string, plan: any) {
    this.state.learningPlans[userId] = plan;
    this.save();
  }
  public toggleLearningModule(userId: string, moduleId: string, completed: boolean) {
    const plan = this.state.learningPlans[userId];
    if (plan && Array.isArray(plan.modules)) {
      plan.modules = plan.modules.map((m: any) => (m.id === moduleId ? { ...m, completed: !!completed } : m));
      this.state.learningPlans[userId] = plan;
      this.save();
    }
  }
}
