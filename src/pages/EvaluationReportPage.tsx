import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Share2,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  BarChart2,
  BookOpen,
  Download,
  MessageSquare,
  Mic,
  ArrowRight,
  Layers,
  ShieldCheck,
  Target,
  Lightbulb,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { AnimatedCounter } from '../components/common/AnimatedCounter';
import { Skeleton } from '../components/common/Skeleton';
import { GlassTiltCard3D } from '../components/common/MotionPrimitives';
import {
  downloadFullReportPDF,
  downloadFullReportDOCX,
  downloadSummaryPDF,
  downloadSummaryDOCX,
  downloadTranscriptPDF,
  downloadTranscriptDOCX,
} from '../utils/pdfExport';

function getTierBadge(score: number): { label: string; badgeClass: string } {
  if (score >= 88) {
    return {
      label: 'Strong Pass',
      badgeClass: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
    };
  }
  if (score >= 75) {
    return {
      label: 'Qualified Pass',
      badgeClass: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
    };
  }
  if (score >= 60) {
    return {
      label: 'Developing Signal',
      badgeClass: 'bg-indigo-50 text-indigo-800 border border-indigo-200',
    };
  }
  if (score >= 35) {
    return {
      label: 'Needs Practice',
      badgeClass: 'bg-amber-50 text-amber-800 border border-amber-200',
    };
  }
  return {
    label: 'Critical Gap',
    badgeClass: 'bg-red-50 text-red-800 border border-red-200',
  };
}

function getMetricNote(score: number, domain: 'tech' | 'tradeoff' | 'comm' | 'decomp'): string {
  if (score < 35) {
    return 'Insufficient signal demonstrated; review core concepts and attempt full structured answers.';
  }
  if (domain === 'tech') {
    if (score >= 85) return 'Strong architectural depth and implementation accuracy.';
    if (score >= 70) return 'Solid fundamentals; expand on system edge cases and metrics.';
    return 'Needs clearer system mechanics and concrete technical specifics.';
  }
  if (domain === 'tradeoff') {
    if (score >= 85) return 'Clearly articulated failure states, latency tradeoffs, and mitigations.';
    if (score >= 70) return 'Covered primary choices; probe deeper into failure recovery and scale.';
    return 'Explicitly compare alternatives, bottlenecks, and rollback paths.';
  }
  if (domain === 'decomp') {
    if (score >= 85) return 'Clear scoping, boundaries, and component decomposition.';
    if (score >= 70) return 'Good breakdown; clarify upfront constraints and scale bounds.';
    return 'Break problems into constraints, components, and interfaces first.';
  }
  if (score >= 85) return 'Structured verbal delivery with crisp framing and pacing.';
  if (score >= 70) return 'Clear high-level structure; tighten concrete examples and outcomes.';
  return 'Use Situation-Task-Action-Result or scope-constraints-design framing.';
}

export const EvaluationReportPage: React.FC = () => {
  const { activeReport, savedReports, selectReport, questions, isLoadingDbData } = useApp();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [expandedQuestion, setExpandedQuestion] = useState<string>('');
  const [filterScore, setFilterScore] = useState<'all' | 'high' | 'needs-work'>('all');
  const [exportFormat, setExportFormat] = useState<'pdf' | 'docx'>('pdf');
  const [isExporting, setIsExporting] = useState(false);

  // Sync URL ?reportId= or ?sessionId= with savedReports
  useEffect(() => {
    const targetId = searchParams.get('reportId') || searchParams.get('sessionId');
    if (targetId && savedReports.length > 0) {
      selectReport(targetId);
    }
  }, [searchParams, savedReports]);

  // Expand the first question feedback automatically whenever activeReport changes
  useEffect(() => {
    const firstId = activeReport?.questionFeedbacks?.[0]?.questionId || '';
    setExpandedQuestion(firstId);
  }, [activeReport?.id]);

  if (isLoadingDbData && !activeReport) {
    return (
      <div className="flex flex-col w-full gap-6 pb-12 antialiased">
        <div className="glass-panel rounded-2xl p-6 space-y-4">
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass-panel rounded-2xl p-5 space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-20" />
              <Skeleton className="h-3 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!activeReport) {
    return (
      <div className="flex flex-col items-center justify-center w-full py-16 px-4 text-center antialiased">
        <div className="max-w-lg w-full glass-panel-elevated rounded-3xl p-8 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#eff4ff] text-[#3525cd] flex items-center justify-center mx-auto shadow-xs">
            <BarChart2 className="w-7 h-7" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-[#0b1c30]">No Evaluation Reports Yet</h1>
          <p className="text-sm text-[#464555] leading-relaxed">
            Complete a verbal mock interview session with our AI interviewer to generate a real-time evaluation scorecard from your actual conversation transcript. Your saved reports will automatically appear here across every login.
          </p>
          <div className="pt-2 flex items-center justify-center gap-3 flex-wrap">
            <Link
              to="/interview-setup"
              className="glass-btn-primary inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap"
            >
              <Mic className="w-4 h-4" />
              <span>Start Verbal Mock Interview</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              to="/dashboard"
              className="glass-subcard inline-flex items-center gap-1.5 hover:bg-white/80 text-[#0b1c30] px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap"
            >
              <span>Return to Dashboard</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const tier = getTierBadge(activeReport.overallScore);
  const topPercentile = Math.max(1, 100 - (activeReport.percentileRank || 80));
  const candidateDisplayName = user?.name || 'Candidate';

  const handleSelectReportChange = (id: string) => {
    selectReport(id);
    setSearchParams({ reportId: id });
  };

  const handleDownloadReport = async () => {
    setIsExporting(true);
    try {
      const filename =
        exportFormat === 'docx'
          ? await downloadFullReportDOCX(activeReport, candidateDisplayName)
          : downloadFullReportPDF(activeReport, candidateDisplayName);
      showToast({
        title: `Full Report (${exportFormat.toUpperCase()}) Downloaded`,
        message: `Saved ${filename} with full rubric scorecard, gaps, and transcript.`,
        type: 'success',
      });
    } catch {
      showToast({
        title: 'Export Failed',
        message: 'Could not generate report file. Please try again.',
        type: 'error',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadSummary = async () => {
    setIsExporting(true);
    try {
      const filename =
        exportFormat === 'docx'
          ? await downloadSummaryDOCX(activeReport, candidateDisplayName)
          : downloadSummaryPDF(activeReport, candidateDisplayName);
      showToast({
        title: `Executive Summary (${exportFormat.toUpperCase()}) Downloaded`,
        message: `Saved ${filename} with scorecard highlights and action plan.`,
        type: 'success',
      });
    } catch {
      showToast({
        title: 'Summary Export Failed',
        message: 'Could not generate summary file. Please try again.',
        type: 'error',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      showToast({
        title: 'Report Link Copied',
        message: 'Shareable evaluation report link copied to clipboard.',
        type: 'success',
      });
    } else {
      showToast({
        title: 'Report URL Ready',
        message: window.location.href,
        type: 'info',
      });
    }
  };

  const handleExportTranscript = async () => {
    setIsExporting(true);
    try {
      const filename =
        exportFormat === 'docx'
          ? await downloadTranscriptDOCX(activeReport, candidateDisplayName)
          : downloadTranscriptPDF(activeReport, candidateDisplayName);
      showToast({
        title: `Transcript (${exportFormat.toUpperCase()}) Downloaded`,
        message: `Saved formatted conversation transcript as ${filename}.`,
        type: 'success',
      });
    } catch {
      showToast({
        title: 'Transcript Export Failed',
        message: 'Could not generate transcript file. Please try again.',
        type: 'error',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const feedbacks = activeReport.questionFeedbacks || [];
  const filteredFeedbacks = feedbacks.filter((fb) => {
    if (filterScore === 'high') return fb.score >= 85;
    if (filterScore === 'needs-work') return fb.score < 85;
    return true;
  });

  const conversationTurns = activeReport.conversationTranscript || [];
  const basis = activeReport.evaluationBasis;
  const candidateTurnsAnalyzed =
    basis?.candidateTurnsAnalyzed ??
    (conversationTurns.filter(
      (t) => t.speaker === 'candidate' && t.kind === 'response' && typeof t.topicOrder === 'number'
    ).length ||
      feedbacks.filter((fb) => fb.candidateResponse && !fb.candidateResponse.startsWith('No candidate')).length);
  const aiTurnsExcluded =
    basis?.aiTurnsExcluded ?? conversationTurns.filter((t) => t.speaker === 'ai').length;
  const topicsAnswered =
    basis?.topicsAnswered ??
    feedbacks.filter(
      (fb) =>
        fb.candidateResponse &&
        !fb.candidateResponse.startsWith('No candidate') &&
        !fb.candidateResponse.includes('User ended')
    ).length;
  const totalTopics = basis?.totalTopics ?? feedbacks.length;
  const totalCandidateWords =
    basis?.totalCandidateWords ??
    feedbacks.reduce((sum, fb) => {
      const text = [fb.candidateResponse, fb.followUpResponse].filter(Boolean).join(' ');
      if (text.startsWith('No candidate')) return sum;
      return sum + (text ? text.trim().split(/\s+/).filter(Boolean).length : 0);
    }, 0);
  const weights = basis?.rubricWeights || {
    technicalCorrectness: 35,
    tradeoffAnalysis: 25,
    communicationStructure: 20,
    problemDecomposition: 20,
  };
  const scoringMethodLabel =
    basis?.scoringMethodLabel ||
    (activeReport.source === 'gemini'
      ? 'AI Candidate-Only Transcript Rubric Analysis'
      : 'Calibrated Candidate-Only Rubric Engine');

  return (
    <div className="flex flex-col w-full gap-6 pb-12 antialiased">
      {/* Top Header & Breadcrumbs & Action Bar */}
      <div className="flex flex-col gap-3 text-left">
        <div className="min-w-0">
          <div className="flex items-center flex-wrap gap-1.5 text-xs text-[#565e74] uppercase tracking-wider font-semibold mb-1">
            <span className="whitespace-nowrap">Platform</span>
            <span>•</span>
            <span className="text-[#3525cd] whitespace-nowrap">Evaluation Reports</span>
            <span>•</span>
            <span className="text-[#0b1c30] whitespace-nowrap">Session #{activeReport.id.slice(0, 12)}</span>
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-[#0b1c30] tracking-tight">
            AI Evaluation Report &amp; Scorecard
          </h1>
        </div>

        {/* Action Toolbar + PDF/DOCX Selector + Saved Report Switcher */}
        <div className="flex items-center flex-wrap gap-2">
          {savedReports.length > 1 && (
            <div className="glass-input inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5">
              <Layers className="w-3.5 h-3.5 text-[#3525cd] shrink-0" />
              <select
                aria-label="Select saved evaluation report"
                value={activeReport.id}
                onChange={(e) => handleSelectReportChange(e.target.value)}
                className="text-xs font-semibold text-[#0b1c30] bg-transparent focus:outline-none cursor-pointer max-w-[230px]"
              >
                {savedReports.map((rep) => (
                  <option key={rep.id} value={rep.id}>
                    {rep.targetRole} @ {rep.targetCompany} ({rep.overallScore}/100) · {rep.completedAt}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Export Format Selector (PDF or Word DOCX) */}
          <div
            role="group"
            aria-label="Download file format"
            className="glass-pill-bar inline-flex items-center rounded-xl p-0.5"
          >
            <button
              type="button"
              data-testid="format-pdf-btn"
              onClick={() => setExportFormat('pdf')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap ${
                exportFormat === 'pdf'
                  ? 'glass-btn-primary'
                  : 'text-[#565e74] hover:text-[#0b1c30]'
              }`}
            >
              PDF
            </button>
            <button
              type="button"
              data-testid="format-docx-btn"
              onClick={() => setExportFormat('docx')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap ${
                exportFormat === 'docx'
                  ? 'glass-btn-primary'
                  : 'text-[#565e74] hover:text-[#0b1c30]'
              }`}
            >
              DOCX
            </button>
          </div>

          <button
            type="button"
            data-testid="download-report-btn"
            disabled={isExporting}
            onClick={handleDownloadReport}
            className="glass-subcard flex items-center gap-1.5 text-[#0b1c30] px-3.5 py-2 rounded-xl text-xs font-semibold hover:bg-white/80 transition-colors active:scale-95 disabled:opacity-60 whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5 text-[#3525cd]" />
            <span>Download Report ({exportFormat.toUpperCase()})</span>
          </button>

          <button
            type="button"
            data-testid="download-summary-btn"
            disabled={isExporting}
            onClick={handleDownloadSummary}
            className="glass-subcard flex items-center gap-1.5 text-[#0b1c30] px-3.5 py-2 rounded-xl text-xs font-semibold hover:bg-white/80 transition-colors active:scale-95 disabled:opacity-60 whitespace-nowrap"
          >
            <FileText className="w-3.5 h-3.5 text-[#059669]" />
            <span>Download Summary ({exportFormat.toUpperCase()})</span>
          </button>

          <button
            type="button"
            data-testid="export-transcript-btn"
            disabled={isExporting}
            onClick={handleExportTranscript}
            className="glass-subcard flex items-center gap-1.5 text-[#0b1c30] px-3.5 py-2 rounded-xl text-xs font-semibold hover:bg-white/80 transition-colors active:scale-95 disabled:opacity-60 whitespace-nowrap"
          >
            <FileText className="w-3.5 h-3.5 text-[#565e74]" />
            <span>Download Transcript ({exportFormat.toUpperCase()})</span>
          </button>

          <button
            type="button"
            onClick={handleShare}
            className="glass-subcard flex items-center gap-1.5 text-[#0b1c30] px-3.5 py-2 rounded-xl text-xs font-semibold hover:bg-white/80 transition-colors active:scale-95 whitespace-nowrap"
          >
            <Share2 className="w-3.5 h-3.5 text-[#565e74]" />
            <span>Share</span>
          </button>

          <Link
            to="/interview-setup"
            className="glass-btn-primary flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retake Drill</span>
          </Link>
        </div>
      </div>

      {/* Calibrated Audit Header Card */}
      <div className="glass-panel-elevated rounded-2xl p-6 flex flex-col gap-4 relative overflow-hidden text-left">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 z-10">
          <div className="flex flex-col gap-2 max-w-3xl">
            <div className="flex items-center gap-2 flex-wrap text-xs text-[#464555] font-medium">
              <span className="text-[#3525cd] font-bold uppercase tracking-wider text-[11px]">
                Transcript-Grounded Report
              </span>
              <span className="text-[#94a3b8]">·</span>
              <span className="inline-flex items-center gap-1 font-semibold text-[#0b1c30]">
                <Sparkles className="w-3.5 h-3.5 text-[#3525cd]" />
                {activeReport.calibratedBenchmark || `${activeReport.targetCompany} Bar`}
              </span>
              <span className="text-[#94a3b8]">·</span>
              <span>Completed {activeReport.completedAt}</span>
              <span className="text-[#94a3b8]">·</span>
              <span className="font-mono tabular-nums">{activeReport.durationFormatted}</span>
            </div>

            <h2 className="font-heading text-xl font-bold text-[#0b1c30] mt-0.5">
              Transcript Rubric Synthesis — {activeReport.targetRole} @ {activeReport.targetCompany}
            </h2>
            <p className="text-sm text-[#464555] leading-relaxed">
              {activeReport.overallSummary}
            </p>
          </div>

          <div className="glass-subcard flex flex-col items-start lg:items-end gap-1 p-3.5 rounded-2xl shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-bold text-[#0b1c30]">
                {activeReport.interviewerPersona ? `Panel: ${activeReport.interviewerPersona}` : 'Real-Time Transcript Audit'}
              </span>
            </div>
            <span className="text-[11px] text-[#565e74]">
              {conversationTurns.length > 0
                ? `Audited from ${conversationTurns.length} live dialogue turns`
                : `Calibrated for ${activeReport.targetCompany}`}
            </span>
          </div>
        </div>
      </div>

      {/* CANDIDATE-ONLY EVALUATION BASIS & SCORING TRANSPARENCY CARD */}
      <div
        data-testid="evaluation-basis-card"
        className="glass-panel rounded-2xl p-5 text-left space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#eff4ff] text-[#3525cd] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-heading text-sm font-bold text-[#0b1c30]">
                How This Report Was Scored — Candidate Responses Only
              </h3>
              <p className="text-xs text-[#565e74]">
                100% of scores reflect only your spoken answers and session completion. All AI interviewer prompts are excluded.
              </p>
            </div>
          </div>
          <span className="text-[11px] font-semibold text-[#3525cd] bg-indigo-50/70 px-2.5 py-1 rounded-full self-start sm:self-auto shrink-0 border border-indigo-200/50">
            {scoringMethodLabel}
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="glass-subcard p-3.5 rounded-xl">
            <div className="text-[11px] font-semibold text-[#565e74]">Candidate Turns Scored</div>
            <div className="font-heading text-xl font-bold text-[#0b1c30] mt-0.5 tabular-nums">
              {candidateTurnsAnalyzed}
            </div>
          </div>
          <div className="glass-subcard p-3.5 rounded-xl">
            <div className="text-[11px] font-semibold text-[#565e74]">AI Turns Excluded</div>
            <div className="font-heading text-xl font-bold text-[#0b1c30] mt-0.5 tabular-nums">
              {aiTurnsExcluded}
            </div>
          </div>
          <div className="glass-subcard p-3.5 rounded-xl">
            <div className="text-[11px] font-semibold text-[#565e74]">Topics Answered</div>
            <div className="font-heading text-xl font-bold text-[#0b1c30] mt-0.5 tabular-nums">
              {topicsAnswered} / {totalTopics}
            </div>
          </div>
          <div className="glass-subcard p-3.5 rounded-xl">
            <div className="text-[11px] font-semibold text-[#565e74]">Candidate Words Analyzed</div>
            <div className="font-heading text-xl font-bold text-[#0b1c30] mt-0.5 tabular-nums">
              {totalCandidateWords}
            </div>
          </div>
        </div>

        <div className="text-xs text-[#464555] bg-indigo-50/45 backdrop-blur-sm px-3.5 py-2.5 rounded-xl border border-indigo-200/45 flex flex-wrap items-center justify-between gap-2">
          <span>
            <strong className="text-[#0b1c30]">Weighted Rubric Formula:</strong>{' '}
            {weights.technicalCorrectness}% Technical Depth + {weights.tradeoffAnalysis}% Tradeoff Analysis +{' '}
            {weights.communicationStructure}% Structure &amp; STAR + {weights.problemDecomposition}% Problem Decomposition
          </span>
          <span className="text-[11px] font-semibold text-emerald-700">
            AI Speech Filtered Out
          </span>
        </div>
      </div>

      {/* Top 5-Metric Scorecard Highlights (Overall + All 4 Independent Rubric Pillars) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 text-left">
        {/* Metric 1: Overall Score */}
        <GlassTiltCard3D intensity={3.5} hoverLift={3}>
          <div className="glass-panel rounded-2xl p-5 flex flex-col justify-between h-full">
            <div className="flex items-start justify-between gap-2 min-h-[34px]">
              <span className="text-xs font-bold text-[#565e74] uppercase tracking-wider">Overall Score</span>
              <BarChart2 className="w-5 h-5 text-[#3525cd] shrink-0" />
            </div>
            <div className="my-3 flex items-baseline gap-1.5">
              <span className="font-heading text-4xl font-bold text-[#0b1c30] tabular-nums">
                <AnimatedCounter value={activeReport.overallScore} />
              </span>
              <span className="text-sm text-[#777587]">/ 100</span>
            </div>
            <div>
              <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold mb-1 ${tier.badgeClass}`}>
                {tier.label}
              </div>
              <p className="text-xs text-[#565e74]">
                Top <strong className="text-[#0b1c30]">{topPercentile}%</strong> vs {activeReport.targetCompany} bar.
              </p>
            </div>
          </div>
        </GlassTiltCard3D>

        {/* Metric 2: Technical Correctness */}
        <GlassTiltCard3D intensity={3.5} hoverLift={3}>
          <div className="glass-panel rounded-2xl p-5 flex flex-col justify-between h-full">
            <div className="flex items-start justify-between gap-2 min-h-[34px]">
              <span className="text-xs font-bold text-[#565e74] uppercase tracking-wider">Technical Depth</span>
              <span className="text-[11px] font-bold text-[#3525cd] bg-indigo-50/80 px-2 py-0.5 rounded-full whitespace-nowrap shrink-0">35%</span>
            </div>
            <div className="my-3 flex items-baseline gap-1.5">
              <span className="font-heading text-4xl font-bold text-[#0b1c30] tabular-nums">
                <AnimatedCounter value={activeReport.categoryScores.technicalCorrectness} />
              </span>
              <span className="text-sm text-[#777587]">/ 100</span>
            </div>
            <div>
              <div className="w-full bg-white/70 h-1.5 rounded-full overflow-hidden mb-1.5">
                <div
                  className="bg-[#3525cd] h-full rounded-full transition-all duration-700"
                  style={{ width: `${activeReport.categoryScores.technicalCorrectness}%` }}
                />
              </div>
              <p className="text-xs text-[#565e74]">{getMetricNote(activeReport.categoryScores.technicalCorrectness, 'tech')}</p>
            </div>
          </div>
        </GlassTiltCard3D>

        {/* Metric 3: Tradeoff Analysis */}
        <GlassTiltCard3D intensity={3.5} hoverLift={3}>
          <div className="glass-panel rounded-2xl p-5 flex flex-col justify-between h-full">
            <div className="flex items-start justify-between gap-2 min-h-[34px]">
              <span className="text-xs font-bold text-[#565e74] uppercase tracking-wider">Tradeoffs</span>
              <span className="text-[11px] font-bold text-[#3525cd] bg-indigo-50/80 px-2 py-0.5 rounded-full whitespace-nowrap shrink-0">25%</span>
            </div>
            <div className="my-3 flex items-baseline gap-1.5">
              <span className="font-heading text-4xl font-bold text-[#0b1c30] tabular-nums">
                <AnimatedCounter value={activeReport.categoryScores.tradeoffAnalysis} />
              </span>
              <span className="text-sm text-[#777587]">/ 100</span>
            </div>
            <div>
              <div className="w-full bg-white/70 h-1.5 rounded-full overflow-hidden mb-1.5">
                <div
                  className="bg-[#4f46e5] h-full rounded-full transition-all duration-700"
                  style={{ width: `${activeReport.categoryScores.tradeoffAnalysis}%` }}
                />
              </div>
              <p className="text-xs text-[#565e74]">{getMetricNote(activeReport.categoryScores.tradeoffAnalysis, 'tradeoff')}</p>
            </div>
          </div>
        </GlassTiltCard3D>

        {/* Metric 4: Communication Structure */}
        <GlassTiltCard3D intensity={3.5} hoverLift={3}>
          <div className="glass-panel rounded-2xl p-5 flex flex-col justify-between h-full">
            <div className="flex items-start justify-between gap-2 min-h-[34px]">
              <span className="text-xs font-bold text-[#565e74] uppercase tracking-wider">Structure &amp; STAR</span>
              <span className="text-[11px] font-bold text-[#3525cd] bg-indigo-50/80 px-2 py-0.5 rounded-full whitespace-nowrap shrink-0">20%</span>
            </div>
            <div className="my-3 flex items-baseline gap-1.5">
              <span className="font-heading text-4xl font-bold text-[#0b1c30] tabular-nums">
                <AnimatedCounter value={activeReport.categoryScores.communicationStructure} />
              </span>
              <span className="text-sm text-[#777587]">/ 100</span>
            </div>
            <div>
              <div className="w-full bg-white/70 h-1.5 rounded-full overflow-hidden mb-1.5">
                <div
                  className="bg-emerald-600 h-full rounded-full transition-all duration-700"
                  style={{ width: `${activeReport.categoryScores.communicationStructure}%` }}
                />
              </div>
              <p className="text-xs text-[#565e74]">{getMetricNote(activeReport.categoryScores.communicationStructure, 'comm')}</p>
            </div>
          </div>
        </GlassTiltCard3D>

        {/* Metric 5: Problem Decomposition */}
        <GlassTiltCard3D intensity={3.5} hoverLift={3}>
          <div className="glass-panel rounded-2xl p-5 flex flex-col justify-between h-full">
            <div className="flex items-start justify-between gap-2 min-h-[34px]">
              <span className="text-xs font-bold text-[#565e74] uppercase tracking-wider">Decomposition</span>
              <span className="text-[11px] font-bold text-[#3525cd] bg-indigo-50/80 px-2 py-0.5 rounded-full whitespace-nowrap shrink-0">20%</span>
            </div>
            <div className="my-3 flex items-baseline gap-1.5">
              <span className="font-heading text-4xl font-bold text-[#0b1c30] tabular-nums">
                <AnimatedCounter value={activeReport.categoryScores.problemDecomposition} />
              </span>
              <span className="text-sm text-[#777587]">/ 100</span>
            </div>
            <div>
              <div className="w-full bg-white/70 h-1.5 rounded-full overflow-hidden mb-1.5">
                <div
                  className="bg-indigo-500 h-full rounded-full transition-all duration-700"
                  style={{ width: `${activeReport.categoryScores.problemDecomposition}%` }}
                />
              </div>
              <p className="text-xs text-[#565e74]">{getMetricNote(activeReport.categoryScores.problemDecomposition, 'decomp')}</p>
            </div>
          </div>
        </GlassTiltCard3D>
      </div>

      {/* ACTIONABLE COACHING & WHAT-TO-IMPROVE PRIORITIES */}
      <div
        data-testid="improvement-plan-card"
        className="glass-panel rounded-2xl p-5 text-left space-y-3"
      >
        <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-white/60">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-[#3525cd]" />
            <h3 className="font-heading text-sm sm:text-base font-bold text-[#0b1c30]">
              Targeted Improvement Plan — What to Improve Next
            </h3>
          </div>
          <span className="text-[11px] font-semibold text-[#565e74]">
            Prioritized from your spoken gaps
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {feedbacks
            .flatMap((fb) =>
              (fb.suggestedImprovements || []).map((tip, idx) => ({
                topic: fb.category || 'Session',
                score: fb.score,
                tip,
                id: `${fb.questionId}_${idx}`,
              }))
            )
            .slice(0, 4)
            .map((item) => (
              <div
                key={item.id}
                className="glass-subcard p-3.5 rounded-xl flex items-start gap-2.5"
              >
                <Lightbulb className="w-4 h-4 text-[#3525cd] shrink-0 mt-0.5" />
                <div className="text-xs text-[#464555] leading-relaxed">
                  <span className="font-bold text-[#0b1c30] block mb-0.5">
                    {item.topic} ({item.score}/100)
                  </span>
                  {item.tip}
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* QUESTION BY QUESTION DEEP DIVE WITH ACTUAL SPOKEN TRANSCRIPT EVIDENCE */}
      <div className="glass-panel rounded-2xl p-6 text-left">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/60 mb-5">
          <div>
            <h3 className="font-heading text-lg font-bold text-[#0b1c30]">Question-by-Question Rubric Analysis</h3>
            <p className="text-xs text-[#565e74]">
              Evaluated directly from what you spoke during the AI interview session
            </p>
          </div>

          {/* Filter options */}
          <div className="glass-pill-bar flex items-center gap-1 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setFilterScore('all')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                filterScore === 'all' ? 'glass-btn-primary' : 'text-[#565e74] hover:text-[#0b1c30]'
              }`}
            >
              All Questions ({feedbacks.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterScore('high')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                filterScore === 'high' ? 'glass-btn-primary' : 'text-[#565e74] hover:text-[#0b1c30]'
              }`}
            >
              High Scoring (85+)
            </button>
            <button
              type="button"
              onClick={() => setFilterScore('needs-work')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                filterScore === 'needs-work' ? 'glass-btn-primary' : 'text-[#565e74] hover:text-[#0b1c30]'
              }`}
            >
              Needs Work (&lt;85)
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {filteredFeedbacks.length === 0 ? (
            <div className="glass-subcard p-8 text-center text-xs text-[#565e74] rounded-2xl">
              No questions matched this score filter.{' '}
              <button
                type="button"
                onClick={() => setFilterScore('all')}
                className="text-[#4f46e5] font-semibold hover:underline"
              >
                Show all questions
              </button>
            </div>
          ) : (
            filteredFeedbacks.map((fb, idx) => {
              const questionData = questions.find((q) => q.id === fb.questionId) || questions[idx];
              const resolvedCategory = fb.category || questionData?.category || `Topic ${idx + 1}`;
              const resolvedQuestionText = fb.questionText || questionData?.questionText || `Interview Question ${idx + 1}`;
              const isExpanded = expandedQuestion === fb.questionId;

              return (
                <div
                  key={fb.questionId || idx}
                  className="glass-subcard rounded-2xl overflow-hidden transition-all"
                >
                  {/* Accordion Trigger */}
                  <div
                    onClick={() => setExpandedQuestion(isExpanded ? '' : fb.questionId)}
                    className="p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer hover:bg-white/55 transition-colors"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="w-7 h-7 rounded-lg bg-[#3525cd] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <span className="text-xs text-[#3525cd] font-bold uppercase tracking-wider">
                          {resolvedCategory}
                        </span>
                        <h4 className="font-heading text-sm sm:text-base font-bold text-[#0b1c30] truncate mt-0.5">
                          {resolvedQuestionText}
                        </h4>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right tabular-nums">
                        <span className="font-heading text-lg font-bold text-[#0b1c30]">{fb.score}</span>
                        <span className="text-xs text-[#777587]">/100</span>
                      </div>
                      {isExpanded ? <ChevronUp className="w-5 h-5 text-[#565e74]" /> : <ChevronDown className="w-5 h-5 text-[#565e74]" />}
                    </div>
                  </div>

                  {/* Expanded Details with AnimatePresence */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="p-5 border-t border-white/60 bg-white/55 backdrop-blur-md space-y-5 overflow-hidden"
                      >
                        {/* Actual Candidate Spoken Response & Follow-Up Evidence */}
                        {(fb.candidateResponse || fb.followUpQuestion || fb.followUpResponse) && (
                          <div className="space-y-2.5">
                            {fb.candidateResponse && (
                              <div className="glass-subcard p-3.5 rounded-xl">
                                <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#0b1c30] uppercase tracking-wider mb-1">
                                  <Mic className="w-3.5 h-3.5 text-[#3525cd]" />
                                  <span>Your Spoken Answer</span>
                                </div>
                                <p className="text-xs text-[#464555] leading-relaxed">
                                  “{fb.candidateResponse}”
                                </p>
                              </div>
                            )}

                            {(fb.followUpQuestion || fb.followUpResponse) && (
                              <div className="p-3.5 rounded-xl bg-indigo-50/45 border border-indigo-200/50 space-y-1.5">
                                {fb.followUpQuestion && (
                                  <div className="text-xs text-[#0b1c30]">
                                    <span className="font-bold text-[#3525cd]">AI Follow-Up: </span>
                                    {fb.followUpQuestion}
                                  </div>
                                )}
                                {fb.followUpResponse && (
                                  <div className="text-xs text-[#464555]">
                                    <span className="font-bold text-[#0b1c30]">Your Follow-Up Reply: </span>
                                    “{fb.followUpResponse}”
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Rubric Criterion Breakdown */}
                        <div>
                          <h5 className="text-xs font-bold text-[#0b1c30] uppercase tracking-wider mb-2">
                            Criterion Scoring Breakdown
                          </h5>
                          <div className="space-y-2">
                            {(fb.criterionScores || []).map((c, cIdx) => (
                              <div key={cIdx} className="glass-subcard p-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                  <div className="text-xs font-bold text-[#0b1c30]">{c.criterion}</div>
                                  <p className="text-xs text-[#464555] mt-0.5">{c.feedback}</p>
                                </div>
                                <span className="text-xs font-bold text-[#3525cd] bg-indigo-50/80 px-2.5 py-1 rounded-lg shrink-0 tabular-nums">
                                  {c.score}/100
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Strengths & Missing Concepts Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Strengths */}
                          <div className="p-4 bg-emerald-50/60 border border-emerald-200/60 rounded-xl">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 uppercase tracking-wider mb-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              Demonstrated Strengths
                            </div>
                            <ul className="space-y-1 text-xs text-[#464555]">
                              {(fb.strengths || []).map((s, sIdx) => (
                                <li key={sIdx} className="flex items-start gap-1.5">
                                  <span className="text-emerald-600 font-bold">•</span>
                                  <span>{s}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Missing Concepts */}
                          <div className="p-4 bg-amber-50/60 border border-amber-200/60 rounded-xl">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 uppercase tracking-wider mb-2">
                              <AlertTriangle className="w-4 h-4 text-amber-600" />
                              Key Missing Concepts or Gaps
                            </div>
                            <ul className="space-y-1 text-xs text-[#464555]">
                              {(fb.missingConcepts || []).length > 0 ? (
                                fb.missingConcepts.map((m, mIdx) => (
                                  <li key={mIdx} className="flex items-start gap-1.5">
                                    <span className="text-amber-600 font-bold">•</span>
                                    <span>{m}</span>
                                  </li>
                                ))
                              ) : (
                                <li className="text-xs text-[#565e74] italic">
                                  No critical conceptual omissions detected.
                                </li>
                              )}
                            </ul>
                          </div>
                        </div>

                        {/* Suggested Improvements (How to Improve This Topic) */}
                        {(fb.suggestedImprovements || []).length > 0 && (
                          <div className="glass-subcard p-4 rounded-xl border border-indigo-200/50">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-[#3525cd] uppercase tracking-wider mb-2">
                              <Lightbulb className="w-4 h-4" />
                              How to Improve This Answer
                            </div>
                            <ul className="space-y-1.5 text-xs text-[#0b1c30]">
                              {fb.suggestedImprovements.map((tip, tipIdx) => (
                                <li key={tipIdx} className="flex items-start gap-1.5">
                                  <span className="text-[#3525cd] font-bold">•</span>
                                  <span>{tip}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Model Exemplar Answer */}
                        <div className="p-4 rounded-xl bg-indigo-50/55 border border-indigo-200/50">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-[#3525cd] uppercase tracking-wider mb-1.5">
                            <Sparkles className="w-4 h-4" />
                            High-Bar Exemplar Approach
                          </div>
                          <p className="text-xs text-[#0b1c30] leading-relaxed font-sans">
                            “{fb.modelExemplarAnswer}”
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* SAVED INTERVIEW CONVERSATION TRANSCRIPT (Bounded Scrollable Window) */}
      {conversationTurns.length > 0 && (
        <div className="glass-panel rounded-2xl overflow-hidden text-left">
          <div className="px-6 py-4 border-b border-white/60 bg-white/50 backdrop-blur-md flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#3525cd]" />
              <div>
                <h3 className="font-heading text-base font-bold text-[#0b1c30]">
                  Saved Interview Conversation Transcript
                </h3>
                <p className="text-xs text-[#565e74]">
                  {conversationTurns.length} recorded turns preserved with this session report
                </p>
              </div>
            </div>
            <span className="text-[11px] font-semibold text-[#3525cd] bg-indigo-50/75 px-2.5 py-1 rounded-full border border-indigo-200/45 whitespace-nowrap">
              Verified Record
            </span>
          </div>

          <div
            data-testid="saved-report-transcript-window"
            className="h-[320px] overflow-y-auto custom-scrollbar px-6 py-4 space-y-3 bg-white/30"
          >
            {conversationTurns.map((turn, tIdx) => {
              const isAi = turn.speaker === 'ai';
              return (
                <div key={turn.id || tIdx} className={`flex flex-col ${isAi ? 'items-start' : 'items-end'}`}>
                  <div className="flex items-center gap-2 text-[11px] text-[#777587] mb-1 px-1">
                    <span className="font-semibold text-[#0b1c30]">
                      {isAi ? turn.speakerName : `${turn.speakerName} (You)`}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="capitalize">{turn.kind.replace('-', ' ')}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">{turn.timestamp}</span>
                  </div>
                  <div
                    className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed border ${
                      isAi
                        ? 'bg-white/80 backdrop-blur-md border-white/75 text-[#0b1c30] shadow-xs'
                        : 'glass-btn-primary border-transparent text-white'
                    }`}
                  >
                    {turn.topicTitle && isAi && (
                      <div className="text-[10px] font-semibold text-[#3525cd] mb-0.5">{turn.topicTitle}</div>
                    )}
                    <p>{turn.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CONNECT TO PERSONALIZED LEARNING ROADMAP CTA */}
      <div className="glass-dark p-6 rounded-2xl text-white flex flex-col sm:flex-row items-center justify-between gap-6 text-left">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/15 border border-white/20 text-white flex items-center justify-center shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-heading text-lg font-bold text-white">
              Recommended Focus Areas from this Session
            </h4>
            <p className="text-xs text-slate-300 max-w-xl mt-1 leading-relaxed">
              {(activeReport.recommendedDrills || []).length > 0
                ? `Next targeted drills: ${activeReport.recommendedDrills.join(' • ')}.`
                : `Continue practicing structured verbal answers tailored to ${activeReport.targetRole} at ${activeReport.targetCompany}.`}
            </p>
          </div>
        </div>

        <Link
          to="/learning-plan"
          className="glass-btn-primary px-6 py-3 rounded-xl font-semibold text-xs flex items-center gap-2 shrink-0 whitespace-nowrap"
        >
          <BookOpen className="w-4 h-4" />
          <span>Open Adaptive Learning Plan</span>
        </Link>
      </div>
    </div>
  );
};
