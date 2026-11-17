import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
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
import { GlassTiltCard3D } from '../components/common/MotionPrimitives';

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

  const activeRole = interviewSetup.targetRole || user?.targetRole || 'Software Developer';
  const activeCompany = interviewSetup.targetCompany || user?.targetCompany || 'Stripe';

  const handleLaunchSpotlightDrill = () => {
    updateInterviewSetup({
      targetRole: activeRole,
      targetCompany: activeCompany,
      interviewType: 'system-design',
      difficulty: 'senior-staff',
    });
    showToast({
      title: 'Drill Configured',
      message: `Launching Distributed Cache Architecture mock for ${activeRole}...`,
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
              Welcome back, {user?.name || 'Candidate'}
            </h1>
            <Link
              to="/interview-setup"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#eff4ff] text-[#3525cd] text-xs font-semibold border border-[#c7c4d8]/50 hover:bg-[#e5eeff] transition-colors"
            >
              <span>Target: {activeRole} @ {activeCompany}</span>
            </Link>
          </div>
          <p className="text-sm text-[#464555]">
            Your executive AI coach has updated your benchmark metrics based on recent mock interview assessments.
          </p>
        </div>

        {/* Schedule & Interactive Filters Bar */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Cohort range switcher */}
          <div className="inline-flex glass-pill-bar p-1 rounded-xl text-xs font-semibold text-[#565e74]">
            <button
              onClick={() => setDateRange('loop')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                dateRange === 'loop' ? 'glass-btn-primary text-white' : 'hover:text-[#0b1c30]'
              }`}
            >
              {activeCompany} Loop
            </button>
            <button
              onClick={() => setDateRange('30d')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                dateRange === '30d' ? 'glass-btn-primary text-white' : 'hover:text-[#0b1c30]'
              }`}
            >
              Last 30 Days
            </button>
            <button
              onClick={() => setDateRange('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                dateRange === 'all' ? 'glass-btn-primary text-white' : 'hover:text-[#0b1c30]'
              }`}
            >
              All Time
            </button>
          </div>

          <button
            onClick={handleRefreshData}
            disabled={isRefreshing}
            className="p-2.5 glass-panel hover:bg-white text-[#565e74] hover:text-[#0b1c30] rounded-xl transition-all focus-visible:ring-2 focus-visible:ring-[#4f46e5]"
            title="Refresh candidate telemetry"
            aria-label="Refresh candidate metrics"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#4f46e5]' : ''}`} />
          </button>

          <Link
            to="/interview-setup"
            className="glass-btn-primary text-white px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap focus-visible:ring-2 focus-visible:ring-[#4f46e5]"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Configure Mock</span>
          </Link>
        </div>
      </div>

      {/* KPI Metrics 4-Card Grid with 3D Glass Tilt and Animated Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 text-left">
        {/* KPI 1: Readiness Score */}
        <GlassTiltCard3D intensity={4} hoverLift={3}>
          <div className="glass-panel p-5 rounded-2xl h-full flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#464555]">
                  Overall Readiness
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  {isRefreshing ? (
                    <Skeleton className="h-9 w-20" />
                  ) : (
                    <span className="font-heading text-3xl font-bold text-[#0b1c30] tabular-nums">
                      <AnimatedCounter value={readinessScore} suffix="%" />
                    </span>
                  )}
                  <span className="inline-flex items-center text-xs font-mono font-semibold text-[#3525cd]">
                    <TrendingUp className="w-3.5 h-3.5 mr-0.5" />+6% wk
                  </span>
                </div>
              </div>

              {/* Circular Progress SVG */}
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
                    transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                    strokeLinecap="round"
                    strokeWidth="3.5"
                  />
                </svg>
                <Sparkles className="w-4 h-4 text-[#4f46e5] absolute" />
              </div>
            </div>

            <div className="mt-4 glass-subcard rounded-xl px-2.5 py-1.5 flex items-center justify-between text-[#464555] text-xs">
              <span>Benchmark: {activeCompany} Bar</span>
              <span className="text-[#0b1c30] font-semibold">Active</span>
            </div>
          </div>
        </GlassTiltCard3D>

        {/* KPI 2: Completed Sessions */}
        <GlassTiltCard3D intensity={4} hoverLift={3}>
          <div className="glass-panel p-5 rounded-2xl h-full flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#464555]">
                  Mock Sessions
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  {isRefreshing ? (
                    <Skeleton className="h-9 w-16" />
                  ) : (
                    <span className="font-heading text-3xl font-bold text-[#0b1c30] tabular-nums">
                      <AnimatedCounter value={completedCount} />
                    </span>
                  )}
                  <span className="text-xs text-[#464555]">Completed</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl glass-subcard flex items-center justify-center text-[#3525cd]">
                <Video className="w-5 h-5" />
              </div>
            </div>

            <div className="mt-4 pt-3 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="font-mono font-semibold text-[#0b1c30] tabular-nums">{avgScore}/100</span>
                <span className="text-[#464555]">Avg Score</span>
              </div>
              <div className="w-24 bg-[#e5eeff]/80 rounded-full h-2 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, Math.max(0, avgScore))}%` }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  className="bg-gradient-to-r from-[#4f46e5] to-[#0ea5e9] h-2 rounded-full"
                />
              </div>
            </div>
          </div>
        </GlassTiltCard3D>

        {/* KPI 3: Skill Coverage */}
        <GlassTiltCard3D intensity={4} hoverLift={3}>
          <div className="glass-panel p-5 rounded-2xl h-full flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#464555]">
                  Skill Alignment
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  {isRefreshing ? (
                    <Skeleton className="h-9 w-16" />
                  ) : (
                    <span className="font-heading text-3xl font-bold text-[#0b1c30] tabular-nums">
                      <AnimatedCounter value={resumeAnalysis.matchAnalysis.overallMatchPercentage} suffix="%" />
                    </span>
                  )}
                  <span className="text-xs text-[#3525cd] font-mono font-semibold tabular-nums">
                    {resumeAnalysis.matchAnalysis.matchedSkills.length}/
                    {resumeAnalysis.matchAnalysis.matchedSkills.length + resumeAnalysis.matchAnalysis.missingSkills.length} Skills
                  </span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl glass-subcard flex items-center justify-center text-[#3525cd]">
                <Radar className="w-5 h-5" />
              </div>
            </div>

            <div className="mt-4 pt-3">
              <div className="w-full bg-[#e5eeff]/80 rounded-full h-2 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${resumeAnalysis.matchAnalysis.overallMatchPercentage}%` }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  className="bg-gradient-to-r from-[#3525cd] to-[#4f46e5] h-2 rounded-full"
                />
              </div>
              <span className="text-[11px] text-[#464555] mt-1.5 block">
                Aligned to {activeRole} Bar
              </span>
            </div>
          </div>
        </GlassTiltCard3D>

        {/* KPI 4: Practice Streak */}
        <GlassTiltCard3D intensity={4} hoverLift={3}>
          <div className="glass-panel p-5 rounded-2xl h-full flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#464555]">
                  Active Streak
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="font-heading text-3xl font-bold text-[#0b1c30] tabular-nums">
                    <AnimatedCounter value={user?.streakDays || 5} suffix=" Days" />
                  </span>
                  <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-orange-50/80 border border-orange-200/70 flex items-center justify-center text-orange-600">
                <Flame className="w-5 h-5" />
              </div>
            </div>

            <div className="mt-4 pt-3 flex items-center justify-between text-xs text-[#464555]">
              <span>Milestone: 7-Day Sprint</span>
              <span className="text-[#3525cd] font-mono font-semibold">2 days to go</span>
            </div>
          </div>
        </GlassTiltCard3D>
      </div>

      {/* Primary Recommendation Spotlight Hero Card */}
      <div className="glass-panel-elevated rounded-2xl p-6 text-left">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div className="flex items-start gap-4 max-w-3xl">
            <div className="w-14 h-14 rounded-2xl glass-btn-primary text-white flex items-center justify-center shrink-0">
              <Bot className="w-7 h-7" />
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="text-[#3525cd] font-bold tracking-wide uppercase">
                  AI Recommendation Priority #1
                </span>
                <span className="text-[#777587]" aria-hidden="true">·</span>
                <span className="text-[#464555]">Estimated time: 45 mins</span>
              </div>
              <h2 className="font-heading text-xl font-bold text-[#0b1c30] tracking-tight">
                System Design Mock: Distributed Cache Architecture &amp; Reliability
              </h2>
              <p className="text-sm text-[#464555] leading-relaxed">
                {activeCompany} {activeRole} interviews evaluate how services interface with distributed caches, storage tiers, and failure recovery under load.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <Link
              to="/learning-plan"
              className="glass-subcard hover:bg-white text-[#0b1c30] px-4 py-3 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap focus-visible:ring-2 focus-visible:ring-[#4f46e5]"
            >
              <BookOpen className="w-4 h-4 text-[#4f46e5]" />
              <span>View Syllabus</span>
            </Link>
            <button
              onClick={handleLaunchSpotlightDrill}
              className="glass-btn-primary text-white px-5 py-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap focus-visible:ring-2 focus-visible:ring-[#4f46e5]"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Start This Drill</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Dual Grid: Recent Sessions + Action Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-left">
        {/* Left Column (8 cols): Recent Interviews & Competencies */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Recent Mock Interviews List */}
          <div className="glass-panel rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/70 mb-4">
              <div>
                <h3 className="font-heading text-lg font-bold text-[#0b1c30]">Recent Mock Sessions</h3>
                <p className="text-xs text-[#464555]">Historical evaluation records audited against company bars</p>
              </div>

              {/* Filter track buttons */}
              <div className="flex items-center gap-1 glass-pill-bar p-1 rounded-xl text-xs">
                {['all', 'System Architecture', 'Technical Deep-Dive'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setFilterTrack(t)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors whitespace-nowrap ${
                      filterTrack === t ? 'glass-btn-primary text-white' : 'text-[#565e74] hover:text-[#0b1c30]'
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
                    className="p-4 rounded-xl glass-subcard glass-interactive flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-white/80 border border-white flex items-center justify-center shrink-0 text-[#3525cd] shadow-xs">
                        <Video className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-heading text-sm font-bold text-[#0b1c30] truncate">
                            {session.title}
                          </span>
                          <span className="text-xs text-[#777587]" aria-hidden="true">·</span>
                          <span className="text-xs font-semibold text-[#3525cd]">
                            {session.company}
                          </span>
                        </div>
                        <div className="flex items-center gap-2.5 text-xs text-[#565e74] mt-1 flex-wrap">
                          <span>{session.date}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono">{session.duration}</span>
                          <span aria-hidden="true">·</span>
                          <span className="text-amber-800 font-medium">Gap: {session.keyWeakness}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                      <div className="text-right tabular-nums">
                        <span className="font-heading text-lg font-bold text-[#0b1c30]">{session.score}</span>
                        <span className="text-xs text-[#777587]">/100</span>
                      </div>

                      <Link
                        to={`/evaluation-reports?sessionId=${encodeURIComponent(session.id)}`}
                        className="px-3 py-1.5 rounded-xl bg-white/85 hover:bg-white text-[#0b1c30] border border-white text-xs font-semibold transition-all flex items-center gap-1 shadow-xs whitespace-nowrap"
                      >
                        <FileText className="w-3.5 h-3.5 text-[#4f46e5]" />
                        <span>Scorecard</span>
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200/70 text-center">
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
          <div className="glass-panel rounded-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200/70 mb-4 gap-3 flex-wrap">
              <div>
                <h3 className="font-heading text-lg font-bold text-[#0b1c30]">Critical Skill Gaps Identified</h3>
                <p className="text-xs text-[#464555]">Derived from {activeCompany} {activeRole} Job Description &amp; your resume telemetry</p>
              </div>
              <span className="text-xs font-semibold text-red-700 whitespace-nowrap">
                {resumeAnalysis.matchAnalysis.missingSkills.length} Actionable Gaps
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {resumeAnalysis.matchAnalysis.missingSkills.map((gap, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-white/75 backdrop-blur-sm border border-red-200/70 flex flex-col justify-between glass-interactive"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-red-700 uppercase tracking-wider">
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
          <GlassTiltCard3D intensity={3} hoverLift={3}>
            <div className="glass-panel rounded-2xl p-5 relative overflow-hidden">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/70 mb-4">
                <span className="text-xs font-bold text-[#0b1c30] uppercase tracking-wider">Assigned AI Coach</span>
                <span className="text-[11px] font-semibold text-emerald-700">
                  Calibrated Active
                </span>
              </div>

              <div className="flex items-center gap-3 mb-4">
                <img
                  src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=256"
                  alt={interviewSetup.aiPersona}
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-white shadow-sm"
                />
                <div>
                  <h4 className="font-heading text-sm font-bold text-[#0b1c30]">{interviewSetup.aiPersona}</h4>
                  <p className="text-xs text-[#464555]">
                    {interviewSetup.aiPersona === 'Dr. Elena Vance'
                      ? 'AI Infrastructure Lead'
                      : interviewSetup.aiPersona === 'Marcus Reed'
                      ? 'Engineering Director'
                      : interviewSetup.aiPersona === 'David Chen'
                      ? 'Staff Frontend Lead'
                      : 'Principal Architect & Bar Raiser'}
                  </p>
                  <span className="text-[11px] text-[#3525cd] font-medium">
                    {interviewSetup.targetCompany} Calibration · Neural Voice
                  </span>
                </div>
              </div>

              <p className="text-xs text-[#464555] glass-subcard p-3 rounded-xl leading-relaxed mb-4">
                “Your distributed state answers are solid. In our next loop, I will probe failure states: leader re-elections and WAN jitter spikes.”
              </p>

              <Link
                to="/live-session"
                className="w-full py-2.5 rounded-xl glass-btn-primary text-white text-xs font-semibold flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Resume Live Mock With {interviewSetup.aiPersona}</span>
              </Link>
            </div>
          </GlassTiltCard3D>

          {/* Quick Hub Launchers */}
          <div className="glass-panel rounded-2xl p-5 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#0b1c30] mb-2">Platform Quick Hub</h4>

            <Link
              to="/resume-job-match"
              className="flex items-center justify-between p-3 rounded-xl glass-subcard glass-interactive group"
            >
              <div className="flex items-center gap-2.5">
                <FileSearch className="w-4 h-4 text-[#4f46e5]" />
                <div className="text-left">
                  <div className="text-xs font-semibold text-[#0b1c30]">Resume &amp; JD Match</div>
                  <div className="text-[11px] text-[#565e74]">
                    Match score: {resumeAnalysis.matchAnalysis.overallMatchPercentage}% (ATS Ready)
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#777587] group-hover:text-[#4f46e5] group-hover:translate-x-0.5 transition-all" />
            </Link>

            <Link
              to="/interview-setup"
              className="flex items-center justify-between p-3 rounded-xl glass-subcard glass-interactive group"
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
              className="flex items-center justify-between p-3 rounded-xl glass-subcard glass-interactive group"
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
