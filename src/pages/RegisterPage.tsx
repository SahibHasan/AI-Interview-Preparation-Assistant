import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plane,
  Lock,
  Mail,
  User as UserIcon,
  Briefcase,
  Building,
  ArrowRight,
  Shield,
  Loader2,
  CheckCircle2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { OAuthAccountModal } from '../components/common/OAuthAccountModal';
import { INTERVIEW_ROLE_OPTIONS, CUSTOM_ROLE_VALUE } from '../utils/roleCatalog';

export const RegisterPage: React.FC = () => {
  const { isAuthenticated, register, loginWithOAuth } = useAuth();
  const { updateInterviewSetup } = useApp();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [roleChoice, setRoleChoice] = useState<string>('Software Developer');
  const [customRole, setCustomRole] = useState('');
  const [targetCompany, setTargetCompany] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [oauthModalProvider, setOauthModalProvider] = useState<'google' | 'github' | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const resolvedRole = roleChoice === CUSTOM_ROLE_VALUE ? customRole.trim() : roleChoice;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !email.trim() || !password) {
      setError('Please fill in your full name, email, and password.');
      return;
    }
    if (!resolvedRole) {
      setError('Please select or enter your target job role.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    const finalCompany = targetCompany.trim() || 'Stripe';
    setLoading(true);
    try {
      await register(name.trim(), email.trim().toLowerCase(), password, resolvedRole, finalCompany);
      updateInterviewSetup({ targetRole: resolvedRole, targetCompany: finalCompany });
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(err?.message || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmOAuth = async (account: { email: string; name?: string }) => {
    if (!oauthModalProvider) return;
    setError(null);
    setLoading(true);
    try {
      await loginWithOAuth(oauthModalProvider, account);
      setOauthModalProvider(null);
      navigate('/dashboard', { replace: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#f8f9ff] min-h-screen flex flex-col justify-between antialiased">
      {/* Header */}
      <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-lg bg-[#4f46e5] flex items-center justify-center text-white shadow-sm group-hover:bg-[#3525cd] transition-colors">
            <Plane className="w-5 h-5" />
          </div>
          <span className="font-heading text-lg font-bold text-[#0b1c30] tracking-tight">
            PrepPilot<span className="text-[#4f46e5] ml-0.5">AI</span>
          </span>
        </Link>

        <div className="flex items-center gap-1.5 text-[#565e74] text-xs font-semibold px-3 py-1.5 bg-[#eff4ff] rounded-lg border border-[#c7c4d8]/40">
          <Shield className="w-3.5 h-3.5 text-[#00659a]" />
          <span>Private Enclave Setup</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center w-full px-4 py-8">
        <div className="flex flex-col w-full items-center justify-center relative max-w-lg">
          <div className="w-full bg-white rounded-2xl shadow-sm border border-[#e2e8f0] p-6 sm:p-8 flex flex-col relative z-10">
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-xl bg-[#4f46e5] text-white flex items-center justify-center shadow-sm mx-auto mb-3">
                <Plane className="w-6 h-6" />
              </div>
              <h1 className="font-heading text-2xl font-bold text-[#0b1c30] tracking-tight">
                Create Candidate Account
              </h1>
              <p className="text-xs sm:text-sm text-[#565e74] mt-1">
                Configure your target role to calibrate tailored mock interviews
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
                {error}
              </div>
            )}

            {/* Quick Single Sign-On Providers */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <button
                type="button"
                onClick={() => setOauthModalProvider('google')}
                disabled={loading}
                className="flex items-center justify-center gap-2 py-2.5 px-3 bg-[#eff4ff] hover:bg-[#e5eeff] text-[#0b1c30] rounded-lg transition-colors text-xs font-semibold border border-[#c7c4d8]/50 shadow-xs"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                </svg>
                <span>Google</span>
              </button>

              <button
                type="button"
                onClick={() => setOauthModalProvider('github')}
                disabled={loading}
                className="flex items-center justify-center gap-2 py-2.5 px-3 bg-[#eff4ff] hover:bg-[#e5eeff] text-[#0b1c30] rounded-lg transition-colors text-xs font-semibold border border-[#c7c4d8]/50 shadow-xs"
              >
                <svg className="w-4 h-4 fill-current text-[#0b1c30]" viewBox="0 0 24 24">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
                <span>GitHub</span>
              </button>
            </div>

            <div className="relative flex items-center justify-center mb-5">
              <div className="w-full h-px bg-[#e2e8f0]" />
              <span className="absolute px-3 bg-white text-[11px] text-[#777587] uppercase tracking-wider font-semibold">
                or sign up with email
              </span>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-left" autoComplete="on">
              {/* Full Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#0b1c30]" htmlFor="reg-name">
                  Full Name
                </label>
                <div className="relative flex items-center">
                  <UserIcon className="absolute left-3.5 w-4 h-4 text-[#777587]" />
                  <input
                    id="reg-name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    required
                    className="w-full bg-[#eff4ff] text-[#0b1c30] placeholder:text-[#777587] text-sm pl-10 pr-4 py-2.5 rounded-lg border border-[#c7c4d8]/50 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#4f46e5]"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#0b1c30]" htmlFor="reg-email">
                  Email Address
                </label>
                <div className="relative flex items-center">
                  <Mail className="absolute left-3.5 w-4 h-4 text-[#777587]" />
                  <input
                    id="reg-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full bg-[#eff4ff] text-[#0b1c30] placeholder:text-[#777587] text-sm pl-10 pr-4 py-2.5 rounded-lg border border-[#c7c4d8]/50 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#4f46e5]"
                  />
                </div>
              </div>

              {/* Target Role Dropdown & Target Company Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-[#0b1c30]" htmlFor="reg-role">
                    Target Role
                  </label>
                  <div className="relative flex items-center">
                    <Briefcase className="absolute left-3.5 w-4 h-4 text-[#777587] pointer-events-none" />
                    <select
                      id="reg-role"
                      value={roleChoice}
                      onChange={(e) => setRoleChoice(e.target.value)}
                      className="w-full bg-[#eff4ff] text-[#0b1c30] text-sm pl-10 pr-3 py-2.5 rounded-lg border border-[#c7c4d8]/50 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#4f46e5]"
                    >
                      {INTERVIEW_ROLE_OPTIONS.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                      <option value={CUSTOM_ROLE_VALUE}>Other (Custom Role)...</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-[#0b1c30]" htmlFor="reg-company">
                    Target Company
                  </label>
                  <div className="relative flex items-center">
                    <Building className="absolute left-3.5 w-4 h-4 text-[#777587]" />
                    <input
                      id="reg-company"
                      type="text"
                      value={targetCompany}
                      onChange={(e) => setTargetCompany(e.target.value)}
                      placeholder="e.g. Google, Stripe"
                      className="w-full bg-[#eff4ff] text-[#0b1c30] placeholder:text-[#777587] text-sm pl-10 pr-4 py-2.5 rounded-lg border border-[#c7c4d8]/50 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#4f46e5]"
                    />
                  </div>
                </div>
              </div>

              {roleChoice === CUSTOM_ROLE_VALUE && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-[#0b1c30]" htmlFor="reg-custom-role">
                    Specify Custom Role
                  </label>
                  <input
                    id="reg-custom-role"
                    type="text"
                    value={customRole}
                    onChange={(e) => setCustomRole(e.target.value)}
                    placeholder="e.g. Embedded Systems Engineer"
                    required
                    className="w-full bg-[#eff4ff] text-[#0b1c30] text-sm px-3.5 py-2.5 rounded-lg border border-[#c7c4d8]/50 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#4f46e5]"
                  />
                </div>
              )}

              {/* Password */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#0b1c30]" htmlFor="reg-pass">
                  Password
                </label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3.5 w-4 h-4 text-[#777587]" />
                  <input
                    id="reg-pass"
                    name="new-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    required
                    minLength={6}
                    className="w-full bg-[#eff4ff] text-[#0b1c30] placeholder:text-[#777587] text-sm pl-10 pr-10 py-2.5 rounded-lg border border-[#c7c4d8]/50 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#4f46e5]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 p-1 text-[#777587] hover:text-[#0b1c30]"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="p-3 bg-[#eff4ff] rounded-lg border border-[#c7c4d8]/40 text-xs text-[#565e74]">
                <div className="flex items-center gap-1.5 font-semibold text-[#3525cd] mb-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Isolated Candidate Workspace</span>
                </div>
                <span>Your uploaded profile image, resumes, and mock interview scorecards stay tied to your email.</span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 rounded-lg bg-[#4f46e5] hover:bg-[#3525cd] text-white font-semibold text-sm transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating Workspace...</span>
                  </>
                ) : (
                  <>
                    <span>Create Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center text-xs text-[#565e74] border-t border-[#e2e8f0] pt-4">
              <span>Already have an account? </span>
              <Link to="/login" className="text-[#3525cd] font-semibold hover:underline">
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </main>

      <footer className="w-full text-center py-4 text-xs text-[#777587]">
        PrepPilot AI • Engineering Interview Preparation Workspace
      </footer>

      <OAuthAccountModal
        open={oauthModalProvider !== null}
        provider={oauthModalProvider || 'google'}
        loading={loading}
        onClose={() => setOauthModalProvider(null)}
        onConfirm={handleConfirmOAuth}
      />
    </div>
  );
};
