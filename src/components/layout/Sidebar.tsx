import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LayoutDashboard,
  FileSearch,
  Sliders,
  Video,
  FileSpreadsheet,
  BrainCircuit,
  TrendingUp,
  Settings,
  LogOut,
  Plane,
  X,
  Target,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { Tooltip } from '../common/Tooltip';
import { useToast } from '../../context/ToastContext';

interface SidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onCloseMobile }) => {
  const { user, logout } = useAuth();
  const { learningPlan, interviewSetup, sessionHistory } = useApp();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Resume & Job Match', path: '/resume-job-match', icon: FileSearch },
    { label: 'Interview Setup', path: '/interview-setup', icon: Sliders },
    { label: 'Live Session', path: '/live-session', icon: Video },
    { label: 'Evaluation Reports', path: '/evaluation-reports', icon: FileSpreadsheet },
    { label: 'Learning Plan', path: '/learning-plan', icon: BrainCircuit },
    { label: 'Analytics & History', path: '/analytics-history', icon: TrendingUp },
  ];

  const handleLogout = () => {
    logout();
    showToast({
      title: 'Signed Out',
      message: 'You have been safely signed out of your candidate workspace.',
      type: 'info',
    });
    navigate('/login');
  };

  const readinessScore = user?.readinessScore ?? (sessionHistory.length > 0 ? sessionHistory[0].score : 0);

  const sidebarContent = (
    <aside className="h-full w-72 glass-dark text-[#ffffff] flex flex-col justify-between select-none">
      <div className="flex flex-col">
        {/* Brand Header */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-white/10">
          <NavLink
            to="/dashboard"
            className="flex items-center gap-2.5 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4f46e5] rounded-lg p-1"
          >
            <motion.div
              whileHover={{ rotate: 12, scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              className="w-9 h-9 rounded-xl glass-btn-primary flex items-center justify-center text-white"
            >
              <Plane className="w-5 h-5" />
            </motion.div>
            <div className="flex flex-col text-left">
              <span className="font-heading text-lg font-bold tracking-tight text-white leading-none">
                PrepPilot<span className="text-[#c3c0ff] ml-0.5"> AI</span>
              </span>
              <span className="text-[10px] text-[#94a3b8] tracking-wider uppercase leading-none mt-1">
                Interview Copilot
              </span>
            </div>
          </NavLink>

          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="lg:hidden text-[#94a3b8] hover:text-white p-1 rounded-md transition-colors focus-visible:ring-2 focus-visible:ring-[#4f46e5] focus-visible:outline-none"
              aria-label="Close navigation"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Section Label */}
        <div className="px-6 pt-5 pb-2 text-left">
          <span className="text-[11px] font-semibold text-[#64748b] uppercase tracking-wider">
            Intelligence Suite
          </span>
        </div>

        {/* Navigation Items with interactive indicators */}
        <nav className="flex flex-col gap-1 px-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onCloseMobile}
                className={({ isActive }) =>
                  `relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4f46e5] active:scale-[0.98] ${
                    isActive
                      ? 'bg-gradient-to-r from-[#4f46e5] to-[#4338ca] text-white shadow-[0_8px_20px_-6px_rgba(79,70,229,0.55),inset_0_1px_0_rgba(255,255,255,0.22)] font-semibold'
                      : 'text-[#94a3b8] hover:bg-white/[0.07] hover:text-white'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-transform duration-150 ${
                        isActive ? 'scale-110 text-white' : 'text-[#94a3b8] group-hover:text-white'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                    {isActive && (
                      <motion.div
                        layoutId="activeNavIndicator"
                        className="absolute right-2.5 w-1.5 h-4 bg-white/85 rounded-full"
                        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                      />
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Footer Area: Readiness Card & Settings */}
      <div className="px-4 pb-5 flex flex-col gap-3">
        {/* Interactive Readiness Card */}
        <NavLink
          to="/analytics-history"
          onClick={onCloseMobile}
          className="bg-white/[0.06] hover:bg-white/[0.1] backdrop-blur-md rounded-2xl p-3.5 border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] block transition-all group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4f46e5]"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-white group-hover:text-[#c3c0ff] transition-colors flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-[#818cf8]" />
              Readiness Score
            </span>
            <span className="text-xs font-bold font-mono tabular-nums text-[#c3c0ff]">{readinessScore}%</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${readinessScore}%` }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="bg-gradient-to-r from-[#6366f1] to-[#38bdf8] h-1.5 rounded-full"
            />
          </div>
          <div className="flex items-center justify-between mt-2 text-[11px] text-[#94a3b8]">
            <span className="truncate">
              {interviewSetup.targetRole || user?.targetRole || 'Software Developer'}
            </span>
            <span className="text-[#c3c0ff] font-medium shrink-0 ml-2 font-mono tabular-nums">
              {learningPlan.completionPercentage}% plan
            </span>
          </div>
        </NavLink>

        {/* Settings & Logout */}
        <div className="flex flex-col gap-1 border-t border-white/10 pt-2">
          <NavLink
            to="/profile-settings"
            onClick={onCloseMobile}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2 rounded-xl text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4f46e5] active:scale-[0.98] ${
                isActive
                  ? 'bg-[#4f46e5] text-white font-semibold'
                  : 'text-[#94a3b8] hover:bg-white/[0.07] hover:text-white'
              }`
            }
          >
            <Settings className="w-4 h-4" />
            <span>Profile & Settings</span>
          </NavLink>

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3.5 py-2 rounded-lg text-sm text-[#94a3b8] hover:bg-red-500/10 hover:text-red-400 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 active:scale-[0.98]"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <div className="hidden lg:block fixed left-0 top-0 h-full w-72 z-40">
        {sidebarContent}
      </div>

      {/* Mobile Drawer Overlay with Framer Motion slide */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={onCloseMobile}
            />
            <motion.div
              initial={{ x: -288 }}
              animate={{ x: 0 }}
              exit={{ x: -288 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative z-10 h-full"
            >
              {sidebarContent}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
