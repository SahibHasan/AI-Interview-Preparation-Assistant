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
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { AnimatedCounter } from '../components/common/AnimatedCounter';
import { Skeleton } from '../components/common/Skeleton';
import { downloadSummaryPDF } from '../utils/pdfExport';

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
  return {
    label: 'Needs Practice',
    badgeClass: 'bg-amber-50 text-amber-800 border border-amber-200',
  };
}

function getMetricNote(score: number, domain: 'tech' | 'tradeoff' | 'comm'): string {
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
        <div className="bg-white rounded-xl p-6 border border-[#e2e8f0] shadow-sm space-y-4">
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl p-5 border border-[#e2e8f0] shadow-sm space-y-3">
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
        <div className="max-w-lg w-full bg-white rounded-2xl border border-[#e2e8f0] shadow-sm p-8 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#eff4ff] text-[#3525cd] flex items-center justify-center mx-auto">
            <BarChart2 className="w-7 h-7" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-[#0b1c30]">No Evaluation Reports Yet</h1>
          <p className="text-sm text-[#464555] leading-relaxed">
            Complete a verbal mock interview session with our AI interviewer to generate a real-time evaluation scorecard from your actual conversation transcript. Your saved reports will automatically appear here across every login.
          </p>
          <div className="pt-2 flex items-center justify-center gap-3 flex-wrap">
            <Link
              to="/interview-setup"
              className="inline-flex items-center gap-2 bg-[#4f46e5] hover:bg-[#3525cd] text-white px-5 py-2.5 rounded-xl text-xs font-semibold shadow-sm transition-all active:scale-95"
            >
              <Mic className="w-4 h-4" />
              <span>Start Verbal Mock Interview</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1.5 bg-[#f8f9ff] hover:bg-[#eff4ff] text-[#0b1c30] border border-[#e2e8f0] px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors"
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

  const handleDownloadPDF = () => {
    showToast({
      title: 'Preparing Executive PDF',
      message: 'Opening system print dialog with executive precision layout.',
      type: 'info',
    });
    window.print();
  };

  const handleDownloadSummary = () => {
    downloadSummaryPDF(activeReport, candidateDisplayName);
    showToast({
      title: 'Executive Summary Downloaded',
      message: `Exported 1-page executive summary for Session #${activeReport.id.slice(0, 8)}.`,
      type: 'success',
    });
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

  const handleExportTranscript = () => {
    const transcriptPayload = {
      reportId: activeReport.id,
      sessionId: activeReport.sessionId,
      candidate: candidateDisplayName,
      targetRole: activeReport.targetRole,
      targetCompany: activeReport.targetCompany,
      interviewerPersona: activeReport.interviewerPersona || 'AI Interviewer',
      overallScore: activeReport.overallScore,
      completedAt: activeReport.completedAt,
      durationFormatted: activeReport.durationFormatted,
      conversationTranscript: activeReport.conversationTranscript || [],
      feedback: activeReport.questionFeedbacks || [],
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(transcriptPayload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `preppilot_transcript_session_${activeReport.id.slice(0, 12)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    showToast({
      title: 'Transcript Exported',
      message: `Downloaded full conversation transcript & evaluation in JSON format.`,
      type: 'success',
    });
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
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 text-left">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-[#565e74] uppercase tracking-wider font-semibold mb-1">
            <span>Platform</span>
            <span>•</span>
            <span className="text-[#3525cd]">Evaluation Reports</span>
            <span>•</span>
            <span className="text-[#0b1c30]">Session #{activeReport.id.slice(0, 12)}</span>
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-[#0b1c30] tracking-tight">
            AI Evaluation Report &amp; Scorecard
          </h1>
        </div>

        {/* Action Toolbar + Saved Report Switcher */}
        <div className="flex items-center flex-wrap gap-2">
          {savedReports.length > 1 && (
            <div className="inline-flex items-center gap-1.5 bg-white border border-[#e2e8f0] rounded-lg px-2.5 py-1.5 shadow-sm">
              <Layers className="w-3.5 h-3.5 text-[#3525cd]" />
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

          <button
            type="button"
            onClick={handleDownloadPDF}
            className="flex items-center gap-1.5 bg-white text-[#0b1c30] px-3.5 py-2 rounded-lg text-xs font-semibold hover:bg-[#eff4ff] transition-colors border border-[#e2e8f0] shadow-sm active:scale-95"
          >
            <Download className="w-3.5 h-3.5 text-[#3525cd]" />
            <span>Download Report</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadSummary}
            className="flex items-center gap-1.5 bg-white text-[#0b1c30] px-3.5 py-2 rounded-lg text-xs font-semibold hover:bg-[#eff4ff] transition-colors border border-[#e2e8f0] shadow-sm active:scale-95"
          >
            <FileText className="w-3.5 h-3.5 text-[#059669]" />
            <span>Download Summary</span>
          </button>

          <button
            type="button"
            onClick={handleExportTranscript}
            className="flex items-center gap-1.5 bg-white text-[#0b1c30] px-3.5 py-2 rounded-lg text-xs font-semibold hover:bg-[#eff4ff] transition-colors border border-[#e2e8f0] shadow-sm active:scale-95"
          >
            <FileText className="w-3.5 h-3.5 text-[#565e74]" />
            <span>Export Transcript</span>
          </button>

          <button
            type="button"
            onClick={handleShare}
            className="flex items-center gap-1.5 bg-white text-[#0b1c30] px-3.5 py-2 rounded-lg text-xs font-semibold hover:bg-[#eff4ff] transition-colors border border-[#e2e8f0] shadow-sm active:scale-95"
          >
            <Share2 className="w-3.5 h-3.5 text-[#565e74]" />
            <span>Share</span>
          </button>

          <Link
            to="/interview-setup"
            className="flex items-center gap-1.5 bg-[#4f46e5] text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-[#3525cd] transition-all shadow-sm active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retake Drill</span>
          </Link>
        </div>
      </div>

      {/* Calibrated Audit Header Card */}
      <div className="bg-white rounded-xl p-6 border border-[#e2e8f0] shadow-sm flex flex-col gap-4 relative overflow-hidden text-left">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 z-10">
          <div className="flex flex-col gap-2 max-w-3xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-[#dae2fd] text-[#131b2e] text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                Transcript-Grounded Report
              </span>
              <span className="bg-[#e2dfff] text-[#3323cc] text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                Benchmark: {activeReport.calibratedBenchmark || `${activeReport.targetCompany} Bar`}
              </span>
              <span className="bg-[#f8f9ff] text-[#565e74] text-xs px-2.5 py-1 rounded-full border border-[#e2e8f0]">
                Completed: {activeReport.completedAt}
              </span>
              <span className="bg-[#f8f9ff] text-[#565e74] text-xs px-2.5 py-1 rounded-full border border-[#e2e8f0]">
                Duration: {activeReport.durationFormatted}
              </span>
            </div>

            <h2 className="font-heading text-xl font-bold text-[#0b1c30] mt-1">
              Transcript Rubric Synthesis — {activeReport.targetRole} @ {activeReport.targetCompany}
            </h2>
            <p className="text-sm text-[#464555] leading-relaxed">
              {activeReport.overallSummary}
            </p>
          </div>

          <div className="flex flex-col items-start lg:items-end gap-1 bg-[#eff4ff] p-3.5 rounded-xl border border-[#c7c4d8]/40 shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
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
        className="bg-white rounded-xl p-5 border border-[#c7d2fe] shadow-sm text-left space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#e2e8f0]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#eff4ff] text-[#3525cd] flex items-center justify-center shrink-0">
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
          <span className="text-[11px] font-semibold text-[#3525cd] bg-[#eff4ff] px-2.5 py-1 rounded-full self-start sm:self-auto shrink-0">
            {scoringMethodLabel}
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-[#f8f9ff] border border-[#e2e8f0]">
            <div className="text-[11px] font-semibold text-[#565e74]">Candidate Turns Scored</div>
            <div className="font-heading text-xl font-bold text-[#0b1c30] mt-0.5 tabular-nums">
              {candidateTurnsAnalyzed}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-[#f8f9ff] border border-[#e2e8f0]">
            <div className="text-[11px] font-semibold text-[#565e74]">AI Turns Excluded</div>
            <div className="font-heading text-xl font-bold text-[#0b1c30] mt-0.5 tabular-nums">
              {aiTurnsExcluded}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-[#f8f9ff] border border-[#e2e8f0]">
            <div className="text-[11px] font-semibold text-[#565e74]">Topics Answered</div>
            <div className="font-heading text-xl font-bold text-[#0b1c30] mt-0.5 tabular-nums">
              {topicsAnswered} / {totalTopics}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-[#f8f9ff] border border-[#e2e8f0]">
            <div className="text-[11px] font-semibold text-[#565e74]">Candidate Words Analyzed</div>
            <div className="font-heading text-xl font-bold text-[#0b1c30] mt-0.5 tabular-nums">
              {totalCandidateWords}
            </div>
          </div>
        </div>

        <div className="text-xs text-[#464555] bg-[#eff4ff]/60 px-3.5 py-2.5 rounded-lg border border-[#c7d2fe]/60 flex flex-wrap items-center justify-between gap-2">
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

      {/* Top 4-Metric Scorecard Highlights with Animated Counters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
        {/* Metric 1: Overall Score */}
        <div className="bg-white rounded-xl p-5 border border-[#e2e8f0] shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-xs font-bold text-[#565e74] uppercase tracking-wider">Overall Score</span>
            <BarChart2 className="w-5 h-5 text-[#3525cd]" />
          </div>
          <div className="my-3 flex items-baseline gap-1.5">
            <span className="font-heading text-4xl font-bold text-[#0b1c30]">
              <AnimatedCounter value={activeReport.overallScore} />
            </span>
            <span className="text-sm text-[#777587]">/ 100</span>
          </div>
          <div>
            <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold mb-1 ${tier.badgeClass}`}>
              {tier.label} • {activeReport.targetCompany}
            </div>
            <p className="text-xs text-[#565e74]">
              Top <strong className="text-[#0b1c30]">{topPercentile}% percentile</strong> vs calibrated role baseline.
            </p>
          </div>
        </div>

        {/* Metric 2: Technical Correctness */}
        <div className="bg-white rounded-xl p-5 border border-[#e2e8f0] shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs font-bold text-[#565e74] uppercase tracking-wider">Technical Depth</span>
            <span className="text-xs font-bold text-[#3525cd] bg-[#eff4ff] px-2 py-0.5 rounded-full whitespace-nowrap shrink-0">Weight 35%</span>
          </div>
          <div className="my-3 flex items-baseline gap-1.5">
            <span className="font-heading text-4xl font-bold text-[#0b1c30]">
              <AnimatedCounter value={activeReport.categoryScores.technicalCorrectness} />
            </span>
            <span className="text-sm text-[#777587]">/ 100</span>
          </div>
          <div>
            <div className="w-full bg-[#eff4ff] h-1.5 rounded-full overflow-hidden mb-1.5">
              <div
                className="bg-[#3525cd] h-full rounded-full transition-all duration-700"
                style={{ width: `${activeReport.categoryScores.technicalCorrectness}%` }}
              />
            </div>
            <p className="text-xs text-[#565e74]">{getMetricNote(activeReport.categoryScores.technicalCorrectness, 'tech')}</p>
          </div>
        </div>

        {/* Metric 3: Tradeoff Analysis */}
        <div className="bg-white rounded-xl p-5 border border-[#e2e8f0] shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs font-bold text-[#565e74] uppercase tracking-wider">Tradeoff Analysis</span>
            <span className="text-xs font-bold text-[#3525cd] bg-[#eff4ff] px-2 py-0.5 rounded-full whitespace-nowrap shrink-0">Weight 25%</span>
          </div>
          <div className="my-3 flex items-baseline gap-1.5">
            <span className="font-heading text-4xl font-bold text-[#0b1c30]">
              <AnimatedCounter value={activeReport.categoryScores.tradeoffAnalysis} />
            </span>
            <span className="text-sm text-[#777587]">/ 100</span>
          </div>
          <div>
            <div className="w-full bg-[#eff4ff] h-1.5 rounded-full overflow-hidden mb-1.5">
              <div
                className="bg-[#4f46e5] h-full rounded-full transition-all duration-700"
                style={{ width: `${activeReport.categoryScores.tradeoffAnalysis}%` }}
              />
            </div>
            <p className="text-xs text-[#565e74]">{getMetricNote(activeReport.categoryScores.tradeoffAnalysis, 'tradeoff')}</p>
          </div>
        </div>

        {/* Metric 4: Communication Structure */}
        <div className="bg-white rounded-xl p-5 border border-[#e2e8f0] shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs font-bold text-[#565e74] uppercase tracking-wider">Structure &amp; STAR</span>
            <span className="text-xs font-bold text-[#3525cd] bg-[#eff4ff] px-2 py-0.5 rounded-full whitespace-nowrap shrink-0">Weight 20%</span>
          </div>
          <div className="my-3 flex items-baseline gap-1.5">
            <span className="font-heading text-4xl font-bold text-[#0b1c30]">
              <AnimatedCounter value={activeReport.categoryScores.communicationStructure} />
            </span>
            <span className="text-sm text-[#777587]">/ 100</span>
          </div>
          <div>
            <div className="w-full bg-[#eff4ff] h-1.5 rounded-full overflow-hidden mb-1.5">
              <div
                className="bg-emerald-600 h-full rounded-full transition-all duration-700"
                style={{ width: `${activeReport.categoryScores.communicationStructure}%` }}
              />
            </div>
            <p className="text-xs text-[#565e74]">{getMetricNote(activeReport.categoryScores.communicationStructure, 'comm')}</p>
          </div>
        </div>
      </div>

      {/* QUESTION BY QUESTION DEEP DIVE WITH ACTUAL SPOKEN TRANSCRIPT EVIDENCE */}
      <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm p-6 text-left">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#e2e8f0] mb-5">
          <div>
            <h3 className="font-heading text-lg font-bold text-[#0b1c30]">Question-by-Question Rubric Analysis</h3>
            <p className="text-xs text-[#565e74]">
              Evaluated directly from what you spoke during the AI interview session
            </p>
          </div>

          {/* Filter options */}
          <div className="flex items-center gap-1.5 bg-[#f8f9ff] p-1 rounded-lg border border-[#e2e8f0]">
            <button
              type="button"
              onClick={() => setFilterScore('all')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                filterScore === 'all' ? 'bg-[#4f46e5] text-white shadow-sm' : 'text-[#565e74]'
              }`}
            >
              All Questions ({feedbacks.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterScore('high')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                filterScore === 'high' ? 'bg-[#4f46e5] text-white shadow-sm' : 'text-[#565e74]'
              }`}
            >
              High Scoring (85+)
            </button>
            <button
              type="button"
              onClick={() => setFilterScore('needs-work')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                filterScore === 'needs-work' ? 'bg-[#4f46e5] text-white shadow-sm' : 'text-[#565e74]'
              }`}
            >
              Needs Work (&lt;85)
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {filteredFeedbacks.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#565e74] bg-[#f8f9ff] rounded-xl border border-[#e2e8f0]">
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
                  className="border border-[#e2e8f0] rounded-xl overflow-hidden transition-all bg-[#f8f9ff]"
                >
                  {/* Accordion Trigger */}
                  <div
                    onClick={() => setExpandedQuestion(isExpanded ? '' : fb.questionId)}
                    className="p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer hover:bg-[#eff4ff]/60 transition-colors"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="w-7 h-7 rounded-lg bg-[#3525cd] text-white flex items-center justify-center font-bold text-xs shrink-0">
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
                      <div className="text-right">
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
                        className="p-5 border-t border-[#e2e8f0] bg-white space-y-5 overflow-hidden"
                      >
                        {/* Actual Candidate Spoken Response & Follow-Up Evidence */}
                        {(fb.candidateResponse || fb.followUpQuestion || fb.followUpResponse) && (
                          <div className="space-y-2.5">
                            {fb.candidateResponse && (
                              <div className="p-3.5 rounded-xl bg-[#f8f9ff] border border-[#e2e8f0]">
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
                              <div className="p-3.5 rounded-xl bg-[#eff4ff]/60 border border-[#c7d2fe]/60 space-y-1.5">
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
                              <div key={cIdx} className="p-3 rounded-lg bg-[#f8f9ff] border border-[#e2e8f0] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                  <div className="text-xs font-bold text-[#0b1c30]">{c.criterion}</div>
                                  <p className="text-xs text-[#464555] mt-0.5">{c.feedback}</p>
                                </div>
                                <span className="text-xs font-bold text-[#3525cd] bg-[#eff4ff] px-2.5 py-1 rounded-md shrink-0">
                                  {c.score}/100
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Strengths & Missing Concepts Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Strengths */}
                          <div className="p-4 bg-emerald-50/70 border border-emerald-100 rounded-xl">
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
                          <div className="p-4 bg-amber-50/70 border border-amber-100 rounded-xl">
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

                        {/* Model Exemplar Answer */}
                        <div className="p-4 rounded-xl bg-[#eff4ff] border border-[#c7c4d8]/50">
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
        <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden text-left">
          <div className="px-6 py-4 border-b border-[#e2e8f0] bg-[#f8f9ff] flex items-center justify-between gap-3">
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
            <span className="text-[11px] font-semibold text-[#3525cd] bg-[#eff4ff] px-2.5 py-1 rounded-full">
              Verified Record
            </span>
          </div>

          <div
            data-testid="saved-report-transcript-window"
            className="h-[320px] overflow-y-auto custom-scrollbar px-6 py-4 space-y-3 bg-[#fcfdff]"
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
                    className={`max-w-[88%] rounded-xl px-4 py-2.5 text-xs leading-relaxed border ${
                      isAi
                        ? 'bg-white border-[#e2e8f0] text-[#0b1c30]'
                        : 'bg-[#4f46e5] border-[#3525cd] text-white'
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
      <div className="p-6 rounded-2xl bg-gradient-to-r from-[#0f172a] to-[#213145] text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-md text-left">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#4f46e5] text-white flex items-center justify-center shrink-0 shadow-sm">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-heading text-lg font-bold text-white">
              Recommended Focus Areas from this Session
            </h4>
            <p className="text-xs text-[#94a3b8] max-w-xl mt-1 leading-relaxed">
              {(activeReport.recommendedDrills || []).length > 0
                ? `Next targeted drills: ${activeReport.recommendedDrills.join(' • ')}.`
                : `Continue practicing structured verbal answers tailored to ${activeReport.targetRole} at ${activeReport.targetCompany}.`}
            </p>
          </div>
        </div>

        <Link
          to="/learning-plan"
          className="px-6 py-3 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white font-semibold text-xs transition-all shadow-sm flex items-center gap-2 shrink-0 active:scale-95"
        >
          <BookOpen className="w-4 h-4" />
          <span>Open Adaptive Learning Plan</span>
        </Link>
      </div>
    </div>
  );
};
