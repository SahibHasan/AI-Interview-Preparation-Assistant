import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  PlusCircle,
  TrendingUp,
  Video,
  Radar,
  Flame,
  Bot,
  ArrowRight,
  Sparkles,
  FileSearch,
  CheckCircle2,
  AlertTriangle,
  Play,
  FileText,
  Sliders,
  ChevronRight,
  BookOpen,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { AnimatedCounter } from '../components/common/AnimatedCounter';
import { Skeleton } from '../components/common/Skeleton';
import { useToast } from '../context/ToastContext';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { sessionHistory, resumeAnalysis, learningPlan, interviewSetup, updateInterviewSetup } = useApp();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [dateRange, setDateRange] = useState<'30d' | 'loop' | 'all'>('loop');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filterTrack, setFilterTrack] = useState<string>('all');

  const baseReadiness = user?.readinessScore ?? (sessionHistory.length > 0 ? sessionHistory[0].score : 0);
  const readinessScore =
    sessionHistory.length === 0
      ? baseReadiness
      : dateRange === '30d'
      ? Math.max(0, baseReadiness - 4)
      : dateRange === 'all'
      ? Math.max(0, baseReadiness - 8)
      : baseReadiness;
  const actualSessionsCount = sessionHistory.length;
  const completedCount = actualSessionsCount;
  const avgScore =
    actualSessionsCount > 0
      ? Math.round(
          sessionHistory.reduce((acc, s) => acc + (s.score || (s as any).overallScore || 0), 0) /
            actualSessionsCount
        )
      : 0;

  const handleRefreshData = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      showToast({
        title: 'Telemetry Synced',
        message: 'Benchmark metrics and candidate skill graph updated with latest session results.',
        type: 'success',
      });
    }, 600);
  };

  const handleLaunchSpotlightDrill = () => {
    updateInterviewSetup({
      targetRole: 'Senior Frontend Engineer',
      targetCompany: 'Stripe',
      interviewType: 'system-design',
      difficulty: 'senior-staff',
    });
    showToast({
      title: 'Drill Configured',
      message: 'Launching Distributed Cache Architecture mock session...',
      type: 'info',
    });
    navigate('/live-session');
  };

  const filteredSessions = sessionHistory.filter((s) => {
    if (filterTrack === 'all') return true;
    return s.track.toLowerCase().includes(filterTrack.toLowerCase());
  });

  return (
    <div className="flex flex-col w-full gap-6 pb-12 antialiased">
      {/* Top Welcome & Status Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-col gap-1 text-left">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-heading text-2xl sm:text-3xl font-bold text-[#0b1c30] tracking-tight">
              Welcome back, {user?.name || 'Alex Morgan'}
            </h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#eff4ff] text-[#3525cd] text-xs font-semibold border border-[#c7c4d8]/40 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-[#3525cd] animate-pulse" />
              Target: {user?.targetRole || 'Senior Frontend Engineer'} @ {user?.targetCompany || 'Stripe'}
            </span>
          </div>
          <p className="text-sm text-[#464555]">
            Your executive AI coach has updated your benchmark metrics based on recent mock interview assessments.
          </p>
        </div>

        {/* Schedule & Interactive Filters Bar */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Cohort range switcher */}
          <div className="inline-flex bg-white p-1 rounded-xl border border-[#e2e8f0] shadow-sm text-xs font-semibold text-[#565e74]">
            <button
              onClick={() => setDateRange('loop')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                dateRange === 'loop' ? 'bg-[#4f46e5] text-white shadow-sm' : 'hover:text-[#0b1c30]'
              }`}
            >
              Stripe Loop
            </button>
            <button
              onClick={() => setDateRange('30d')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                dateRange === '30d' ? 'bg-[#4f46e5] text-white shadow-sm' : 'hover:text-[#0b1c30]'
              }`}
            >
              Last 30 Days
            </button>
            <button
              onClick={() => setDateRange('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                dateRange === 'all' ? 'bg-[#4f46e5] text-white shadow-sm' : 'hover:text-[#0b1c30]'
              }`}
            >
              All Time
            </button>
          </div>

          <button
            onClick={handleRefreshData}
            disabled={isRefreshing}
            className="p-2.5 bg-white hover:bg-[#eff4ff] text-[#565e74] hover:text-[#0b1c30] border border-[#e2e8f0] rounded-xl shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-[#4f46e5]"
            title="Refresh candidate telemetry"
            aria-label="Refresh candidate metrics"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#4f46e5]' : ''}`} />
          </button>

          <Link
            to="/interview-setup"
            className="bg-[#4f46e5] hover:bg-[#3525cd] text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 active:scale-95 focus-visible:ring-2 focus-visible:ring-[#4f46e5]"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Configure Mock</span>
          </Link>
        </div>
      </div>

      {/* KPI Metrics 4-Card Grid with Animated Count-ups and SVG Rings */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 text-left">
        {/* KPI 1: Readiness Score */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white p-5 rounded-xl border border-[#e2e8f0] shadow-sm flex flex-col justify-between hover:shadow-md hover:border-[#cbd5e1] transition-all"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#464555]">
                Overall Readiness
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                {isRefreshing ? (
                  <Skeleton className="h-9 w-20" />
                ) : (
                  <span className="font-heading text-3xl font-bold text-[#0b1c30]">
                    <AnimatedCounter value={readinessScore} suffix="%" />
                  </span>
                )}
                <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full bg-[#eff4ff] text-[#3525cd]">
                  <TrendingUp className="w-3.5 h-3.5 mr-0.5" />+6% wk
                </span>
              </div>
            </div>

            {/* Circular Progress SVG with Animated Stroke */}
            <div className="relative w-12 h-12 flex items-center justify-center">
              <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-[#e5eeff]"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.5"
                />
                <motion.path
                  className="text-[#4f46e5]"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  initial={{ strokeDasharray: '0, 100' }}
                  animate={{ strokeDasharray: `${readinessScore}, 100` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  strokeLinecap="round"
                  strokeWidth="3.5"
                />
              </svg>
              <Sparkles className="w-4 h-4 text-[#4f46e5] absolute" />
            </div>
          </div>

          <div className="mt-4 pt-3 bg-[#eff4ff]/60 rounded-lg px-2.5 py-1.5 flex items-center justify-between text-[#464555] text-xs">
            <span>Benchmark: Stripe L5/L6</span>
            <span className="text-[#0b1c30] font-semibold">Tier 1 Target</span>
          </div>
        </motion.div>

        {/* KPI 2: Completed Sessions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="bg-white p-5 rounded-xl border border-[#e2e8f0] shadow-sm flex flex-col justify-between hover:shadow-md hover:border-[#cbd5e1] transition-all"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#464555]">
                Mock Sessions
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                {isRefreshing ? (
                  <Skeleton className="h-9 w-16" />
                ) : (
                  <span className="font-heading text-3xl font-bold text-[#0b1c30]">
                    <AnimatedCounter value={completedCount} />
                  </span>
                )}
                <span className="text-xs text-[#464555]">Completed</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#eff4ff] flex items-center justify-center text-[#3525cd]">
              <Video className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-4 pt-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-semibold text-[#0b1c30]">{avgScore}/100</span>
              <span className="text-[#464555]">Avg Score</span>
            </div>
            <div className="w-24 bg-[#e5eeff] rounded-full h-2 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, Math.max(0, avgScore))}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="bg-[#4f46e5] h-2 rounded-full"
              />
            </div>
          </div>
        </motion.div>

        {/* KPI 3: Skill Coverage */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-white p-5 rounded-xl border border-[#e2e8f0] shadow-sm flex flex-col justify-between hover:shadow-md hover:border-[#cbd5e1] transition-all"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#464555]">
                Skill Alignment
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                {isRefreshing ? (
                  <Skeleton className="h-9 w-16" />
                ) : (
                  <span className="font-heading text-3xl font-bold text-[#0b1c30]">
                    <AnimatedCounter value={resumeAnalysis.matchAnalysis.overallMatchPercentage} suffix="%" />
                  </span>
                )}
                <span className="text-xs text-[#3525cd] font-semibold">18/21 Skills</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#eff4ff] flex items-center justify-center text-[#3525cd]">
              <Radar className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-4 pt-3">
            <div className="w-full bg-[#e5eeff] rounded-full h-2 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${resumeAnalysis.matchAnalysis.overallMatchPercentage}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="bg-[#3525cd] h-2 rounded-full"
              />
            </div>
            <span className="text-[11px] text-[#464555] mt-1.5 block">
              Aligned to Stripe Core Bar
            </span>
          </div>
        </motion.div>

        {/* KPI 4: Practice Streak */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="bg-white p-5 rounded-xl border border-[#e2e8f0] shadow-sm flex flex-col justify-between hover:shadow-md hover:border-[#cbd5e1] transition-all"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#464555]">
                Active Streak
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-heading text-3xl font-bold text-[#0b1c30]">
                  <AnimatedCounter value={user?.streakDays || 5} suffix=" Days" />
                </span>
                <Flame className="w-4 h-4 text-orange-500 fill-orange-500 animate-bounce" />
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
              <Flame className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-4 pt-3 flex items-center justify-between text-xs text-[#464555]">
            <span>Milestone Badge: 7-Day Sprint</span>
            <span className="text-[#3525cd] font-semibold">2 days to go</span>
          </div>
        </motion.div>
      </div>

      {/* Primary Recommendation Spotlight Hero Card (matching Stitch) */}
      <motion.div
        initial={{ opacity: 0, scale: 0.99 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="relative overflow-hidden bg-white rounded-2xl p-6 border border-[#e2e8f0] shadow-sm text-left hover:border-[#cbd5e1] transition-all"
      >
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-[#e2dfff] rounded-full blur-3xl opacity-40 pointer-events-none" />

        <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div className="flex items-start gap-4 max-w-3xl">
            <div className="w-14 h-14 rounded-2xl bg-[#3525cd] text-white flex items-center justify-center shrink-0 shadow-sm">
              <Bot className="w-7 h-7" />
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-[#eff4ff] text-[#3525cd] text-[11px] font-bold tracking-wide uppercase">
                  AI Recommendation Priority #1
                </span>
                <span className="text-[#464555] text-xs">Estimated time: 45 mins</span>
              </div>
              <h2 className="font-heading text-xl font-bold text-[#0b1c30] tracking-tight">
                System Design Mock: Distributed Cache Architecture &amp; Client Caching
              </h2>
              <p className="text-sm text-[#464555] leading-relaxed">
                Stripe frontend assessments evaluate how client state interfaces with CDNs, Redis clusters, and optimistic updates. Your System Design score (68%) is your primary delta to achieving offer probability.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <Link
              to="/learning-plan"
              className="bg-[#eff4ff] hover:bg-[#e5eeff] text-[#0b1c30] px-4 py-3 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 border border-[#c7c4d8]/40 active:scale-95 focus-visible:ring-2 focus-visible:ring-[#4f46e5]"
            >
              <BookOpen className="w-4 h-4" />
              <span>View Syllabus</span>
            </Link>
            <button
              onClick={handleLaunchSpotlightDrill}
              className="bg-[#4f46e5] hover:bg-[#3525cd] text-white px-5 py-3 rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 active:scale-95 focus-visible:ring-2 focus-visible:ring-[#4f46e5]"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Start This Drill</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* Main Dual Grid: Recent Sessions + Action Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-left">
        {/* Left Column (8 cols): Recent Interviews & Competencies */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Recent Mock Interviews List */}
          <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#e2e8f0] mb-4">
              <div>
                <h3 className="font-heading text-lg font-bold text-[#0b1c30]">Recent Mock Sessions</h3>
                <p className="text-xs text-[#464555]">Historical evaluation records audited against company bars</p>
              </div>

              {/* Filter track buttons */}
              <div className="flex items-center gap-1 bg-[#f8f9ff] p-1 rounded-lg border border-[#e2e8f0] text-xs">
                {['all', 'System Architecture', 'Technical Deep-Dive'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setFilterTrack(t)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                      filterTrack === t ? 'bg-[#4f46e5] text-white shadow-sm' : 'text-[#565e74] hover:text-[#0b1c30]'
                    }`}
                  >
                    {t === 'all' ? 'All Tracks' : t}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {filteredSessions.length === 0 ? (
                <div className="p-8 rounded-xl bg-[#f8f9ff] border border-dashed border-[#c7d2fe] text-center space-y-2">
                  <p className="text-sm font-semibold text-[#0b1c30]">No mock interview sessions recorded yet</p>
                  <p className="text-xs text-[#565e74]">
                    Complete a verbal interview with our AI interviewer to generate your real-time scorecard and track progress across logins.
                  </p>
                  <Link
                    to="/interview-setup"
                    className="inline-flex items-center gap-1.5 mt-2 px-4 py-2 rounded-lg bg-[#4f46e5] hover:bg-[#3525cd] text-white text-xs font-semibold transition-colors"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Start First Mock Interview</span>
                  </Link>
                </div>
              ) : (
                filteredSessions.slice(0, 4).map((session) => (
                  <div
                    key={session.id}
                    className="p-4 rounded-xl bg-[#f8f9ff] border border-[#e2e8f0] hover:border-[#cbd5e1] hover:bg-white transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-white border border-[#e2e8f0] flex items-center justify-center shrink-0 text-[#3525cd] group-hover:bg-[#eff4ff] transition-colors">
                        <Video className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-heading text-sm font-bold text-[#0b1c30] truncate">
                            {session.title}
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#e5eeff] text-[#3525cd]">
                            {session.company}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-[#565e74] mt-1 flex-wrap">
                          <span>{session.date}</span>
                          <span>•</span>
                          <span>{session.duration}</span>
                          <span>•</span>
                          <span className="text-amber-800 font-medium">Gap: {session.keyWeakness}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                      <div className="text-right">
                        <span className="font-heading text-lg font-bold text-[#0b1c30]">{session.score}</span>
                        <span className="text-xs text-[#777587]">/100</span>
                      </div>

                      <Link
                        to={`/evaluation-reports?sessionId=${encodeURIComponent(session.id)}`}
                        className="px-3 py-1.5 rounded-lg bg-white hover:bg-[#eff4ff] text-[#0b1c30] border border-[#e2e8f0] text-xs font-semibold transition-colors flex items-center gap-1 active:scale-95"
                      >
                        <FileText className="w-3.5 h-3.5 text-[#4f46e5]" />
                        <span>Scorecard</span>
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-[#e2e8f0] text-center">
              <Link
                to="/analytics-history"
                className="text-xs font-semibold text-[#4f46e5] hover:text-[#3525cd] inline-flex items-center gap-1"
              >
                <span>
                  {actualSessionsCount > 0
                    ? `View Full ${actualSessionsCount}-Session Historical Log & Telemetry`
                    : 'View Historical Log & Telemetry'}
                </span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Competency Gap Analysis Callout */}
          <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm p-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#e2e8f0] mb-4">
              <div>
                <h3 className="font-heading text-lg font-bold text-[#0b1c30]">Critical Skill Gaps Identified</h3>
                <p className="text-xs text-[#464555]">Derived from Stripe Job Description &amp; your mock answer telemetry</p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-50 text-red-700 border border-red-200">
                3 Actionable Gaps
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {resumeAnalysis.matchAnalysis.missingSkills.map((gap, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-[#f8f9ff] border border-red-100 flex flex-col justify-between hover:shadow-sm hover:border-red-200 transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-red-700 uppercase tracking-wider bg-red-50 px-2 py-0.5 rounded-full">
                        {gap.importance}
                      </span>
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                    </div>
                    <h4 className="font-semibold text-xs text-[#0b1c30]">{gap.skill}</h4>
                    <p className="text-[11px] text-[#565e74] mt-1">Domain: {gap.category}</p>
                  </div>
                  <Link
                    to="/learning-plan"
                    className="mt-3 text-xs font-semibold text-[#4f46e5] hover:underline flex items-center gap-1"
                  >
                    <span>View Drills</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Persona, Quick Tools, Curriculum Widget */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Active AI Coach Persona Card */}
          <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm p-5 relative overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-[#e2e8f0] mb-4">
              <span className="text-xs font-bold text-[#0b1c30] uppercase tracking-wider">Assigned AI Coach</span>
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                Calibrated Active
              </span>
            </div>

            <div className="flex items-center gap-3 mb-4">
              <img
                src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=256"
                alt="Sarah"
                className="w-12 h-12 rounded-full object-cover ring-2 ring-[#e5eeff]"
              />
              <div>
                <h4 className="font-heading text-sm font-bold text-[#0b1c30]">{interviewSetup.aiPersona}</h4>
                <p className="text-xs text-[#464555]">Principal Architect &amp; Hiring Bar Raiser</p>
                <span className="text-[10px] text-[#3525cd] font-medium">Stripe L6 Calibration Engine</span>
              </div>
            </div>

            <p className="text-xs text-[#464555] bg-[#eff4ff]/60 p-3 rounded-lg border border-[#c7c4d8]/30 leading-relaxed mb-4">
              “Your distributed state answers are solid. In our next loop, I will probe failure states: leader re-elections and WAN jitter spikes.”
            </p>

            <Link
              to="/live-session"
              className="w-full py-2.5 rounded-lg bg-[#4f46e5] hover:bg-[#3525cd] text-white text-xs font-semibold transition-all flex items-center justify-center gap-2 active:scale-95 shadow-sm"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Resume Live Mock With {interviewSetup.aiPersona}</span>
            </Link>
          </div>

          {/* Quick Hub Launchers */}
          <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm p-5 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#0b1c30] mb-2">Platform Quick Hub</h4>

            <Link
              to="/resume-job-match"
              className="flex items-center justify-between p-3 rounded-lg bg-[#f8f9ff] hover:bg-[#eff4ff] border border-[#e2e8f0] transition-all group"
            >
              <div className="flex items-center gap-2.5">
                <FileSearch className="w-4 h-4 text-[#4f46e5]" />
                <div className="text-left">
                  <div className="text-xs font-semibold text-[#0b1c30]">Resume &amp; JD Match</div>
                  <div className="text-[11px] text-[#565e74]">Match score: 84% (ATS Ready)</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#777587] group-hover:text-[#4f46e5] group-hover:translate-x-0.5 transition-all" />
            </Link>

            <Link
              to="/interview-setup"
              className="flex items-center justify-between p-3 rounded-lg bg-[#f8f9ff] hover:bg-[#eff4ff] border border-[#e2e8f0] transition-all group"
            >
              <div className="flex items-center gap-2.5">
                <Sliders className="w-4 h-4 text-[#4f46e5]" />
                <div className="text-left">
                  <div className="text-xs font-semibold text-[#0b1c30]">Custom Interview Setup</div>
                  <div className="text-[11px] text-[#565e74]">Tech, Behavioral, System Design</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#777587] group-hover:text-[#4f46e5] group-hover:translate-x-0.5 transition-all" />
            </Link>

            <Link
              to="/learning-plan"
              className="flex items-center justify-between p-3 rounded-lg bg-[#f8f9ff] hover:bg-[#eff4ff] border border-[#e2e8f0] transition-all group"
            >
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#4f46e5]" />
                <div className="text-left">
                  <div className="text-xs font-semibold text-[#0b1c30]">Learning Roadmap</div>
                  <div className="text-[11px] text-[#565e74]">
                    {learningPlan.completedModules}/{learningPlan.totalModules} modules mastered
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#777587] group-hover:text-[#4f46e5] group-hover:translate-x-0.5 transition-all" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
