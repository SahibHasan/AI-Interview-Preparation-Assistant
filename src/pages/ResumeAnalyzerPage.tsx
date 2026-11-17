import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Briefcase,
  GraduationCap,
  Plus,
  RefreshCw,
  Search,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Award,
  Download,
  ClipboardList,
  ShieldCheck,
  Gauge,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { AnimatedCounter } from '../components/common/AnimatedCounter';
import { validateResumeFile, readFileAsBase64DataUrl, getAtsScoreBand } from '../utils/resumeFile';
import { downloadResumeAnalysisPDF, downloadResumeAnalysisDOCX } from '../utils/pdfExport';
import { getDefaultAvatarUrl } from '../utils/avatar';
import { INTERVIEW_ROLE_OPTIONS, CUSTOM_ROLE_VALUE, isPresetRole } from '../utils/roleCatalog';
import { GlassTiltCard3D } from '../components/common/MotionPrimitives';

export const ResumeAnalyzerPage: React.FC = () => {
  const { user } = useAuth();
  const {
    profile,
    resumeAnalysis,
    jobDescriptionText,
    interviewSetup,
    analyzeResumeAndJD,
    updateInterviewSetup,
  } = useApp();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'sections' | 'keywords' | 'fit'>('sections');
  const [jdInput, setJdInput] = useState<string>(jobDescriptionText);
  const [targetRoleInput, setTargetRoleInput] = useState<string>(
    interviewSetup.targetRole || user?.targetRole || 'Software Developer'
  );
  const [useCustomRole, setUseCustomRole] = useState<boolean>(
    !isPresetRole(interviewSetup.targetRole || user?.targetRole || 'Software Developer')
  );
  const [targetCompanyInput, setTargetCompanyInput] = useState<string>(
    interviewSetup.targetCompany || user?.targetCompany || 'Stripe'
  );
  const [fileName, setFileName] = useState<string>(resumeAnalysis.fileName);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisStep, setAnalysisStep] = useState<string>('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [showPasteDrawer, setShowPasteDrawer] = useState<boolean>(false);
  const [pastedResumeText, setPastedResumeText] = useState<string>(resumeAnalysis.rawText || '');
  const [customSkill, setCustomSkill] = useState<string>('');
  const [skillsList, setSkillsList] = useState<string[]>(
    resumeAnalysis.parsedProfile.skills || profile.skills || []
  );
  const [expandedExperience, setExpandedExperience] = useState<number | null>(0);
  const [keywordFilter, setKeywordFilter] = useState<'all' | 'present' | 'missing'>('all');

  // Keep local state synchronized whenever resumeAnalysis or JD hydrates from DB or after an upload
  useEffect(() => {
    setFileName(resumeAnalysis.fileName);
    setSkillsList(resumeAnalysis.parsedProfile?.skills || profile.skills || []);
    if (resumeAnalysis.rawText) {
      setPastedResumeText(resumeAnalysis.rawText);
    }
  }, [resumeAnalysis]);

  useEffect(() => {
    if (jobDescriptionText) {
      setJdInput(jobDescriptionText);
    }
  }, [jobDescriptionText]);

  const executeAnalysis = async (options: {
    fileName?: string;
    fileBase64?: string;
    rawText?: string;
    mimeType?: string;
    customSkills?: string[];
    stepLabel?: string;
  }) => {
    setIsAnalyzing(true);
    setUploadError(null);
    setAnalysisStep(options.stepLabel || 'Extracting resume structure & matching against JD...');
    try {
      const effectiveRole = targetRoleInput.trim() || interviewSetup.targetRole;
      const effectiveCompany = targetCompanyInput.trim() || interviewSetup.targetCompany;

      updateInterviewSetup({
        targetRole: effectiveRole,
        targetCompany: effectiveCompany,
      });

      const updated = await analyzeResumeAndJD({
        fileName: options.fileName || fileName,
        fileBase64: options.fileBase64,
        rawText: options.rawText,
        mimeType: options.mimeType,
        jdText: jdInput,
        customSkills: options.customSkills,
        targetRole: effectiveRole,
        targetCompany: effectiveCompany,
        interviewType: interviewSetup.interviewType,
        difficulty: interviewSetup.difficulty,
        questionCount: interviewSetup.questionCount,
      });

      showToast({
        title: 'Resume & JD Analysis Complete',
        message: `ATS Score: ${updated.atsScore}/100 · JD Match: ${updated.matchAnalysis.overallMatchPercentage}% (${updated.wordCount || 0} words parsed).`,
        type: 'success',
      });
    } catch (err: any) {
      const msg = err?.message || 'Failed to parse resume document. Please verify the file and try again.';
      setUploadError(msg);
      showToast({
        title: 'Resume Analysis Error',
        message: msg,
        type: 'error',
      });
    } finally {
      setIsAnalyzing(false);
      setAnalysisStep('');
    }
  };

  const processUploadedFile = async (file: File) => {
    const check = validateResumeFile(file);
    if (!check.valid) {
      setUploadError(check.error || 'Unsupported file');
      showToast({
        title: 'Unsupported Resume File',
        message: check.error || 'Please upload a PDF, DOCX, DOC, TXT, or MD file.',
        type: 'error',
      });
      return;
    }

    setFileName(file.name);
    setUploadError(null);
    setIsAnalyzing(true);
    setAnalysisStep(`Reading ${file.name} (${(file.size / 1024).toFixed(1)} KB)...`);

    try {
      const dataUrl = await readFileAsBase64DataUrl(file);
      await executeAnalysis({
        fileName: file.name,
        fileBase64: dataUrl,
        mimeType: file.type,
        stepLabel: `Parsing ${file.name} & computing real ATS alignment...`,
      });
    } catch (err: any) {
      const msg = err?.message || 'Unable to read the selected resume file.';
      setUploadError(msg);
      setIsAnalyzing(false);
      setAnalysisStep('');
      showToast({
        title: 'File Read Error',
        message: msg,
        type: 'error',
      });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      void processUploadedFile(e.target.files[0]);
      e.target.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      void processUploadedFile(e.dataTransfer.files[0]);
    }
  };

  const handleRunAnalysis = () => {
    void executeAnalysis({
      fileName,
      rawText: pastedResumeText || resumeAnalysis.rawText,
      customSkills: skillsList,
      stepLabel: `Benchmarking ${fileName} against ${targetRoleInput} @ ${targetCompanyInput} JD...`,
    });
  };

  const handleAnalyzePastedText = () => {
    if (!pastedResumeText.trim() || pastedResumeText.trim().split(/\s+/).length < 8) {
      showToast({
        title: 'More Resume Text Needed',
        message: 'Please paste at least a short summary, skills, or experience block before analyzing.',
        type: 'warning',
      });
      return;
    }
    setShowPasteDrawer(false);
    void executeAnalysis({
      fileName: fileName.endsWith('.txt') ? fileName : 'pasted_candidate_resume.txt',
      rawText: pastedResumeText.trim(),
      customSkills: skillsList,
      stepLabel: 'Parsing pasted resume text & benchmarking JD alignment...',
    });
  };

  const handleAddSkill = () => {
    const trimmed = customSkill.trim();
    if (trimmed && !skillsList.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      const nextSkills = [...skillsList, trimmed];
      setSkillsList(nextSkills);
      setCustomSkill('');
      void executeAnalysis({
        fileName,
        rawText: pastedResumeText || resumeAnalysis.rawText,
        customSkills: nextSkills,
        stepLabel: `Re-scoring ATS alignment with "${trimmed}"...`,
      });
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    const nextSkills = skillsList.filter((s) => s !== skillToRemove);
    setSkillsList(nextSkills);
    void executeAnalysis({
      fileName,
      rawText: pastedResumeText || resumeAnalysis.rawText,
      customSkills: nextSkills,
      stepLabel: `Updating ATS profile without "${skillToRemove}"...`,
    });
  };

  const handleDownloadReport = async (format: 'pdf' | 'docx') => {
    const candidateName =
      resumeAnalysis.parsedProfile?.fullName || user?.name || profile.fullName || 'Candidate';
    if (format === 'pdf') {
      const fn = downloadResumeAnalysisPDF(resumeAnalysis, targetRoleInput, targetCompanyInput, candidateName);
      showToast({
        title: 'PDF Alignment Report Downloaded',
        message: `Saved ${fn} with your live ATS breakdown and gap report.`,
        type: 'success',
      });
    } else {
      const fn = await downloadResumeAnalysisDOCX(resumeAnalysis, targetRoleInput, targetCompanyInput, candidateName);
      showToast({
        title: 'DOCX Alignment Report Downloaded',
        message: `Saved ${fn} with your structured ATS and role-section report.`,
        type: 'success',
      });
    }
  };

  const handleStartInterviewWithRole = () => {
    updateInterviewSetup({
      targetRole: targetRoleInput.trim() || interviewSetup.targetRole || 'Software Developer',
      targetCompany: targetCompanyInput.trim() || interviewSetup.targetCompany || 'Stripe',
      interviewType: interviewSetup.interviewType || 'technical',
    });
    showToast({
      title: 'Target Interview Configured',
      message: `Prepared interview setup for ${targetRoleInput} using your parsed resume & JD.`,
      type: 'info',
    });
    navigate('/interview-setup');
  };

  const atsScore = Math.max(0, Math.min(100, resumeAnalysis.atsScore || 0));
  const atsBand = getAtsScoreBand(atsScore);
  const breakdown = resumeAnalysis.atsBreakdown || {
    keywordAlignment: resumeAnalysis.matchAnalysis.overallMatchPercentage || 0,
    technicalDepth: atsScore,
    quantifiedImpact: 60,
    sectionCompleteness: 75,
  };

  const parsedExperiences =
    resumeAnalysis.parsedProfile?.extractedExperiences &&
    resumeAnalysis.parsedProfile.extractedExperiences.length > 0
      ? resumeAnalysis.parsedProfile.extractedExperiences
      : profile.extractedExperiences || [];

  const parsedEducation =
    resumeAnalysis.parsedProfile?.education?.degree
      ? resumeAnalysis.parsedProfile.education
      : profile.education;

  const candidateDisplayName =
    resumeAnalysis.parsedProfile?.fullName || user?.name || profile.fullName || 'Candidate';
  const candidateDisplayLocation =
    resumeAnalysis.parsedProfile?.location || profile.location || 'Remote';
  const candidateDisplayHeadline =
    resumeAnalysis.parsedProfile?.headline || profile.headline || targetRoleInput;

  const keywordData = resumeAnalysis.keywordAnalysis || [];
  const filteredKeywords = keywordData.filter((k) => {
    if (keywordFilter === 'all') return true;
    if (keywordFilter === 'present') return k.status === 'present';
    if (keywordFilter === 'missing') return k.status === 'missing';
    return true;
  });

  const levelingFitData = resumeAnalysis.levelingFit || [];
  const detectedSections = resumeAnalysis.detectedRoleSections || [];

  return (
    <div className="flex flex-col w-full gap-6 pb-12 antialiased">
      {/* Top Banner / Intelligence Header */}
      <div className="relative overflow-hidden glass-panel-elevated rounded-2xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-col gap-1 max-w-3xl z-10 text-left">
          <div className="flex items-center gap-1.5 text-[#3525cd] text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            <span>Real-Time Resume &amp; JD Alignment Engine</span>
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-[#0b1c30] tracking-tight">
            Resume &amp; Job Match Intelligence
          </h1>
          <p className="text-sm text-[#464555]">
            Upload any PDF, DOCX, or TXT resume and compare it directly against your target job description to compute your live ATS Score and competency gaps.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 z-10 shrink-0">
          <button
            type="button"
            onClick={() => void handleDownloadReport('pdf')}
            className="flex items-center gap-1.5 glass-subcard hover:bg-white text-[#0b1c30] px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5 text-[#3525cd]" />
            <span>PDF Report</span>
          </button>

          <button
            type="button"
            onClick={() => void handleDownloadReport('docx')}
            className="flex items-center gap-1.5 glass-subcard hover:bg-white text-[#0b1c30] px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5 text-[#3525cd]" />
            <span>DOCX Report</span>
          </button>

          <button
            type="button"
            onClick={handleRunAnalysis}
            disabled={isAnalyzing}
            className="flex items-center gap-2 glass-btn-primary text-white px-5 py-2.5 rounded-xl text-xs font-semibold disabled:opacity-60 whitespace-nowrap"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
            <span>{isAnalyzing ? 'Analyzing Alignment...' : 'Re-run Alignment'}</span>
          </button>
        </div>
      </div>

      {/* PROMINENT RESUME ATS SCORE BAR */}
      <div
        data-testid="resume-ats-score-card"
        className="glass-panel-elevated rounded-2xl p-6 text-left"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl glass-subcard text-[#3525cd] flex items-center justify-center shrink-0">
              <Gauge className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-heading text-base font-bold text-[#0b1c30]">
                  Resume ATS Score
                </h2>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${atsBand.badgeClass}`}>
                  {atsBand.label}
                </span>
                {resumeAnalysis.analysisSource && (
                  <span className="text-[10px] font-medium text-[#777587]">
                    · {resumeAnalysis.wordCount || 0} words parsed
                  </span>
                )}
              </div>
              <p className="text-xs text-[#565e74] mt-0.5">
                Calculated live from JD keyword alignment, technical depth, quantified impact metrics, and resume section completeness.
              </p>
            </div>
          </div>

          <div className="flex items-baseline gap-2 shrink-0">
            <span className={`font-heading text-3xl font-bold tabular-nums ${atsBand.textClass}`}>
              <AnimatedCounter value={atsScore} suffix="/100" />
            </span>
            <span className="text-xs font-semibold text-[#565e74]">
              ({resumeAnalysis.matchAnalysis.overallMatchPercentage}% JD Match)
            </span>
          </div>
        </div>

        {/* Main ATS Score Bar */}
        <div className="w-full h-3.5 bg-[#e5eeff]/75 rounded-full overflow-hidden border border-white/80">
          <motion.div
            data-testid="ats-score-bar-fill"
            className={`h-full rounded-full ${atsBand.barClass}`}
            initial={{ width: '0%' }}
            animate={{ width: `${atsScore}%` }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>

        <div className="flex justify-between text-[10px] font-semibold text-[#565e74] mt-1.5 mb-5">
          <span>0 — Needs Major Rewrite</span>
          <span>50 — Fair Screening Baseline</span>
          <span>75 — Strong Interview Shortlist</span>
          <span>100 — Elite Match</span>
        </div>

        {/* 4-Pillar ATS Sub-Bars */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {[
            { label: 'JD Keyword Alignment', weight: '35%', value: breakdown.keywordAlignment },
            { label: 'Technical Depth', weight: '25%', value: breakdown.technicalDepth },
            { label: 'Quantified Impact', weight: '20%', value: breakdown.quantifiedImpact },
            { label: 'Section Completeness', weight: '20%', value: breakdown.sectionCompleteness },
          ].map((pillar) => (
            <div
              key={pillar.label}
              className="p-3.5 rounded-xl glass-subcard glass-interactive flex flex-col gap-1.5"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#0b1c30] truncate">{pillar.label}</span>
                <span className="text-[10px] text-[#565e74] font-mono shrink-0">{pillar.weight}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 h-2 bg-white/80 rounded-full overflow-hidden border border-white">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      pillar.value >= 75
                        ? 'bg-emerald-500'
                        : pillar.value >= 50
                        ? 'bg-[#4f46e5]'
                        : 'bg-amber-500'
                    }`}
                    style={{ width: `${Math.max(4, Math.min(100, pillar.value))}%` }}
                  />
                </div>
                <span className="font-mono text-xs font-bold text-[#0b1c30] tabular-nums w-9 text-right">
                  {pillar.value}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Analysis Progress / Error Banners */}
      <AnimatePresence>
        {isAnalyzing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-[#eff4ff] border border-[#c7c4d8]/60 p-3.5 rounded-xl flex items-center justify-between gap-3 text-left overflow-hidden"
          >
            <div className="flex items-center gap-2.5">
              <RefreshCw className="w-4 h-4 text-[#4f46e5] animate-spin shrink-0" />
              <div>
                <div className="text-xs font-bold text-[#0b1c30]">Real Resume &amp; JD Alignment in Progress</div>
                <div className="text-[11px] text-[#565e74]">{analysisStep}</div>
              </div>
            </div>
            <div className="w-32 bg-white rounded-full h-1.5 overflow-hidden border border-[#c7c4d8]/40">
              <div className="bg-[#4f46e5] h-full w-2/3 animate-pulse" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {uploadError && (
        <div className="bg-red-50 border border-red-200 text-red-900 rounded-xl p-3.5 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{uploadError}</span>
          </div>
          <button
            type="button"
            onClick={() => setUploadError(null)}
            className="text-red-700 hover:text-red-900"
            aria-label="Dismiss error"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Perspective Navigation Tabs */}
      <div className="flex items-center justify-between glass-pill-bar p-1.5 rounded-2xl overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          <button
            type="button"
            onClick={() => setActiveTab('sections')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'sections'
                ? 'glass-btn-primary text-white'
                : 'text-[#464555] hover:text-[#0b1c30] hover:bg-white/60'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Parsed Sections &amp; Match</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('keywords')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'keywords'
                ? 'glass-btn-primary text-white'
                : 'text-[#464555] hover:text-[#0b1c30] hover:bg-white/60'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>Keywords &amp; Density ({keywordData.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('fit')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'fit'
                ? 'glass-btn-primary text-white'
                : 'text-[#464555] hover:text-[#0b1c30] hover:bg-white/60'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>Leveling Fit &amp; Interview Sections</span>
          </button>
        </div>

        <div className="hidden lg:flex items-center gap-3 px-3 text-xs text-[#464555]">
          <span className="flex items-center gap-1.5">
            ATS Index: <strong className="text-[#0b1c30] tabular-nums">{atsScore}/100</strong>
          </span>
          <span className="text-[#c7c4d8]" aria-hidden="true">·</span>
          <span className="text-[#3525cd] font-semibold">
            {targetRoleInput} @ {targetCompanyInput}
          </span>
        </div>
      </div>

      {/* TAB 1: PARSED SECTIONS & MATCH */}
      {activeTab === 'sections' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Candidate Resume Profile (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="glass-panel rounded-2xl p-6 flex flex-col gap-5 text-left">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/70">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#3525cd]" />
                  <h2 className="font-heading text-base font-bold text-[#0b1c30]">
                    Candidate Resume Profile
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPasteDrawer((v) => !v)}
                  className="text-[11px] font-semibold text-[#3525cd] hover:underline"
                >
                  {showPasteDrawer ? 'Hide Text Editor' : 'Or Paste Resume Text'}
                </button>
              </div>

              {/* Uploaded File Badge with Drag-and-Drop Dropzone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`flex items-center justify-between p-3.5 rounded-xl border transition-all gap-2 ${
                  isDragging
                    ? 'bg-[#e5eeff]/90 border-[#4f46e5] border-dashed ring-2 ring-[#4f46e5]/30'
                    : 'glass-subcard'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-white/90 flex items-center justify-center text-[#3525cd] shadow-xs shrink-0 border border-white">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col min-w-0 text-left">
                    <span data-testid="uploaded-resume-filename" className="text-xs font-bold text-[#0b1c30] truncate">
                      {resumeAnalysis.fileName}
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[#565e74]">
                      <span>{resumeAnalysis.fileSizeKb} KB</span>
                      <span>•</span>
                      <span>{resumeAnalysis.wordCount || 0} words</span>
                      <span>•</span>
                      {(resumeAnalysis.wordCount || 0) > 0 ? (
                        <span className="text-emerald-700 font-semibold flex items-center gap-0.5">
                          <Check className="w-3 h-3" /> Real Parsed Content
                        </span>
                      ) : (
                        <span className="text-[#3525cd] font-semibold">
                          Upload PDF, DOCX, or TXT to scan
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <label className="cursor-pointer bg-white/90 hover:bg-white text-[#0b1c30] text-xs font-semibold px-3 py-1.5 rounded-xl border border-white transition-colors shadow-xs shrink-0 whitespace-nowrap">
                  <span>Upload File</span>
                  <input
                    data-testid="resume-file-input"
                    type="file"
                    accept=".pdf,.doc,.docx,.txt,.md"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {showPasteDrawer && (
                <div className="p-3.5 rounded-xl glass-subcard space-y-2.5">
                  <label className="block text-xs font-semibold text-[#0b1c30]">
                    Paste or Edit Extracted Resume Text
                  </label>
                  <textarea
                    rows={6}
                    value={pastedResumeText}
                    onChange={(e) => setPastedResumeText(e.target.value)}
                    placeholder="Paste your complete resume text here (experience, projects, skills, education)..."
                    className="w-full glass-input rounded-xl p-2.5 text-xs text-[#0b1c30] font-mono leading-relaxed outline-none"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowPasteDrawer(false)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#565e74] hover:bg-white border border-slate-200/70"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleAnalyzePastedText}
                      disabled={isAnalyzing}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-semibold glass-btn-primary text-white"
                    >
                      Analyze Pasted Resume
                    </button>
                  </div>
                </div>
              )}

              {/* Candidate Identity */}
              <div className="flex items-center gap-3 p-3.5 glass-subcard rounded-xl">
                <img
                  src={user?.avatarUrl || profile.avatarUrl || getDefaultAvatarUrl(candidateDisplayName)}
                  alt={candidateDisplayName}
                  className="w-12 h-12 rounded-full object-cover shadow-sm ring-2 ring-white"
                />
                <div className="min-w-0">
                  <h3 className="font-heading text-sm font-bold text-[#0b1c30] truncate">
                    {candidateDisplayName}
                  </h3>
                  <p className="text-xs text-[#565e74] truncate">{candidateDisplayLocation}</p>
                  <span className="text-[11px] font-semibold text-[#3525cd] line-clamp-1">
                    {candidateDisplayHeadline}
                  </span>
                </div>
              </div>

              {/* Verified Experience Accordion (Real parsed experience items) */}
              <div>
                <span className="text-[11px] font-semibold text-[#565e74] uppercase tracking-wider block mb-2">
                  Extracted Experience &amp; Projects ({parsedExperiences.length})
                </span>
                {parsedExperiences.length === 0 ? (
                  <div className="p-3.5 glass-subcard rounded-xl border-dashed text-xs text-[#565e74]">
                    Upload or paste your resume above to extract your work history, projects, and measurable achievements.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {parsedExperiences.map((exp, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl overflow-hidden glass-subcard transition-all"
                      >
                        <button
                          type="button"
                          onClick={() => setExpandedExperience(expandedExperience === idx ? null : idx)}
                          className="w-full p-3 flex items-center justify-between text-left hover:bg-white/60 transition-colors gap-2"
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-[#0b1c30] truncate">{exp.role}</div>
                            <div className="text-[11px] text-[#565e74] truncate">
                              {exp.company} · {exp.period}
                            </div>
                          </div>
                          {expandedExperience === idx ? (
                            <ChevronUp className="w-4 h-4 text-[#565e74] shrink-0" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-[#565e74] shrink-0" />
                          )}
                        </button>

                        {expandedExperience === idx && (
                          <div className="p-3 bg-white/80 border-t border-slate-200/70 text-xs text-[#464555] space-y-1.5">
                            {(exp.bulletPoints || []).map((b, bIdx) => (
                              <div key={bIdx} className="flex items-start gap-1.5">
                                <span className="text-[#3525cd] font-bold">•</span>
                                <span>{b}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Education Highlight */}
              <div>
                <span className="text-[11px] font-semibold text-[#565e74] uppercase tracking-wider block mb-1.5">
                  Extracted Education
                </span>
                <div className="p-3 glass-subcard rounded-xl flex items-start gap-2.5">
                  <GraduationCap className="w-5 h-5 text-[#3525cd] shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-[#0b1c30]">
                      {parsedEducation?.degree || 'Upload resume to detect degree'}
                    </div>
                    <div className="text-xs text-[#565e74]">
                      {parsedEducation?.institution || 'Institution not yet extracted'}{' '}
                      {parsedEducation?.degree && parsedEducation?.graduationYear
                        ? `(Class of ${parsedEducation.graduationYear})`
                        : ''}
                    </div>
                  </div>
                </div>
              </div>

              {/* Skills List with add/remove capability */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold text-[#565e74] uppercase tracking-wider">
                    Extracted Skills &amp; Competencies ({skillsList.length})
                  </span>
                  <span className="text-[10px] text-[#565e74]">Synced to ATS &amp; Interview</span>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-3 max-h-48 overflow-y-auto custom-scrollbar p-1">
                  {skillsList.map((skill, index) => (
                    <span
                      key={index}
                      className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/80 text-[#3525cd] text-xs font-medium border border-white hover:bg-white transition-colors shadow-xs"
                    >
                      <span>{skill}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skill)}
                        className="opacity-60 group-hover:opacity-100 hover:text-red-600 transition-opacity"
                        aria-label={`Remove skill ${skill}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customSkill}
                    onChange={(e) => setCustomSkill(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddSkill()}
                    placeholder="Add skill (e.g. SQL, DSA, OOPs, Docker)..."
                    className="flex-1 glass-input rounded-xl px-3 py-1.5 text-xs text-[#0b1c30] placeholder:text-[#777587] outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddSkill}
                    className="px-3.5 py-1.5 glass-subcard hover:bg-white text-[#3525cd] rounded-xl text-xs font-semibold flex items-center gap-1 transition-all active:scale-95 whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Target Job Description & Gap Intelligence (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            {/* Target Job Description Editor & Role Calibration */}
            <div className="glass-panel rounded-2xl p-6 text-left">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200/70 mb-4 gap-3">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-[#3525cd]" />
                  <h3 className="font-heading text-base font-bold text-[#0b1c30]">
                    Target Role &amp; Job Description
                  </h3>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    aria-label="Target Role Title"
                    value={useCustomRole ? CUSTOM_ROLE_VALUE : isPresetRole(targetRoleInput) ? targetRoleInput : CUSTOM_ROLE_VALUE}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === CUSTOM_ROLE_VALUE) {
                        setUseCustomRole(true);
                      } else {
                        setUseCustomRole(false);
                        setTargetRoleInput(val);
                      }
                    }}
                    className="w-44 glass-input rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#0b1c30] outline-none"
                  >
                    {INTERVIEW_ROLE_OPTIONS.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                    <option value={CUSTOM_ROLE_VALUE}>Custom Role...</option>
                  </select>
                  {useCustomRole && (
                    <input
                      type="text"
                      aria-label="Custom Target Role Title"
                      value={targetRoleInput}
                      onChange={(e) => setTargetRoleInput(e.target.value)}
                      placeholder="Custom Role"
                      className="w-36 glass-input rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#0b1c30] outline-none"
                    />
                  )}
                  <span className="text-xs text-[#777587]">@</span>
                  <input
                    type="text"
                    aria-label="Target Company"
                    value={targetCompanyInput}
                    onChange={(e) => setTargetCompanyInput(e.target.value)}
                    placeholder="Company"
                    className="w-28 glass-input rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#0b1c30] outline-none"
                  />
                </div>
              </div>

              <div className="relative">
                <textarea
                  data-testid="jd-textarea"
                  rows={6}
                  value={jdInput}
                  onChange={(e) => setJdInput(e.target.value)}
                  className="w-full glass-input rounded-xl p-3.5 text-xs text-[#0b1c30] font-mono leading-relaxed outline-none resize-y"
                  placeholder="Paste the full target job description here (e.g., SQL, DSA, OOPs, System Design requirements)..."
                />
              </div>

              <div className="flex items-center justify-between mt-3">
                <span className="text-[11px] text-[#565e74]">
                  Parses required technical stack, seniority bar, and interview topic sections.
                </span>
                <button
                  type="button"
                  onClick={handleRunAnalysis}
                  disabled={isAnalyzing}
                  className="text-xs font-semibold text-[#4f46e5] hover:text-[#3525cd] flex items-center gap-1 transition-colors"
                >
                  <span>Analyze Resume vs JD</span>
                  <RefreshCw className={`w-3 h-3 ${isAnalyzing ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Alignment Scorecard & Gaps Breakdown */}
            <div className="glass-panel rounded-2xl p-6 text-left">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/70">
                <div>
                  <h3 className="font-heading text-base font-bold text-[#0b1c30]">
                    Role Alignment &amp; Competency Gaps
                  </h3>
                  <p className="text-xs text-[#464555]">
                    Benchmarked across {resumeAnalysis.matchAnalysis.matchedSkills.length + resumeAnalysis.matchAnalysis.missingSkills.length} detected JD competencies
                  </p>
                </div>

                <div className="flex items-center gap-3 glass-subcard px-4 py-2 rounded-xl">
                  <div className="text-right">
                    <div className="font-heading text-2xl font-bold text-[#3525cd] tabular-nums">
                      <AnimatedCounter value={resumeAnalysis.matchAnalysis.overallMatchPercentage} suffix="%" />
                    </div>
                    <div className="text-[10px] text-[#565e74] uppercase font-semibold">JD Match</div>
                  </div>
                </div>
              </div>

              {/* Matched Strengths */}
              <div className="mt-5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#059669] uppercase tracking-wider mb-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Verified Matching Skills ({resumeAnalysis.matchAnalysis.matchedSkills.length})</span>
                </div>

                {resumeAnalysis.matchAnalysis.matchedSkills.length === 0 ? (
                  <p className="text-xs text-[#565e74] bg-[#f8f9ff] p-3 rounded-lg border border-[#e2e8f0]">
                    No direct JD skill matches found yet—add matching technical skills or review the missing competencies below.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {resumeAnalysis.matchAnalysis.matchedSkills.map((m, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 bg-emerald-50/60 border border-emerald-100 rounded-lg flex items-center justify-between hover:bg-emerald-50 transition-colors"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="text-xs font-semibold text-[#0b1c30] truncate">{m.skill}</div>
                          <div className="text-[10px] text-[#565e74]">{m.category}</div>
                        </div>
                        <span className="text-xs font-bold text-emerald-700 shrink-0">{m.matchStrength}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Critical Competency Gaps */}
              <div className="mt-6">
                <div className="flex items-center gap-1.5 text-xs font-bold text-red-700 uppercase tracking-wider mb-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>Identified Competency Gaps ({resumeAnalysis.matchAnalysis.missingSkills.length})</span>
                </div>

                {resumeAnalysis.matchAnalysis.missingSkills.length === 0 ? (
                  <p className="text-xs text-emerald-800 bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                    All extracted JD competencies were detected in your resume! Focus on deep architecture &amp; tradeoff defense.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {resumeAnalysis.matchAnalysis.missingSkills.map((gap, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-red-50/60 border border-red-100 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-red-50 transition-colors"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[#0b1c30]">{gap.skill}</span>
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-100 text-red-800">
                              {gap.importance}
                            </span>
                          </div>
                          <span className="text-[11px] text-[#565e74]">Domain: {gap.category}</span>
                        </div>

                        <button
                          type="button"
                          onClick={handleStartInterviewWithRole}
                          className="text-xs font-semibold text-[#3525cd] hover:underline self-end sm:self-center flex items-center gap-1"
                        >
                          <span>Target in Interview</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Inferred Strengths & Focus Recommendations */}
              {(resumeAnalysis.matchAnalysis.inferredStrengths.length > 0 ||
                resumeAnalysis.matchAnalysis.suggestedFocusAreas.length > 0) && (
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="p-3.5 rounded-xl glass-subcard">
                    <div className="text-[11px] font-bold text-[#0b1c30] uppercase tracking-wider mb-2">
                      Verified Strengths
                    </div>
                    <ul className="space-y-1.5 text-xs text-[#464555]">
                      {resumeAnalysis.matchAnalysis.inferredStrengths.map((s, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3.5 rounded-xl glass-subcard">
                    <div className="text-[11px] font-bold text-[#3525cd] uppercase tracking-wider mb-2">
                      Recommended Improvements
                    </div>
                    <ul className="space-y-1.5 text-xs text-[#464555]">
                      {resumeAnalysis.matchAnalysis.suggestedFocusAreas.map((f, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <ArrowRight className="w-3.5 h-3.5 text-[#4f46e5] shrink-0 mt-0.5" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Launch CTA */}
              <div className="mt-8 p-4 glass-subcard rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h4 className="font-heading text-sm font-bold text-[#0b1c30]">
                    Ready to calibrate your AI Interview from this resume?
                  </h4>
                  <p className="text-xs text-[#464555] mt-0.5">
                    Proceed to Interview Setup to choose your interview format and launch your live AI mock session.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleStartInterviewWithRole}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl glass-btn-primary text-white font-semibold text-xs flex items-center justify-center gap-2 shrink-0 whitespace-nowrap"
                >
                  <span>Proceed to Interview Setup</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: KEYWORDS & DENSITY */}
      {activeTab === 'keywords' && (
        <div className="glass-panel rounded-2xl p-6 text-left space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/70">
            <div>
              <h3 className="font-heading text-lg font-bold text-[#0b1c30]">
                Semantic Keyword Frequency &amp; ATS Density
              </h3>
              <p className="text-xs text-[#464555]">
                Real token frequency inside {resumeAnalysis.fileName} ({resumeAnalysis.wordCount || 0} words) compared against JD terms.
              </p>
            </div>

            <div className="flex items-center gap-1.5 glass-pill-bar p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setKeywordFilter('all')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                  keywordFilter === 'all' ? 'glass-btn-primary text-white' : 'text-[#565e74] hover:text-[#0b1c30]'
                }`}
              >
                All ({keywordData.length})
              </button>
              <button
                type="button"
                onClick={() => setKeywordFilter('present')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                  keywordFilter === 'present' ? 'glass-btn-primary text-white' : 'text-[#565e74] hover:text-[#0b1c30]'
                }`}
              >
                Present ({keywordData.filter((k) => k.status === 'present').length})
              </button>
              <button
                type="button"
                onClick={() => setKeywordFilter('missing')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                  keywordFilter === 'missing' ? 'glass-btn-primary text-white' : 'text-[#565e74] hover:text-[#0b1c30]'
                }`}
              >
                Gaps ({keywordData.filter((k) => k.status === 'missing').length})
              </button>
            </div>
          </div>

          <div className="p-5 glass-subcard rounded-2xl">
            <span className="text-[11px] font-bold text-[#565e74] uppercase tracking-wider block mb-3">
              Extracted Keyword Cloud ({resumeAnalysis.fileName})
            </span>
            <div className="flex flex-wrap gap-2.5 items-center">
              {keywordData.map((k, idx) => (
                <span
                  key={idx}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-transform hover:scale-105 ${
                    k.status === 'present'
                      ? 'bg-white/85 text-[#0b1c30] border-white shadow-xs'
                      : 'bg-red-50/85 text-red-700 border-red-200'
                  }`}
                >
                  {k.term} ({k.count}x)
                </span>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/50 border-b border-slate-200/70 text-[#565e74] uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3">Keyword / Competency</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Occurrences</th>
                  <th className="px-4 py-3">Relative Density</th>
                  <th className="px-4 py-3">ATS Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60">
                {filteredKeywords.map((k, idx) => (
                  <tr key={idx} className="hover:bg-white/60 transition-colors">
                    <td className="px-4 py-3 font-bold text-[#0b1c30]">{k.term}</td>
                    <td className="px-4 py-3 text-[#565e74]">{k.category}</td>
                    <td className="px-4 py-3 font-mono font-medium text-[#0b1c30] tabular-nums">{k.count}</td>
                    <td className="px-4 py-3 font-mono text-[#565e74] tabular-nums">{k.density}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          k.status === 'present'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-red-50 text-red-800 border border-red-200'
                        }`}
                      >
                        {k.status === 'present' ? <Check className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                        {k.status === 'present' ? 'Matched' : 'Missing'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {k.status === 'missing' && (
                        <button
                          type="button"
                          onClick={() => {
                            if (!skillsList.includes(k.term)) {
                              const next = [...skillsList, k.term];
                              setSkillsList(next);
                              void executeAnalysis({
                                fileName,
                                rawText: pastedResumeText || resumeAnalysis.rawText,
                                customSkills: next,
                                stepLabel: `Adding "${k.term}" to skills & re-scoring...`,
                              });
                            }
                          }}
                          className="text-xs font-semibold text-[#4f46e5] hover:underline"
                        >
                          Add to Profile
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: SENIORITY FIT & INTERVIEW SECTIONS */}
      {activeTab === 'fit' && (
        <div className="space-y-6">
          <div className="glass-panel rounded-2xl p-6 text-left space-y-6">
            <div className="pb-4 border-b border-slate-200/70">
              <h3 className="font-heading text-lg font-bold text-[#0b1c30]">
                Seniority Calibration &amp; {targetCompanyInput} Leveling Fit
              </h3>
              <p className="text-xs text-[#464555]">
                Computed from {resumeAnalysis.parsedProfile?.yearsOfExperience ?? profile.yearsOfExperience} estimated years of experience and {atsScore}/100 ATS score.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {levelingFitData.map((lvl, idx) => (
                <GlassTiltCard3D key={idx} intensity={3.5} hoverLift={3}>
                  <div
                    className={`p-4 rounded-2xl border h-full flex flex-col justify-between transition-all ${
                      lvl.status === 'target'
                        ? 'glass-panel-elevated border-[#4f46e5]/60 ring-2 ring-[#4f46e5]/25'
                        : lvl.status === 'solid'
                        ? 'bg-emerald-50/70 backdrop-blur-md border-emerald-200/80'
                        : 'glass-subcard'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-heading text-sm font-bold text-[#0b1c30]">{lvl.level}</span>
                        {lvl.status === 'target' && (
                          <span className="px-2 py-0.5 rounded-full bg-[#4f46e5] text-white text-[10px] font-bold">
                            Best Fit
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[#565e74] font-medium">{lvl.bar}</div>
                    </div>
                    <div className="mt-3 text-xs font-bold text-[#0b1c30] flex items-center justify-between">
                      <span>Alignment:</span>
                      <span className={lvl.status === 'gap' ? 'text-[#777587]' : 'text-[#3525cd]'}>{lvl.fit}</span>
                    </div>
                  </div>
                </GlassTiltCard3D>
              ))}
            </div>

            <div className="p-5 glass-subcard rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <div className="text-xs font-bold text-[#0b1c30] flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-[#3525cd]" />
                  <span>Estimated Market Compensation Range ({targetRoleInput})</span>
                </div>
                <p className="text-xs text-[#464555] mt-0.5">
                  Calibrated from parsed seniority scope and {targetCompanyInput} target level.
                </p>
              </div>
              <div className="text-right shrink-0 bg-white/85 px-4 py-2 rounded-xl border border-white shadow-xs">
                <div className="font-heading text-xl font-bold text-[#0b1c30]">
                  {resumeAnalysis.compensationBand || '$140k - $220k Total Comp'}
                </div>
                <div className="text-[10px] text-[#565e74] uppercase font-semibold">Calibrated Range</div>
              </div>
            </div>
          </div>

          {/* Detected Role-Divided Interview Sections & Assessment Criteria */}
          {detectedSections.length > 0 && (
            <div className="glass-panel rounded-2xl p-6 text-left space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-200/70">
                <div className="flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-[#3525cd]" />
                  <div>
                    <h3 className="font-heading text-base font-bold text-[#0b1c30]">
                      Planned Interview Sections for {targetRoleInput}
                    </h3>
                    <p className="text-xs text-[#464555]">
                      Automatically partitioned by role competencies, uploaded resume, and job description.
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold text-[#3525cd]">
                  {detectedSections.length} Structured Sections
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {detectedSections.map((sec) => (
                  <div
                    key={sec.id}
                    className="p-4 rounded-2xl glass-subcard glass-interactive flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-[#0b1c30]">
                        {sec.order}. {sec.sectionName}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/90 text-[#3525cd] border border-white">
                        {sec.weightPercentage}% weight
                      </span>
                    </div>
                    <p className="text-xs text-[#464555] leading-relaxed">{sec.rationale}</p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {sec.topicsCovered.map((t, i) => (
                        <span
                          key={i}
                          className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-white/85 border border-white text-[#0b1c30]"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                    <div className="pt-2 border-t border-slate-200/70 text-[11px] text-[#464555]">
                      <strong className="text-[#0b1c30] flex items-center gap-1 mb-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#3525cd]" />
                        Assessment Criteria:
                      </strong>
                      <ul className="space-y-0.5 pl-1">
                        {sec.assessmentCriteria.map((c, idx) => (
                          <li key={idx}>• {c}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleStartInterviewWithRole}
                  className="px-6 py-2.5 rounded-xl glass-btn-primary text-white font-semibold text-xs flex items-center gap-2 whitespace-nowrap"
                >
                  <span>Proceed to Sectioned Interview Setup</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
