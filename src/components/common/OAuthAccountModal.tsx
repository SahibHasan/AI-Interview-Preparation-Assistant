import React, { useState, useEffect } from 'react';
import { X, ArrowRight, Mail, User as UserIcon, Plus, Loader2 } from 'lucide-react';

export interface SavedOAuthAccount {
  provider: 'google' | 'github';
  email: string;
  name: string;
}

const RECENT_OAUTH_KEY = 'preppilot_recent_oauth_accounts_v1';

export function getSavedOAuthAccounts(provider: 'google' | 'github'): SavedOAuthAccount[] {
  try {
    const raw = localStorage.getItem(RECENT_OAUTH_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is SavedOAuthAccount =>
        item &&
        item.provider === provider &&
        typeof item.email === 'string' &&
        item.email.length > 0 &&
        item.email !== 'google.candidate@example.com' &&
        item.email !== 'github.candidate@example.com'
    );
  } catch {
    return [];
  }
}

export function rememberOAuthAccount(account: SavedOAuthAccount): void {
  if (
    !account.email ||
    account.email === 'google.candidate@example.com' ||
    account.email === 'github.candidate@example.com'
  ) {
    return;
  }
  try {
    const raw = localStorage.getItem(RECENT_OAUTH_KEY);
    const existing: SavedOAuthAccount[] = raw ? JSON.parse(raw) : [];
    const filtered = (Array.isArray(existing) ? existing : []).filter(
      (a) =>
        !(a.provider === account.provider && a.email.toLowerCase() === account.email.toLowerCase()) &&
        a.email !== 'google.candidate@example.com' &&
        a.email !== 'github.candidate@example.com'
    );
    localStorage.setItem(RECENT_OAUTH_KEY, JSON.stringify([account, ...filtered].slice(0, 6)));
  } catch {
    // Ignore storage issues
  }
}

interface OAuthAccountModalProps {
  open: boolean;
  provider: 'google' | 'github';
  loading?: boolean;
  onClose: () => void;
  onConfirm: (account: { email: string; name?: string }) => Promise<void>;
}

export const OAuthAccountModal: React.FC<OAuthAccountModalProps> = ({
  open,
  provider,
  loading = false,
  onClose,
  onConfirm,
}) => {
  const [recentAccounts, setRecentAccounts] = useState<SavedOAuthAccount[]>([]);
  const [showCustomForm, setShowCustomForm] = useState(true);
  const [emailInput, setEmailInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const saved = getSavedOAuthAccounts(provider);
    setRecentAccounts(saved);
    setShowCustomForm(saved.length === 0);
    setEmailInput('');
    setNameInput('');
    setFormError(null);
  }, [open, provider]);

  if (!open) return null;

  const isGoogle = provider === 'google';
  const providerTitle = isGoogle ? 'Google' : 'GitHub';

  const handleSubmitCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const trimmed = emailInput.trim();
    if (!trimmed) {
      setFormError(
        isGoogle
          ? 'Please enter your Google / Gmail address.'
          : 'Please enter your GitHub email or username.'
      );
      return;
    }
    if (isGoogle && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setFormError('Please enter a valid Google email address (e.g. you@gmail.com).');
      return;
    }
    try {
      await onConfirm({
        email: trimmed.toLowerCase(),
        name: nameInput.trim() || undefined,
      });
    } catch (err: any) {
      setFormError(err?.message || `Unable to complete ${providerTitle} sign-in.`);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="oauth-modal-title"
    >
      <div className="glass-panel-elevated rounded-2xl max-w-md w-full p-6 text-left">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200/70 mb-4">
          <div className="flex items-center gap-2.5">
            {isGoogle ? (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
              </svg>
            ) : (
              <svg className="w-5 h-5 fill-current text-[#0b1c30]" viewBox="0 0 24 24">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
            )}
            <h2 id="oauth-modal-title" className="font-heading text-base font-bold text-[#0b1c30]">
              Continue with {providerTitle}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="Close provider dialog"
            className="p-1 text-[#565e74] hover:text-[#0b1c30] rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-[#565e74] mb-4 leading-relaxed">
          {recentAccounts.length > 0 && !showCustomForm
            ? `Choose the ${providerTitle} account you want to sign in with, or enter another account.`
            : `Enter your own ${providerTitle} account details to link or restore your saved profile, photo, and interview reports.`}
        </p>

        {formError && (
          <div className="mb-3 p-2.5 rounded-lg bg-red-50/90 border border-red-200 text-red-700 text-xs">
            {formError}
          </div>
        )}

        {recentAccounts.length > 0 && !showCustomForm ? (
          <div className="space-y-2">
            {recentAccounts.map((acct) => (
              <button
                key={`${acct.provider}_${acct.email}`}
                type="button"
                disabled={loading}
                onClick={() => void onConfirm({ email: acct.email, name: acct.name })}
                className="w-full p-3 rounded-xl glass-subcard hover:border-[#4f46e5]/50 flex items-center justify-between gap-3 text-left transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full glass-btn-primary text-white font-bold text-xs flex items-center justify-center shrink-0">
                    {(acct.name || acct.email).slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-[#0b1c30] truncate">{acct.name}</div>
                    <div className="text-[11px] text-[#565e74] truncate">{acct.email}</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-[#4f46e5] shrink-0" />
              </button>
            ))}

            <button
              type="button"
              onClick={() => setShowCustomForm(true)}
              className="w-full p-2.5 rounded-xl border border-dashed border-[#c7d2fe] hover:bg-white/70 text-xs font-semibold text-[#3525cd] flex items-center justify-center gap-1.5 transition-colors mt-2"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Use another {providerTitle} account</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmitCustom} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-[#0b1c30] mb-1" htmlFor="oauth-email-input">
                {isGoogle ? 'Google / Gmail Email Address' : 'GitHub Email or Username'}
              </label>
              <div className="relative flex items-center">
                <Mail className="absolute left-3 w-4 h-4 text-[#777587]" />
                <input
                  id="oauth-email-input"
                  type={isGoogle ? 'email' : 'text'}
                  autoFocus
                  autoComplete="off"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder={isGoogle ? 'you@gmail.com' : 'you@example.com or github-handle'}
                  className="w-full glass-input text-[#0b1c30] placeholder:text-[#777587] text-sm pl-9 pr-3 py-2.5 rounded-xl focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0b1c30] mb-1" htmlFor="oauth-name-input">
                Display Name (optional for returning accounts)
              </label>
              <div className="relative flex items-center">
                <UserIcon className="absolute left-3 w-4 h-4 text-[#777587]" />
                <input
                  id="oauth-name-input"
                  type="text"
                  autoComplete="off"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Your full name"
                  className="w-full glass-input text-[#0b1c30] placeholder:text-[#777587] text-sm pl-9 pr-3 py-2.5 rounded-xl focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              {recentAccounts.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowCustomForm(false)}
                  className="px-3.5 py-2 rounded-lg text-xs font-semibold text-[#565e74] hover:bg-[#eff4ff] border border-[#e2e8f0]"
                >
                  Back
                </button>
              )}
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#4f46e5] hover:bg-[#3525cd] text-white shadow-sm flex items-center gap-1.5 disabled:opacity-70"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <span>Continue as Account</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
