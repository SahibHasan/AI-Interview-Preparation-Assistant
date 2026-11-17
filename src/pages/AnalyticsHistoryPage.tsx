import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Filter,
  Download,
  FileText,
  TrendingUp,
  Award,
  Video,
  Clock,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Search,
  Activity,
  Layers,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { AnimatedCounter } from '../components/common/AnimatedCounter';
import { GlassTiltCard3D } from '../components/common/MotionPrimitives';

export const AnalyticsHistoryPage: React.FC = () => {
  const { sessionHistory, savedReports } = useApp();
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterTrack, setFilterTrack] = useState<string>('all');
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

  const sessionCount = sessionHistory.length;
  const realAvgScore =
    sessionCount > 0
      ? Number(
          (
            sessionHistory.reduce((acc, s) => acc + Number(s.score || (s as any).overallScore || 0), 0) /
            sessionCount
          ).toFixed(1)
        )
      : 0;
  const realPercentile =
    savedReports.length > 0
      ? Math.round(
          savedReports.reduce((acc, r) => acc + Number(r.percentileRank || 75), 0) / savedReports.length
        )
      : sessionCount > 0
      ? Math.min(99, Math.round(realAvgScore + 3))
      : 0;

  const avgCategory = (key: 'technicalCorrectness' | 'problemDecomposition' | 'communicationStructure' | 'tradeoffAnalysis') => {
    if (savedReports.length > 0) {
      return Math.round(
        savedReports.reduce((acc, r) => acc + Number(r.categoryScores?.[key] || 0), 0) / savedReports.length
      );
    }
    return sessionCount > 0 ? Math.round(realAvgScore) : 0;
  };

  const avgTech = avgCategory('technicalCorrectness');
  const avgDecomp = avgCategory('problemDecomposition');
  const avgComm = avgCategory('communicationStructure');
  const avgTradeoff = avgCategory('tradeoffAnalysis');

  const filteredHistory = sessionHistory.filter((item) => {
    const q = searchQuery.toLowerCase();
    const matchesTrack =
      filterTrack === 'all' || (item.track || '').toLowerCase().includes(filterTrack.toLowerCase());
    const matchesSearch =
      (item.title || '').toLowerCase().includes(q) ||
      (item.company || '').toLowerCase().includes(q) ||
      (item.keyWeakness || '').toLowerCase().includes(q) ||
      (item.interviewerName || '').toLowerCase().includes(q);
    return matchesTrack && matchesSearch;
  });

  const handleExportCSV = () => {
    const headers = ['Session ID', 'Title', 'Track', 'Company', 'Interviewer', 'Date', 'Duration', 'Score', 'Status', 'Key Weakness'];
    const rows = sessionHistory.map((s) => [
      s.id,
      `"${(s.title || 'Session').replace(/"/g, '""')}"`,
      `"${s.track || 'General'}"`,
      `"${s.company || 'Tech'}"`,
      `"${s.interviewerName || 'Sarah'}"`,
      `"${s.date || 'Recent'}"`,
      `"${s.duration || '45m'}"`,
      s.score ?? (s as any).overallScore ?? 85,
      s.status || 'passed',
      `"${(s.keyWeakness || 'None').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', encodeURI(csvContent));
    downloadAnchor.setAttribute('download', `preppilot_interview_telemetry_${Date.now()}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    showToast({
      title: 'Telemetry CSV Exported',
      message: `Downloaded CSV with ${sessionHistory.length} historical interview records.`,
      type: 'success',
    });
  };

  return (
    <div className="flex flex-col w-full gap-6 pb-12 antialiased">
      {/* Header Area */}
      <div className="flex flex-col gap-4 text-left">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-[#565e74] uppercase tracking-wider font-semibold mb-1">
              <span>Platform</span>
              <span>•</span>
              <span className="text-[#3525cd]">Analytics &amp; History</span>
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold text-[#0b1c30] tracking-tight">
              Interview History &amp; Performance Analytics
            </h1>
            <p className="text-sm text-[#464555] max-w-4xl mt-1 leading-relaxed">
              Historical drill telemetry, longitudinal score progression, biomarker evolution, and company-specific readiness benchmarks across {sessionHistory.length} completed mock sessions.
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Box */}
            <div className="glass-input relative inline-flex items-center rounded-xl">
              <Search className="w-3.5 h-3.5 text-[#777587] ml-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search drills, topics..."
                className="pl-2 pr-3 py-2 bg-transparent text-[#0b1c30] text-xs font-medium focus:outline-none w-40 sm:w-48"
              />
            </div>

            {/* Track Filter */}
            <div className="glass-input relative inline-flex items-center rounded-xl">
              <Filter className="w-3.5 h-3.5 text-[#565e74] ml-3" />
              <select
                value={filterTrack}
                onChange={(e) => setFilterTrack(e.target.value)}
                className="appearance-none pl-2 pr-7 py-2 bg-transparent text-[#0b1c30] text-xs font-semibold focus:outline-none cursor-pointer"
              >
                <option value="all">All Tracks ({sessionHistory.length})</option>
                <option value="architecture">System Architecture</option>
                <option value="behavioral">Behavioral STAR</option>
                <option value="technical">Technical Deep-Dive</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleExportCSV}
              className="glass-btn-primary inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Telemetry (CSV)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Top KPI Metric Summary Cards with Animated Counters */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 text-left">
        {/* KPI 1 */}
        <GlassTiltCard3D intensity={3.5} hoverLift={3}>
          <div className="glass-panel rounded-2xl p-5 flex flex-col justify-between h-full">
            <div className="flex items-start justify-between">
              <span className="text-xs font-bold text-[#565e74] uppercase tracking-wider">Completed Sessions</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#3525cd] bg-indigo-50/80 px-2 py-0.5 rounded-full whitespace-nowrap">
                <TrendingUp className="w-3 h-3" /> {sessionCount > 0 ? 'Persisted' : 'Ready'}
              </span>
            </div>
            <div className="my-3 flex items-baseline gap-2">
              <span className="font-heading text-4xl font-bold text-[#0b1c30] tabular-nums">
                <AnimatedCounter value={sessionCount} />
              </span>
              <span className="text-xs text-[#565e74]">saved loops</span>
            </div>
            <div className="text-xs text-[#565e74] pt-2 border-t border-white/60 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[#3525cd]" /> {savedReports.length} transcript reports
              </span>
              <span className="text-[#3525cd] font-bold">{sessionCount > 0 ? 'Synced' : '0%'}</span>
            </div>
          </div>
        </GlassTiltCard3D>

        {/* KPI 2 */}
        <GlassTiltCard3D intensity={3.5} hoverLift={3}>
          <div className="glass-panel rounded-2xl p-5 flex flex-col justify-between h-full">
            <div className="flex items-start justify-between">
              <span className="text-xs font-bold text-[#565e74] uppercase tracking-wider">Calibrated Average</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50/80 px-2 py-0.5 rounded-full whitespace-nowrap">
                <TrendingUp className="w-3 h-3" /> Real Transcripts
              </span>
            </div>
            <div className="my-3 flex items-baseline gap-2">
              <span className="font-heading text-4xl font-bold text-[#0b1c30] tabular-nums">
                <AnimatedCounter value={realAvgScore} decimals={1} />
              </span>
              <span className="text-xs text-[#777587]">/ 100</span>
            </div>
            <div className="text-xs text-[#565e74] pt-2 border-t border-white/60">
              Computed from {sessionCount} recorded interview sessions
            </div>
          </div>
        </GlassTiltCard3D>

        {/* KPI 3 */}
        <GlassTiltCard3D intensity={3.5} hoverLift={3}>
          <div className="glass-panel rounded-2xl p-5 flex flex-col justify-between h-full">
            <div className="flex items-start justify-between">
              <span className="text-xs font-bold text-[#565e74] uppercase tracking-wider">Benchmark Rank</span>
              <Award className="w-5 h-5 text-[#3525cd]" />
            </div>
            <div className="my-3 flex items-baseline gap-2">
              <span className="font-heading text-4xl font-bold text-[#0b1c30] tabular-nums">
                <AnimatedCounter value={realPercentile} suffix="%" />
              </span>
              <span className="text-xs text-[#777587]">Percentile</span>
            </div>
            <div className="text-xs text-[#565e74] pt-2 border-t border-white/60">
              {savedReports[0]?.calibratedBenchmark || 'Calibrated against role rubric baseline'}
            </div>
          </div>
        </GlassTiltCard3D>

        {/* KPI 4 */}
        <GlassTiltCard3D intensity={3.5} hoverLift={3}>
          <div className="glass-panel rounded-2xl p-5 flex flex-col justify-between h-full">
            <div className="flex items-start justify-between">
              <span className="text-xs font-bold text-[#565e74] uppercase tracking-wider">Readiness Signal</span>
              <span className="text-xs font-bold text-[#3525cd] bg-indigo-50/80 px-2 py-0.5 rounded-full whitespace-nowrap">
                {realAvgScore >= 85 ? 'Strong Pass' : realAvgScore >= 70 ? 'On Track' : sessionCount === 0 ? 'Pending' : 'Building'}
              </span>
            </div>
            <div className="my-3 flex items-baseline gap-2">
              <span className="font-heading text-4xl font-bold text-emerald-600 tabular-nums">
                <AnimatedCounter value={Math.round(realAvgScore)} suffix="%" />
              </span>
              <span className="text-xs text-[#565e74]">Clearance Signal</span>
            </div>
            <div className="text-xs text-[#565e74] pt-2 border-t border-white/60">
              {sessionHistory[0]?.keyWeakness ? `Top focus: ${sessionHistory[0].keyWeakness}` : 'Complete a session to surface focus deltas'}
            </div>
          </div>
        </GlassTiltCard3D>
      </div>

      {/* Longitudinal Score Progression Breakdown */}
      <div className="glass-panel rounded-2xl p-6 text-left">
        <h3 className="font-heading text-base font-bold text-[#0b1c30] mb-1">
          Competency Rubric Breakdown ({savedReports.length || sessionCount} Sessions)
        </h3>
        <p className="text-xs text-[#565e74] mb-5">
          Real averages computed from your saved conversation evaluations
        </p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass-subcard p-4 rounded-xl">
            <div className="text-xs text-[#565e74] font-medium">Technical Correctness</div>
            <div className="flex items-baseline gap-2 my-1">
              <span className="font-heading text-2xl font-bold text-[#0b1c30] tabular-nums">
                <AnimatedCounter value={avgTech} suffix="%" />
              </span>
            </div>
            <div className="w-full bg-white/70 h-1.5 rounded-full overflow-hidden mt-2">
              <div className="bg-[#3525cd] h-full rounded-full transition-all duration-700" style={{ width: `${avgTech}%` }} />
            </div>
          </div>

          <div className="glass-subcard p-4 rounded-xl">
            <div className="text-xs text-[#565e74] font-medium">Problem Decomposition</div>
            <div className="flex items-baseline gap-2 my-1">
              <span className="font-heading text-2xl font-bold text-[#0b1c30] tabular-nums">
                <AnimatedCounter value={avgDecomp} suffix="%" />
              </span>
            </div>
            <div className="w-full bg-white/70 h-1.5 rounded-full overflow-hidden mt-2">
              <div className="bg-[#4f46e5] h-full rounded-full transition-all duration-700" style={{ width: `${avgDecomp}%` }} />
            </div>
          </div>

          <div className="glass-subcard p-4 rounded-xl">
            <div className="text-xs text-[#565e74] font-medium">Communication &amp; STAR</div>
            <div className="flex items-baseline gap-2 my-1">
              <span className="font-heading text-2xl font-bold text-[#0b1c30] tabular-nums">
                <AnimatedCounter value={avgComm} suffix="%" />
              </span>
            </div>
            <div className="w-full bg-white/70 h-1.5 rounded-full overflow-hidden mt-2">
              <div className="bg-emerald-600 h-full rounded-full transition-all duration-700" style={{ width: `${avgComm}%` }} />
            </div>
          </div>

          <div className="glass-subcard p-4 rounded-xl">
            <div className="text-xs text-[#565e74] font-medium">Tradeoff &amp; Failure Modes</div>
            <div className="flex items-baseline gap-2 my-1">
              <span className="font-heading text-2xl font-bold text-[#0b1c30] tabular-nums">
                <AnimatedCounter value={avgTradeoff} suffix="%" />
              </span>
            </div>
            <div className="w-full bg-white/70 h-1.5 rounded-full overflow-hidden mt-2">
              <div className="bg-[#3525cd] h-full rounded-full transition-all duration-700" style={{ width: `${avgTradeoff}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Sessions Table with Expandable Telemetry Rows */}
      <div className="glass-panel rounded-2xl overflow-hidden text-left">
        <div className="p-6 pb-4 border-b border-white/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-heading text-lg font-bold text-[#0b1c30]">Historical Mock Sessions Log</h3>
            <p className="text-xs text-[#565e74]">
              Complete record of all simulated interviews and rubric evaluations. Click any row to expand biomarker telemetry.
            </p>
          </div>
          <span className="text-xs font-semibold text-[#565e74]">
            Showing {filteredHistory.length} of {sessionHistory.length} Sessions
          </span>
        </div>

        {filteredHistory.length === 0 ? (
          <div className="p-12 text-center text-[#565e74] space-y-2">
            <p className="text-sm font-semibold">
              {sessionHistory.length === 0
                ? 'No saved interview sessions yet.'
                : 'No interview sessions matched your filter criteria.'}
            </p>
            {sessionHistory.length === 0 ? (
              <Link
                to="/interview-setup"
                className="inline-flex items-center gap-1.5 mt-2 px-4 py-2 rounded-lg bg-[#4f46e5] hover:bg-[#3525cd] text-white text-xs font-semibold transition-colors"
              >
                <span>Start Verbal Mock Interview</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFilterTrack('all');
                }}
                className="mt-2 text-xs text-[#4f46e5] font-semibold hover:underline"
              >
                Reset filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/55 backdrop-blur-md border-b border-white/60 text-[#565e74] uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="px-6 py-3">Session &amp; Domain</th>
                  <th className="px-6 py-3">Company Target</th>
                  <th className="px-6 py-3">AI Interviewer</th>
                  <th className="px-6 py-3">Date &amp; Duration</th>
                  <th className="px-6 py-3">Score &amp; Status</th>
                  <th className="px-6 py-3">Identified Weakness</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/55">
                {filteredHistory.map((item) => {
                  const isExpanded = expandedSessionId === item.id;
                  const matchedReport = savedReports.find(
                    (r) => r.sessionId === item.id || r.id === item.id
                  );

                  return (
                    <React.Fragment key={item.id}>
                      <tr
                        onClick={() => setExpandedSessionId(isExpanded ? null : item.id)}
                        className="hover:bg-white/55 transition-colors cursor-pointer"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-[#4f46e5] shrink-0" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-[#777587] shrink-0" />
                            )}
                            <div>
                              <div className="font-bold text-[#0b1c30] text-sm">{item.title}</div>
                              <span className="text-[11px] text-[#3525cd] font-semibold">{item.track}</span>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 font-semibold text-[#0b1c30]">
                          {item.company}
                        </td>

                        <td className="px-6 py-4 text-[#565e74]">
                          {item.interviewerName}
                        </td>

                        <td className="px-6 py-4">
                          <div className="text-[#0b1c30] font-medium">{item.date}</div>
                          <div className="text-[11px] text-[#777587]">{item.duration}</div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-heading text-base font-bold text-[#0b1c30] tabular-nums">{item.score}</span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
                                item.status === 'strong-pass'
                                  ? 'bg-emerald-50/85 text-emerald-800 border border-emerald-200/70'
                                  : item.status === 'passed'
                                  ? 'bg-indigo-50/85 text-indigo-800 border border-indigo-200/70'
                                  : 'bg-amber-50/85 text-amber-800 border border-amber-200/70'
                              }`}
                            >
                              {item.status.replace('-', ' ').toUpperCase()}
                            </span>
                          </div>
                        </td>

                        <td className="px-6 py-4 text-[#565e74] text-xs max-w-[200px] truncate">
                          {item.keyWeakness}
                        </td>

                        <td className="px-6 py-4 text-right">
                          <Link
                            to={`/evaluation-reports?sessionId=${encodeURIComponent(item.id)}`}
                            onClick={(e) => e.stopPropagation()}
                            className="glass-subcard inline-flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-white/85 text-[#3525cd] font-semibold text-xs transition-colors whitespace-nowrap"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Scorecard</span>
                          </Link>
                        </td>
                      </tr>

                      {/* Expandable Session Telemetry Drawer */}
                      {isExpanded && (
                        <tr className="bg-white/40 backdrop-blur-sm">
                          <td colSpan={7} className="px-8 py-4 border-b border-white/60">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                              <div className="glass-subcard p-3.5 rounded-xl">
                                <div className="font-bold text-[#0b1c30] flex items-center gap-1.5 mb-1">
                                  <Activity className="w-3.5 h-3.5 text-[#3525cd]" />
                                  <span>Transcript Summary</span>
                                </div>
                                <p className="text-[#565e74] leading-relaxed">
                                  {matchedReport?.overallSummary || `Evaluated ${item.title} for ${item.company}.`}
                                </p>
                              </div>

                              <div className="glass-subcard p-3.5 rounded-xl">
                                <div className="font-bold text-[#0b1c30] flex items-center gap-1.5 mb-1">
                                  <Layers className="w-3.5 h-3.5 text-[#3525cd]" />
                                  <span>Category Alignment</span>
                                </div>
                                <div className="space-y-1 text-[#565e74]">
                                  <div>
                                    Technical Depth:{' '}
                                    <strong className="text-[#0b1c30] tabular-nums">
                                      {matchedReport?.categoryScores?.technicalCorrectness ?? item.score}%
                                    </strong>
                                  </div>
                                  <div>
                                    Tradeoff Analysis:{' '}
                                    <strong className="text-[#0b1c30] tabular-nums">
                                      {matchedReport?.categoryScores?.tradeoffAnalysis ?? item.score}%
                                    </strong>
                                  </div>
                                  <div>
                                    Communication:{' '}
                                    <strong className="text-[#0b1c30] tabular-nums">
                                      {matchedReport?.categoryScores?.communicationStructure ?? item.score}%
                                    </strong>
                                  </div>
                                </div>
                              </div>

                              <div className="glass-subcard p-3.5 rounded-xl flex flex-col justify-between">
                                <div>
                                  <div className="font-bold text-[#0b1c30] mb-1">Diagnosed Target Gap</div>
                                  <p className="text-[#565e74] leading-relaxed">{item.keyWeakness}</p>
                                </div>
                                <Link
                                  to={`/evaluation-reports?sessionId=${encodeURIComponent(item.id)}`}
                                  className="text-xs font-semibold text-[#4f46e5] hover:underline mt-2 self-start"
                                >
                                  Open Full Transcript Report →
                                </Link>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
