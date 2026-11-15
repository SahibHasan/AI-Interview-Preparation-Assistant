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
  const { learningPlan } = useApp();
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

  const readinessScore = user?.readinessScore ?? 78;

  const sidebarContent = (
    <aside className="h-full w-72 bg-[#0f172a] text-[#ffffff] flex flex-col justify-between shadow-[0_1px_8px_rgba(0,0,0,0.06)] border-r border-[#1e293b] select-none">
      <div className="flex flex-col">
        {/* Brand Header */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-[#1e293b]">
          <NavLink
            to="/dashboard"
            className="flex items-center gap-2.5 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4f46e5] rounded-lg p-1"
          >
            <motion.div
              whileHover={{ rotate: 12, scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              className="w-9 h-9 rounded-lg bg-[#4f46e5] flex items-center justify-center text-white shadow-sm group-hover:bg-[#4338ca] transition-colors"
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
                  `relative flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4f46e5] active:scale-[0.98] ${
                    isActive
                      ? 'bg-[#4f46e5] text-white shadow-sm font-semibold'
                      : 'text-[#94a3b8] hover:bg-[#1e293b] hover:text-white'
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
                        className="absolute right-2 w-1.5 h-4 bg-white/80 rounded-full"
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
          className="bg-[#1e293b] hover:bg-[#253248] rounded-xl p-3.5 border border-[#334155]/60 shadow-inner block transition-all group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4f46e5]"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-white group-hover:text-[#c3c0ff] transition-colors flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-[#4f46e5]" />
              Readiness Score
            </span>
            <span className="text-xs font-bold text-[#c3c0ff]">{readinessScore}%</span>
          </div>
          <div className="w-full bg-[#334155] rounded-full h-1.5 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${readinessScore}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="bg-[#4f46e5] h-1.5 rounded-full"
            />
          </div>
          <div className="flex items-center justify-between mt-2 text-[11px] text-[#94a3b8]">
            <span className="truncate">{user?.targetRole || 'Senior Staff'}</span>
            <span className="text-[#c3c0ff] font-medium">{learningPlan.completionPercentage}% plan</span>
          </div>
        </NavLink>

        {/* Settings & Logout */}
        <div className="flex flex-col gap-1 border-t border-[#1e293b] pt-2">
          <NavLink
            to="/profile-settings"
            onClick={onCloseMobile}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2 rounded-lg text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4f46e5] active:scale-[0.98] ${
                isActive
                  ? 'bg-[#4f46e5] text-white font-semibold'
                  : 'text-[#94a3b8] hover:bg-[#1e293b] hover:text-white'
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
