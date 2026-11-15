import React, { useState } from 'react';
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
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const { updateInterviewSetup } = useApp();
  const navigate = useNavigate();

  const [name, setName] = useState('Alex Morgan');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [targetRole, setTargetRole] = useState('Senior Frontend Engineer');
  const [targetCompany, setTargetCompany] = useState('Stripe');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name || !email || !password) {
      setError('Please fill in all required fields.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      await register(name, email, password, targetRole, targetCompany);
      updateInterviewSetup({ targetRole, targetCompany });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Failed to create account. Please try again.');
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
          <span>Private Enclave Setup</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center w-full px-4 py-8">
        <div className="flex flex-col w-full items-center justify-center relative max-w-lg">
          <div className="w-full bg-white rounded-2xl shadow-md border border-[#e2e8f0] p-6 sm:p-8 flex flex-col relative z-10">
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-xl bg-[#4f46e5] text-white flex items-center justify-center shadow-sm mx-auto mb-3">
                <Plane className="w-6 h-6" />
              </div>
              <h1 className="font-heading text-2xl font-bold text-[#0b1c30] tracking-tight">
                Create Candidate Account
              </h1>
              <p className="text-xs sm:text-sm text-[#565e74] mt-1">
                Configure your target track to calibrate tailored interview simulations
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-left">
              {/* Full Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#0b1c30]" htmlFor="reg-name">
                  Candidate Full Name
                </label>
                <div className="relative flex items-center">
                  <UserIcon className="absolute left-3.5 w-4 h-4 text-[#777587]" />
                  <input
                    id="reg-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Alex Morgan"
                    required
                    className="w-full bg-[#eff4ff] text-[#0b1c30] placeholder:text-[#777587] text-sm pl-10 pr-4 py-2.5 rounded-lg border border-[#c7c4d8]/40 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#4f46e5]"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#0b1c30]" htmlFor="reg-email">
                  Work or Personal Email
                </label>
                <div className="relative flex items-center">
                  <Mail className="absolute left-3.5 w-4 h-4 text-[#777587]" />
                  <input
                    id="reg-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex@example.com"
                    required
                    className="w-full bg-[#eff4ff] text-[#0b1c30] placeholder:text-[#777587] text-sm pl-10 pr-4 py-2.5 rounded-lg border border-[#c7c4d8]/40 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#4f46e5]"
                  />
                </div>
              </div>

              {/* Target Role & Target Company Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-[#0b1c30]" htmlFor="reg-role">
                    Target Role Track
                  </label>
                  <div className="relative flex items-center">
                    <Briefcase className="absolute left-3.5 w-4 h-4 text-[#777587]" />
                    <input
                      id="reg-role"
                      type="text"
                      value={targetRole}
                      onChange={(e) => setTargetRole(e.target.value)}
                      placeholder="e.g. Senior Frontend"
                      required
                      className="w-full bg-[#eff4ff] text-[#0b1c30] placeholder:text-[#777587] text-sm pl-10 pr-4 py-2.5 rounded-lg border border-[#c7c4d8]/40 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#4f46e5]"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-[#0b1c30]" htmlFor="reg-company">
                    Primary Target Company
                  </label>
                  <div className="relative flex items-center">
                    <Building className="absolute left-3.5 w-4 h-4 text-[#777587]" />
                    <input
                      id="reg-company"
                      type="text"
                      value={targetCompany}
                      onChange={(e) => setTargetCompany(e.target.value)}
                      placeholder="e.g. Stripe, Google"
                      required
                      className="w-full bg-[#eff4ff] text-[#0b1c30] placeholder:text-[#777587] text-sm pl-10 pr-4 py-2.5 rounded-lg border border-[#c7c4d8]/40 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#4f46e5]"
                    />
                  </div>
                </div>
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#0b1c30]" htmlFor="reg-pass">
                  Secure Password
                </label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3.5 w-4 h-4 text-[#777587]" />
                  <input
                    id="reg-pass"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    required
                    className="w-full bg-[#eff4ff] text-[#0b1c30] placeholder:text-[#777587] text-sm pl-10 pr-4 py-2.5 rounded-lg border border-[#c7c4d8]/40 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#4f46e5]"
                  />
                </div>
              </div>

              <div className="p-3 bg-[#eff4ff] rounded-lg border border-[#c7c4d8]/40 text-xs text-[#565e74]">
                <div className="flex items-center gap-1.5 font-semibold text-[#3525cd] mb-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Immediate Academic &amp; Project Demo Access</span>
                </div>
                <span>Full access to resume parsing, adaptive interview loops, and custom rubrics.</span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 rounded-lg bg-[#4f46e5] hover:bg-[#3525cd] text-white font-semibold text-sm transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Provisioning Candidate Workspace...</span>
                  </>
                ) : (
                  <>
                    <span>Create Candidate Workspace</span>
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
    </div>
  );
};
