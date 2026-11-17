import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Menu,
  ChevronRight,
  Play,
  Bell,
  Sparkles,
  Settings,
  LogOut,
  User as UserIcon,
  Check,
  FileSearch,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { getDefaultAvatarUrl } from '../../utils/avatar';

interface TopHeaderProps {
  onToggleMobileMenu: () => void;
}

interface NotificationItem {
  id: string;
  title: string;
  description: string;
  time: string;
  read: boolean;
  link: string;
}

export const TopHeader: React.FC<TopHeaderProps> = ({ onToggleMobileMenu }) => {
  const { user, logout } = useAuth();
  const { interviewSetup, sessionHistory, resumeAnalysis } = useApp();
  const { showToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [readIds, setReadIds] = useState<string[]>([]);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const notifications: NotificationItem[] = React.useMemo(() => {
    const items: NotificationItem[] = [];
    if (sessionHistory.length > 0) {
      const latest = sessionHistory[0];
      items.push({
        id: `session_${latest.id}`,
        title: `${latest.title} Scored`,
        description: `Latest evaluation: ${latest.score}/100 · ${latest.company}.`,
        time: latest.date,
        read: readIds.includes(`session_${latest.id}`),
        link: `/evaluation-reports?sessionId=${encodeURIComponent(latest.id)}`,
      });
    }
    if (
      resumeAnalysis?.fileName &&
      resumeAnalysis.fileName !== 'No resume uploaded yet' &&
      (resumeAnalysis.wordCount || 0) > 0
    ) {
      items.push({
        id: `resume_${resumeAnalysis.id || resumeAnalysis.fileName}`,
        title: `Resume ATS Score: ${resumeAnalysis.atsScore}/100`,
        description: `${resumeAnalysis.fileName} matched ${resumeAnalysis.matchAnalysis.overallMatchPercentage}% against target JD.`,
        time: 'Synced',
        read: readIds.includes(`resume_${resumeAnalysis.id || resumeAnalysis.fileName}`),
        link: '/resume-job-match',
      });
    }
    return items;
  }, [sessionHistory, resumeAnalysis, readIds]);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsRead = () => {
    setReadIds(notifications.map((n) => n.id));
    showToast({
      title: 'Notifications Cleared',
      message: 'All notifications marked as read.',
      type: 'info',
    });
  };

  const handleLogout = () => {
    logout();
    showToast({
      title: 'Signed Out',
      message: 'Session closed.',
      type: 'info',
    });
    navigate('/login');
  };

  const getPageTitle = (pathname: string): string => {
    switch (pathname) {
      case '/dashboard':
        return 'Console Dashboard';
      case '/resume-job-match':
        return 'Resume & Job Match';
      case '/interview-setup':
        return 'Interview Setup';
      case '/live-session':
        return 'Live Interview Room';
      case '/evaluation-reports':
        return 'Evaluation Reports';
      case '/learning-plan':
        return 'Learning Plan & Roadmap';
      case '/analytics-history':
        return 'Analytics & History';
      case '/profile-settings':
        return 'Profile & Settings';
      default:
        return 'Console';
    }
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-[#f8f9ff]/95 backdrop-blur-sm border-b border-[#e2e8f0] flex items-center justify-between px-4 sm:px-6 shadow-[0_1px_4px_rgba(15,23,42,0.03)] select-none">
      {/* Left: Mobile Toggle + Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileMenu}
          className="lg:hidden p-1.5 rounded-lg text-[#565e74] hover:bg-[#e5eeff] transition-colors focus-visible:ring-2 focus-visible:ring-[#4f46e5] focus-visible:outline-none"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-1.5 text-xs text-[#565e74] min-w-0">
          <Link
            to="/dashboard"
            className="hidden sm:inline hover:text-[#0b1c30] transition-colors font-medium focus-visible:underline"
          >
            Platform
          </Link>
          <ChevronRight className="hidden sm:inline w-3.5 h-3.5 text-[#777587] shrink-0" />
          <span className="font-semibold text-[#0b1c30] truncate max-w-[155px] sm:max-w-none">
            {getPageTitle(location.pathname)}
          </span>
        </div>
      </div>

      {/* Right: Quick Action, Target Badge, Notifications, User */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Target role indicator (hidden on small screens) */}
        <Link
          to="/interview-setup"
          data-testid="header-target-role-badge"
          className="hidden xl:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#e5eeff] text-[#3525cd] text-xs font-semibold hover:bg-[#dce9ff] transition-colors"
          title="Click to adjust target role & interview setup"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>
            {interviewSetup.targetCompany || user?.targetCompany || 'Stripe'} •{' '}
            {interviewSetup.targetRole || user?.targetRole || 'Software Developer'}
          </span>
        </Link>

        {/* Start Mock Interview Button */}
        <Link
          to="/interview-setup"
          className="flex items-center gap-1.5 bg-[#4f46e5] hover:bg-[#3525cd] text-white px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm active:scale-95 whitespace-nowrap shrink-0 focus-visible:ring-2 focus-visible:ring-[#4f46e5] focus-visible:outline-none"
        >
          <Play className="w-3.5 h-3.5 fill-current shrink-0" />
          <span className="hidden sm:inline">Start Mock Interview</span>
          <span className="sm:hidden">Start Mock</span>
        </Link>

        <div className="h-4 w-px bg-[#c7c4d8]/60 hidden sm:block" />

        {/* Interactive Notifications Bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => {
              setNotificationsOpen((prev) => !prev);
              setProfileMenuOpen(false);
            }}
            className="relative p-1.5 text-[#565e74] hover:text-[#0b1c30] hover:bg-[#e5eeff] rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-[#4f46e5] focus-visible:outline-none"
            aria-label={`View notifications (${unreadCount} unread)`}
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-[#3525cd] rounded-full ring-2 ring-white" />
            )}
          </button>

          {/* Notifications Dropdown Popover */}
          <AnimatePresence>
            {notificationsOpen && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.97 }}
                transition={{ duration: 0.14 }}
                className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-[#e2e8f0] p-4 text-left z-50"
              >
                <div className="flex items-center justify-between pb-3 border-b border-[#e2e8f0]">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#0b1c30] uppercase tracking-wider">
                      Session Alerts
                    </span>
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-md bg-[#eff4ff] text-[#3525cd] text-[10px] font-bold">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-[11px] font-semibold text-[#4f46e5] hover:underline flex items-center gap-1"
                    >
                      <Check className="w-3 h-3" />
                      <span>Mark all as read</span>
                    </button>
                  )}
                </div>

                <div className="divide-y divide-[#f1f5f9] max-h-72 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-xs text-[#565e74]">
                      No new alerts yet. Complete a mock interview or resume scan to see updates here.
                    </div>
                  ) : (
                    notifications.map((item) => (
                      <Link
                        key={item.id}
                        to={item.link}
                        onClick={() => setNotificationsOpen(false)}
                        className={`block p-3 rounded-lg hover:bg-[#f8f9ff] transition-colors ${
                          !item.read ? 'bg-[#eff4ff]/40' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-bold text-[#0b1c30]">{item.title}</span>
                          <span className="text-[10px] text-[#777587] shrink-0">{item.time}</span>
                        </div>
                        <p className="text-[11px] text-[#565e74] mt-1 leading-relaxed">
                          {item.description}
                        </p>
                      </Link>
                    ))
                  )}
                </div>

                <div className="pt-2 border-t border-[#e2e8f0] text-center">
                  <Link
                    to="/analytics-history"
                    onClick={() => setNotificationsOpen(false)}
                    className="text-xs font-semibold text-[#4f46e5] hover:text-[#3525cd] inline-flex items-center gap-1"
                  >
                    <span>View Session History Logs</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* User Profile Dropdown Menu */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => {
              setProfileMenuOpen((prev) => !prev);
              setNotificationsOpen(false);
            }}
            className="flex items-center gap-2 pl-1 group focus-visible:ring-2 focus-visible:ring-[#4f46e5] focus-visible:outline-none rounded-full"
            aria-label="User account menu"
          >
            <div className="relative">
              <img
                src={user?.avatarUrl || getDefaultAvatarUrl(user?.name || 'Candidate')}
                alt={user?.name || 'Candidate'}
                className="w-8 h-8 rounded-full object-cover ring-2 ring-[#e2e8f0] group-hover:ring-[#4f46e5] transition-all"
              />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white" />
            </div>
          </button>

          {/* User Profile Dropdown */}
          <AnimatePresence>
            {profileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.97 }}
                transition={{ duration: 0.14 }}
                className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-[#e2e8f0] p-2 text-left z-50"
              >
                <div className="px-3 py-2 border-b border-[#f1f5f9]">
                  <div className="text-xs font-bold text-[#0b1c30] truncate">{user?.name || 'Candidate'}</div>
                  <div className="text-[11px] text-[#565e74] truncate">{user?.email || 'Signed in'}</div>
                </div>

                <div className="py-1">
                  <Link
                    to="/profile-settings"
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-xs text-[#0b1c30] hover:bg-[#eff4ff] rounded-lg transition-colors font-medium"
                  >
                    <UserIcon className="w-3.5 h-3.5 text-[#565e74]" />
                    <span>Candidate Profile</span>
                  </Link>

                  <Link
                    to="/resume-job-match"
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-xs text-[#0b1c30] hover:bg-[#eff4ff] rounded-lg transition-colors font-medium"
                  >
                    <FileSearch className="w-3.5 h-3.5 text-[#565e74]" />
                    <span>Resume &amp; JD Matcher</span>
                  </Link>

                  <Link
                    to="/profile-settings"
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-xs text-[#0b1c30] hover:bg-[#eff4ff] rounded-lg transition-colors font-medium"
                  >
                    <Settings className="w-3.5 h-3.5 text-[#565e74]" />
                    <span>Calibration &amp; Enclave</span>
                  </Link>
                </div>

                <div className="pt-1 border-t border-[#f1f5f9]">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};
