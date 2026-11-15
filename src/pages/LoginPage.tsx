import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plane,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  Shield,
  Loader2,
  CheckCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const { login, loginWithOAuth } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('alex.morgan@example.com');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Failed to authenticate. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: 'google' | 'github') => {
    setError(null);
    setLoading(true);
    try {
      const normalized = email.trim().toLowerCase();
      const customEmail =
        normalized && normalized !== 'alex.morgan@example.com' ? normalized : undefined;
      await loginWithOAuth(provider, customEmail);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.message || `Failed to sign in with ${provider}.`);
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

        <div className="flex items-center gap-1.5 text-[#565e74] text-xs font-semibold px-3 py-1.5 bg-[#eff4ff] rounded-full border border-[#c7c4d8]/40">
          <Shield className="w-3.5 h-3.5 text-[#00659a]" />
          <span>256-Bit SSL Enclave</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center w-full px-4 py-8">
        <div className="flex flex-col w-full items-center justify-center relative max-w-md">
          {/* Subtle Ambient Glows */}
          <div className="absolute -top-12 -left-12 w-80 h-80 bg-[#e2dfff] opacity-40 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -right-16 w-80 h-80 bg-[#dae2fd] opacity-40 rounded-full blur-3xl pointer-events-none" />

          {/* Floating Recent Prep Activity Toast (matching Stitch design) */}
          <aside
            aria-label="Recent activity notification"
            className="mb-6 w-full bg-white/95 backdrop-blur-md rounded-xl shadow-sm border border-[#e2e8f0] p-3 flex items-center justify-between gap-3 transition-all hover:shadow-md"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative shrink-0 w-8 h-8 rounded-full overflow-hidden bg-[#e5eeff]">
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256"
                  alt="Alex Morgan"
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#4f46e5] rounded-full ring-2 ring-white" />
              </div>
              <div className="flex flex-col min-w-0 text-left">
                <div className="flex items-center gap-1 text-xs">
                  <span className="font-semibold text-[#0b1c30] truncate">Alex Morgan</span>
                  <span className="text-[#565e74] truncate">completed Stripe drill</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-[#777587]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4f46e5]" />
                  <span>12m ago • System Design Mock</span>
                </div>
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-1 bg-[#eff4ff] px-2.5 py-1 rounded-full text-[#3525cd]">
              <span className="text-xs font-bold">86%</span>
              <span className="text-[10px] text-[#565e74] font-medium">Readiness</span>
            </div>
          </aside>

          {/* Central Login Card */}
          <div className="w-full bg-white rounded-2xl shadow-md border border-[#e2e8f0] p-6 sm:p-8 flex flex-col relative z-10">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-12 h-12 rounded-xl bg-[#4f46e5] text-white flex items-center justify-center shadow-sm mb-3">
                <Plane className="w-6 h-6" />
              </div>
              <h1 className="font-heading text-2xl font-bold text-[#0b1c30] tracking-tight">
                Welcome back
              </h1>
              <p className="text-xs sm:text-sm text-[#565e74] mt-1 max-w-xs">
                Log in to your executive prep workspace and resume drills
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
                {error}
              </div>
            )}

            {/* Quick Single Sign-On Providers */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button
                type="button"
                onClick={() => handleOAuth('google')}
                disabled={loading}
                className="flex items-center justify-center gap-2 py-2.5 px-3 bg-[#eff4ff] hover:bg-[#e5eeff] text-[#0b1c30] rounded-lg transition-colors text-xs font-semibold border border-[#c7c4d8]/40 shadow-sm"
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
                onClick={() => handleOAuth('github')}
                disabled={loading}
                className="flex items-center justify-center gap-2 py-2.5 px-3 bg-[#eff4ff] hover:bg-[#e5eeff] text-[#0b1c30] rounded-lg transition-colors text-xs font-semibold border border-[#c7c4d8]/40 shadow-sm"
              >
                <svg className="w-4 h-4 fill-current text-[#0b1c30]" viewBox="0 0 24 24">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
                <span>GitHub</span>
              </button>
            </div>

            {/* Splitter */}
            <div className="relative flex items-center justify-center mb-6">
              <div className="w-full h-px bg-[#e2e8f0]" />
              <span className="absolute px-3 bg-white text-[11px] text-[#777587] uppercase tracking-wider font-semibold">
                or continue with email
              </span>
            </div>

            {/* Email & Password Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-xs font-semibold text-[#0b1c30]" htmlFor="auth-email">
                  Work or Personal Email
                </label>
                <div className="relative flex items-center">
                  <Mail className="absolute left-3.5 w-4 h-4 text-[#777587] pointer-events-none" />
                  <input
                    id="auth-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex.morgan@example.com"
                    required
                    className="w-full bg-[#eff4ff] text-[#0b1c30] placeholder:text-[#777587] text-sm pl-10 pr-4 py-2.5 rounded-lg border border-[#c7c4d8]/40 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#4f46e5] transition-all"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5 text-left">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#0b1c30]" htmlFor="auth-password">
                    Password
                  </label>
                  <span className="text-[11px] text-[#4f46e5] hover:underline cursor-pointer">
                    Forgot password?
                  </span>
                </div>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3.5 w-4 h-4 text-[#777587] pointer-events-none" />
                  <input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full bg-[#eff4ff] text-[#0b1c30] placeholder:text-[#777587] text-sm pl-10 pr-10 py-2.5 rounded-lg border border-[#c7c4d8]/40 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#4f46e5] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 p-1 text-[#777587] hover:text-[#0b1c30]"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none text-[#565e74]">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="rounded border-[#c7c4d8] text-[#4f46e5] focus:ring-[#4f46e5]"
                  />
                  <span>Remember this device for 30 days</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 rounded-lg bg-[#4f46e5] hover:bg-[#3525cd] text-white font-semibold text-sm transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Authenticating Enclave...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Workspace</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center text-xs text-[#565e74] border-t border-[#e2e8f0] pt-4">
              <span>New candidate? </span>
              <Link to="/register" className="text-[#3525cd] font-semibold hover:underline">
                Create an executive account
              </Link>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-2 text-xs text-[#777587]">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>Encrypted mock transcripts &amp; isolated private state</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full text-center py-4 text-xs text-[#777587]">
        PrepPilot AI • Secure Candidate Authentication Enclave
      </footer>
    </div>
  );
};
