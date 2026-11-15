import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plane, ArrowRight, Menu, X, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const PublicNavbar: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 w-full z-50 bg-[#f8f9ff]/90 backdrop-blur-xl border-b border-[#e2e8f0]/80 shadow-[0_1px_8px_rgba(0,0,0,0.03)]">
      <div className="h-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-6">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-lg bg-[#4f46e5] flex items-center justify-center text-white shadow-sm group-hover:bg-[#3525cd] transition-colors">
            <Plane className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-heading text-lg font-bold tracking-tight text-[#0b1c30] leading-none">
              PrepPilot<span className="text-[#4f46e5] ml-0.5">AI</span>
            </span>
            <span className="text-[10px] text-[#464555] tracking-wider uppercase leading-none mt-1">
              Interview Copilot
            </span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden xl:flex items-center gap-6">
          <a href="#features" className="text-sm font-semibold text-[#464555] hover:text-[#0b1c30] transition-colors py-1">
            Features
          </a>
          <a href="#how-it-works" className="text-sm font-semibold text-[#464555] hover:text-[#0b1c30] transition-colors py-1">
            How It Works
          </a>
          <a href="#roles" className="text-sm font-semibold text-[#464555] hover:text-[#0b1c30] transition-colors py-1">
            Roles & Companies
          </a>
          <a href="#rubrics" className="text-sm font-semibold text-[#464555] hover:text-[#0b1c30] transition-colors py-1">
            Rubrics & Pricing
          </a>
        </nav>

        {/* CTA Controls */}
        <div className="hidden sm:flex items-center gap-3">
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#4f46e5] hover:bg-[#3525cd] text-white font-semibold text-sm transition-all shadow-sm"
            >
              <span>Go to Console</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="inline-flex items-center font-semibold text-sm text-[#464555] hover:text-[#0b1c30] transition-colors px-4 py-2"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-[#4f46e5] hover:bg-[#3525cd] text-white font-semibold text-sm transition-all shadow-sm"
              >
                Start Free Trial
              </Link>
            </>
          )}

          <Link
            to={isAuthenticated ? "/profile-settings" : "/login"}
            className="w-8 h-8 rounded-full bg-[#3525cd] text-white flex items-center justify-center hover:opacity-90 transition-opacity"
            title={user ? user.name : "Sign In"}
          >
            <UserIcon className="w-4 h-4" />
          </Link>
        </div>

        {/* Mobile Hamburger */}
        <div className="flex sm:hidden items-center gap-2">
          <Link
            to={isAuthenticated ? "/dashboard" : "/login"}
            className="px-3.5 py-1.5 rounded-lg bg-[#4f46e5] text-white text-xs font-semibold"
          >
            {isAuthenticated ? "Console" : "Sign In"}
          </Link>
          <button
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="p-2 rounded-lg text-[#0b1c30] hover:bg-[#e5eeff]"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-t border-[#e2e8f0] bg-[#f8f9ff] px-4 py-4 flex flex-col gap-3 shadow-lg">
          <a
            href="#features"
            onClick={() => setMobileMenuOpen(false)}
            className="text-sm font-semibold text-[#464555] py-1.5"
          >
            Features
          </a>
          <a
            href="#how-it-works"
            onClick={() => setMobileMenuOpen(false)}
            className="text-sm font-semibold text-[#464555] py-1.5"
          >
            How It Works
          </a>
          <a
            href="#roles"
            onClick={() => setMobileMenuOpen(false)}
            className="text-sm font-semibold text-[#464555] py-1.5"
          >
            Roles & Companies
          </a>
          <a
            href="#rubrics"
            onClick={() => setMobileMenuOpen(false)}
            className="text-sm font-semibold text-[#464555] py-1.5"
          >
            Rubrics & Pricing
          </a>
          <div className="border-t border-[#e2e8f0] pt-3 flex flex-col gap-2">
            <Link
              to="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="text-center py-2 text-sm font-semibold text-[#464555] bg-[#eff4ff] rounded-lg"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              onClick={() => setMobileMenuOpen(false)}
              className="text-center py-2 text-sm font-semibold text-white bg-[#4f46e5] rounded-lg"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
