import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Code,
  Users,
  Building,
  Terminal,
  Mic,
  Play,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  CheckCircle,
  UploadCloud,
  FileText,
  Gauge,
  ListOrdered,
  Scale,
  RefreshCw,
  Check,
  AlertCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { validateResumeFile, readFileAsBase64DataUrl, getAtsScoreBand } from '../utils/resumeFile';
import type { AssessmentRule, InterviewSectionPlan } from '../types';

export const InterviewSetupPage: React.FC = () => {
  const { user } = useAuth();
  const {
    profile,
    resumeAnalysis,
    jobDescriptionText,
    interviewSetup,
    updateInterviewSetup,
    analyzeResumeAndJD,
    resetInterviewSession,
  } = useApp();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [targetRole, setTargetRole] = useState(interviewSetup.targetRole);
  const [targetCompany, setTargetCompany] = useState(interviewSetup.targetCompany);
  const [interviewType, setInterviewType] = useState(interviewSetup.interviewType);
  const [difficulty, setDifficulty] = useState(interviewSetup.difficulty);
  const [durationMinutes, setDurationMinutes] = useState(interviewSetup.durationMinutes);
  const [questionCount, setQuestionCount] = useState(interviewSetup.questionCount);
  const [aiPersona, setAiPersona] = useState(interviewSetup.aiPersona);
  const [voiceName, setVoiceName] = useState<'Kore' | 'Zephyr' | 'Charon' | 'Puck' | 'Fenrir'>(
    interviewSetup.voiceName || 'Kore'
  );

  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const [showPasteResume, setShowPasteResume] = useState(false);
  const [pastedResumeDraft, setPastedResumeDraft] = useState(resumeAnalysis.rawText || '');
  const [setupJdDraft, setSetupJdDraft] = useState(jobDescriptionText);
  const [showJdEditor, setShowJdEditor] = useState(false);

  const [plannedSections, setPlannedSections] = useState<InterviewSectionPlan[]>(
    resumeAnalysis.detectedRoleSections || []
  );
  const [assessmentRules, setAssessmentRules] = useState<AssessmentRule[]>(
    resumeAnalysis.assessmentRules || []
  );
  const [isLoadingPlanPreview, setIsLoadingPlanPreview] = useState(false);

  const hasEditedRoleRef = useRef(false);
  const hasEditedCompanyRef = useRef(false);

  useEffect(() => {
    if (!hasEditedRoleRef.current && interviewSetup.targetRole) {
      setTargetRole(interviewSetup.targetRole);
    }
    if (!hasEditedCompanyRef.current && interviewSetup.targetCompany) {
      setTargetCompany(interviewSetup.targetCompany);
    }
  }, [interviewSetup.targetRole, interviewSetup.targetCompany]);

  useEffect(() => {
    if (resumeAnalysis.rawText) {
      setPastedResumeDraft(resumeAnalysis.rawText);
    }
  }, [resumeAnalysis.rawText]);

  // Live-fetch divided interview sections & assessment rules whenever role, type, difficulty, JD, or resume changes
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      setIsLoadingPlanPreview(true);
      try {
        const res = await fetch('/api/ai/interview/sections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetRole,
            targetCompany,
            interviewType,
            difficulty,
            questionCount,
            jobDescriptionText: setupJdDraft,
            skills: resumeAnalysis.parsedProfile?.skills || profile.skills || [],
            matchedSkills: resumeAnalysis.matchAnalysis.matchedSkills.map((s) => s.skill),
            missingSkills: resumeAnalysis.matchAnalysis.missingSkills.map((s) => s.skill),
            experiences: resumeAnalysis.parsedProfile?.extractedExperiences || profile.extractedExperiences || [],
            rawText: resumeAnalysis.rawText || '',
          }),
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data?.sections)) {
          setPlannedSections(data.sections);
        }
        if (!cancelled && Array.isArray(data?.assessmentRules)) {
          setAssessmentRules(data.assessmentRules);
        }
      } catch {
        // Keep previously loaded sections on transient errors
      } finally {
        if (!cancelled) setIsLoadingPlanPreview(false);
      }
    }, 220);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    targetRole,
    targetCompany,
    interviewType,
    difficulty,
    questionCount,
    setupJdDraft,
    resumeAnalysis.id,
    resumeAnalysis.atsScore,
  ]);

  const rolePresets = [
    'Software Developer',
    'Software Engineer',
    'Full Stack Engineer',
    'Senior Frontend Engineer',
    'Backend Systems Engineer',
    'Data Engineer',
    'Product Manager',
  ];

  const companyPresets = [
    'Stripe',
    'Google',
    'Meta',
    'Microsoft',
    'Amazon',
    'High-Growth Startup',
  ];

  const handleUploadResumeFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const check = validateResumeFile(file);
    if (!check.valid) {
      showToast({
        title: 'Unsupported Resume Format',
        message: check.error || 'Please upload PDF, DOCX, DOC, TXT, or MD.',
        type: 'error',
      });
      return;
    }

    setIsUploadingResume(true);
    try {
      const base64 = await readFileAsBase64DataUrl(file);
      const result = await analyzeResumeAndJD({
        fileName: file.name,
        fileBase64: base64,
        mimeType: file.type,
        jdText: setupJdDraft,
        targetRole,
        targetCompany,
        interviewType,
        difficulty,
        questionCount,
      });

      if (Array.isArray(result.detectedRoleSections)) {
        setPlannedSections(result.detectedRoleSections);
      }
      if (Array.isArray(result.assessmentRules)) {
        setAssessmentRules(result.assessmentRules);
      }

      showToast({
        title: 'Resume Analyzed for Interview',
        message: `${file.name} parsed (${result.wordCount || 0} words) · ATS Score: ${result.atsScore}/100. Interview sections updated.`,
        type: 'success',
      });
    } catch (err: any) {
      showToast({
        title: 'Resume Parse Failed',
        message: err?.message || 'Unable to parse uploaded file.',
        type: 'error',
      });
    } finally {
      setIsUploadingResume(false);
    }
  };

  const handleAnalyzePastedSetupResume = async () => {
    if (!pastedResumeDraft.trim() || pastedResumeDraft.trim().split(/\s+/).length < 8) {
      showToast({
        title: 'More Resume Content Needed',
        message: 'Paste your skills, projects, or experience text so the AI can calibrate questions.',
        type: 'warning',
      });
      return;
    }
    setIsUploadingResume(true);
    try {
      const result = await analyzeResumeAndJD({
        fileName: 'pasted_interview_resume.txt',
        rawText: pastedResumeDraft.trim(),
        jdText: setupJdDraft,
        targetRole,
        targetCompany,
        interviewType,
        difficulty,
        questionCount,
      });
      setShowPasteResume(false);
      showToast({
        title: 'Resume Calibrated',
        message: `ATS Score: ${result.atsScore}/100 · Updated interview topic sections.`,
        type: 'success',
      });
    } catch (err: any) {
      showToast({
        title: 'Calibration Error',
        message: err?.message || 'Could not analyze resume text.',
        type: 'error',
      });
    } finally {
      setIsUploadingResume(false);
    }
  };

  const handleLaunchSession = () => {
    updateInterviewSetup({
      targetRole,
      targetCompany,
      interviewType,
      difficulty,
      durationMinutes,
      questionCount,
      voiceModeEnabled: true,
      aiPersona,
      voiceName,
    });
    resetInterviewSession();
    showToast({
      title: 'Initializing Verbal AI Interview Panel',
      message: `Calibrating ${plannedSections.length || questionCount} interview sections for ${targetRole} with ${aiPersona}.`,
      type: 'info',
    });
    navigate('/live-session');
  };

  const handleResetDefaults = () => {
    hasEditedRoleRef.current = true;
    hasEditedCompanyRef.current = true;
    setTargetRole('Software Developer');
    setTargetCompany('Stripe');
    setInterviewType('technical');
    setDifficulty('senior-staff');
    setDurationMinutes(45);
    setQuestionCount(5);
    setAiPersona('Sarah');
    setVoiceName('Kore');
    showToast({
      title: 'Defaults Restored',
      message: 'Configured Software Developer track (DSA, OOPs, SQL, Resume & Architecture).',
      type: 'info',
    });
  };

  const atsScore = Math.max(0, Math.min(100, resumeAnalysis.atsScore || 0));
  const atsBand = getAtsScoreBand(atsScore);
  const activeSkills = resumeAnalysis.parsedProfile?.skills || profile.skills || [];

  return (
    <div className="flex flex-col w-full gap-6 pb-12 antialiased">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 text-left">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-[#565e74] uppercase tracking-wider font-semibold mb-1">
            <span>Platform</span>
            <span>•</span>
            <span className="text-[#3525cd]">Interview Setup &amp; Calibration</span>
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-[#0b1c30] tracking-tight">
            Configure Your AI Mock Interview
          </h1>
          <p className="text-sm text-[#464555] mt-1">
            Upload your resume, choose your role, and preview the divided interview sections and candidate assessment rules before going live.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-[#eff4ff] px-3.5 py-1.5 rounded-full border border-[#c7c4d8]/40 self-start md:self-auto">
          <span className="w-2 h-2 rounded-full bg-[#4f46e5] animate-pulse" />
          <span className="text-xs font-semibold text-[#0b1c30] uppercase tracking-wider">
            Setup Phase • Resume &amp; Section Plan
          </span>
        </div>
      </div>

      {/* Main Grid: Steps (8 cols) + Summary Card (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Configuration Steps */}
        <div className="lg:col-span-8 flex flex-col gap-6 text-left">
          {/* STEP 1: UPLOAD RESUME FOR INTERVIEW CALIBRATION */}
          <section
            data-testid="setup-resume-upload-section"
            className="bg-white rounded-xl p-6 border border-[#c7d2fe] shadow-sm space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-[#4f46e5] text-white flex items-center justify-center font-bold text-xs shrink-0">
                  1
                </div>
                <div>
                  <h2 className="font-heading text-base font-bold text-[#0b1c30]">
                    Upload Candidate Resume (Pre-Interview Calibration)
                  </h2>
                  <p className="text-xs text-[#565e74]">
                    AI analyzes your uploaded CV &amp; target JD to ask questions directly from your projects, stack, and competency gaps.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowPasteResume((v) => !v)}
                className="text-xs font-semibold text-[#3525cd] hover:underline self-start sm:self-center shrink-0"
              >
                {showPasteResume ? 'Hide Paste Box' : 'Or Paste Resume Text'}
              </button>
            </div>

            {/* Active Uploaded Resume Box + Upload CTA */}
            <div className="p-4 rounded-xl bg-[#eff4ff]/70 border border-[#c7c4d8]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-white border border-[#e2e8f0] text-[#3525cd] flex items-center justify-center shrink-0 shadow-xs">
                  {isUploadingResume ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <UploadCloud className="w-5 h-5" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      data-testid="setup-resume-filename"
                      className="text-xs sm:text-sm font-bold text-[#0b1c30] truncate max-w-[260px]"
                    >
                      {resumeAnalysis.fileName}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${atsBand.badgeClass}`}>
                      ATS {atsScore}/100
                    </span>
                  </div>
                  <div className="text-[11px] text-[#565e74] mt-0.5">
                    {resumeAnalysis.fileSizeKb} KB • {resumeAnalysis.wordCount || 0} words • {activeSkills.length} detected skills • {resumeAnalysis.matchAnalysis.overallMatchPercentage}% JD match
                  </div>
                </div>
              </div>

              <label className="cursor-pointer inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#4f46e5] hover:bg-[#3525cd] text-white text-xs font-semibold shadow-sm transition-all shrink-0 active:scale-95">
                <FileText className="w-3.5 h-3.5" />
                <span>{isUploadingResume ? 'Analyzing Resume...' : 'Upload / Replace Resume'}</span>
                <input
                  data-testid="setup-resume-file-input"
                  type="file"
                  accept=".pdf,.doc,.docx,.txt,.md"
                  onChange={handleUploadResumeFile}
                  disabled={isUploadingResume}
                  className="hidden"
                />
              </label>
            </div>

            {/* Compact ATS Score Bar inside Setup */}
            <div className="p-3.5 rounded-xl bg-[#f8f9ff] border border-[#e2e8f0] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#0b1c30] flex items-center gap-1.5">
                  <Gauge className="w-4 h-4 text-[#3525cd]" />
                  <span>Resume ATS Readiness Bar</span>
                </span>
                <span className={`font-bold tabular-nums ${atsBand.textClass}`}>
                  {atsScore}/100 — {atsBand.label}
                </span>
              </div>
              <div className="w-full h-2.5 bg-white rounded-full overflow-hidden border border-[#e2e8f0]">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${atsBand.barClass}`}
                  style={{ width: `${Math.max(4, atsScore)}%` }}
                />
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {activeSkills.slice(0, 8).map((sk) => (
                  <span
                    key={sk}
                    className="text-[11px] px-2 py-0.5 rounded bg-white border border-[#e2e8f0] text-[#464555] font-medium"
                  >
                    {sk}
                  </span>
                ))}
                {activeSkills.length > 8 && (
                  <span className="text-[11px] text-[#3525cd] font-semibold px-1.5 py-0.5">
                    +{activeSkills.length - 8} more
                  </span>
                )}
              </div>
            </div>

            {showPasteResume && (
              <div className="p-4 rounded-xl bg-[#f8f9ff] border border-[#c7d2fe] space-y-2.5">
                <label className="block text-xs font-semibold text-[#0b1c30]">
                  Paste Resume Content (Optional Alternative to File Upload)
                </label>
                <textarea
                  rows={5}
                  value={pastedResumeDraft}
                  onChange={(e) => setPastedResumeDraft(e.target.value)}
                  placeholder="Paste your experience, projects, SQL/DSA/OOPs skills, education..."
                  className="w-full bg-white border border-[#e2e8f0] rounded-lg p-2.5 text-xs font-mono text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#4f46e5]"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPasteResume(false)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#565e74] bg-white border border-[#e2e8f0]"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleAnalyzePastedSetupResume()}
                    disabled={isUploadingResume}
                    className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-[#4f46e5] text-white hover:bg-[#3525cd]"
                  >
                    Analyze &amp; Update Interview Plan
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={() => setShowJdEditor((v) => !v)}
                className="text-[#3525cd] font-semibold hover:underline"
              >
                {showJdEditor ? 'Hide Target Job Description' : 'Customize Target Job Description for this Interview'}
              </button>
              <span className="text-[11px] text-[#777587]">
                PDF, DOCX, DOC, TXT supported
              </span>
            </div>

            {showJdEditor && (
              <div className="space-y-2">
                <textarea
                  rows={4}
                  value={setupJdDraft}
                  onChange={(e) => setSetupJdDraft(e.target.value)}
                  placeholder="Paste target Job Description..."
                  className="w-full bg-[#f8f9ff] border border-[#e2e8f0] rounded-lg p-3 text-xs font-mono text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#4f46e5]"
                />
              </div>
            )}
          </section>

          {/* STEP 2: Target Role & Company */}
          <section className="bg-white rounded-xl p-6 border border-[#e2e8f0] shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-7 h-7 rounded-lg bg-[#eff4ff] text-[#3525cd] flex items-center justify-center font-bold text-xs">
                2
              </div>
              <div>
                <h2 className="font-heading text-base font-bold text-[#0b1c30]">
                  Target Job Role &amp; Organization
                </h2>
                <p className="text-xs text-[#565e74]">
                  Automatically partitions the interview into domain sections (e.g. DSA, OOPs, SQL, Architecture for Software Developers).
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#0b1c30] mb-1.5" htmlFor="role-input">
                  Target Role Title
                </label>
                <input
                  id="role-input"
                  type="text"
                  value={targetRole}
                  onChange={(e) => {
                    hasEditedRoleRef.current = true;
                    setTargetRole(e.target.value);
                    updateInterviewSetup({ targetRole: e.target.value });
                  }}
                  className="w-full bg-[#f8f9ff] border border-[#e2e8f0] rounded-lg px-3.5 py-2.5 text-sm text-[#0b1c30] font-medium focus:outline-none focus:ring-2 focus:ring-[#4f46e5]"
                  placeholder="e.g. Software Developer, Senior Frontend Engineer"
                />
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-[11px] text-[#777587] mr-1">Presets:</span>
                  {rolePresets.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        hasEditedRoleRef.current = true;
                        setTargetRole(preset);
                        updateInterviewSetup({ targetRole: preset });
                      }}
                      className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                        targetRole === preset
                          ? 'bg-[#4f46e5] text-white border-[#4f46e5] font-semibold'
                          : 'bg-[#f8f9ff] text-[#565e74] border-[#e2e8f0] hover:bg-[#eff4ff]'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0b1c30] mb-1.5" htmlFor="company-input">
                  Target Organization / Company
                </label>
                <input
                  id="company-input"
                  type="text"
                  value={targetCompany}
                  onChange={(e) => {
                    hasEditedCompanyRef.current = true;
                    setTargetCompany(e.target.value);
                    updateInterviewSetup({ targetCompany: e.target.value });
                  }}
                  className="w-full bg-[#f8f9ff] border border-[#e2e8f0] rounded-lg px-3.5 py-2.5 text-sm text-[#0b1c30] font-medium focus:outline-none focus:ring-2 focus:ring-[#4f46e5]"
                  placeholder="e.g. Stripe, Google, Microsoft"
                />
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-[11px] text-[#777587] mr-1">Top Benchmarks:</span>
                  {companyPresets.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        hasEditedCompanyRef.current = true;
                        setTargetCompany(preset);
                        updateInterviewSetup({ targetCompany: preset });
                      }}
                      className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                        targetCompany === preset
                          ? 'bg-[#3525cd] text-white border-[#3525cd] font-semibold'
                          : 'bg-[#f8f9ff] text-[#565e74] border-[#e2e8f0] hover:bg-[#eff4ff]'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* STEP 3: Interview Type & Focus Area */}
          <section className="bg-white rounded-xl p-6 border border-[#e2e8f0] shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-7 h-7 rounded-lg bg-[#eff4ff] text-[#3525cd] flex items-center justify-center font-bold text-xs">
                3
              </div>
              <div>
                <h2 className="font-heading text-base font-bold text-[#0b1c30]">
                  Interview Type &amp; Focus Domain
                </h2>
                <p className="text-xs text-[#565e74]">
                  Choose the evaluation domain for the simulated panel.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                onClick={() => setInterviewType('technical')}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  interviewType === 'technical'
                    ? 'bg-[#eff4ff] border-[#4f46e5] ring-2 ring-[#4f46e5]/40 shadow-sm'
                    : 'bg-[#f8f9ff] border-[#e2e8f0] hover:bg-[#eff4ff]/40'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="p-2 rounded-lg bg-[#3525cd] text-white">
                    <Code className="w-5 h-5" />
                  </div>
                  {interviewType === 'technical' && (
                    <CheckCircle className="w-5 h-5 text-[#3525cd]" />
                  )}
                </div>
                <h3 className="font-heading text-sm font-bold text-[#0b1c30]">
                  Technical &amp; Core CS Loop
                </h3>
                <p className="text-xs text-[#565e74] mt-1 leading-relaxed">
                  Covers resume deep-dive plus role-specific pillars such as DSA, OOPs, SQL/DBMS, and system architecture.
                </p>
                <div className="mt-3 flex items-center gap-1 text-[11px] text-[#3525cd] font-semibold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Recommended for {targetCompany}</span>
                </div>
              </div>

              <div
                onClick={() => setInterviewType('behavioral')}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  interviewType === 'behavioral'
                    ? 'bg-[#eff4ff] border-[#4f46e5] ring-2 ring-[#4f46e5]/40 shadow-sm'
                    : 'bg-[#f8f9ff] border-[#e2e8f0] hover:bg-[#eff4ff]/40'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="p-2 rounded-lg bg-[#004c76] text-white">
                    <Users className="w-5 h-5" />
                  </div>
                  {interviewType === 'behavioral' && (
                    <CheckCircle className="w-5 h-5 text-[#3525cd]" />
                  )}
                </div>
                <h3 className="font-heading text-sm font-bold text-[#0b1c30]">
                  Behavioral &amp; Leadership (STAR)
                </h3>
                <p className="text-xs text-[#565e74] mt-1 leading-relaxed">
                  Evaluates project ownership from your resume, conflict resolution, delivery under pressure, and executive presence.
                </p>
                <div className="mt-3 text-[11px] text-[#565e74]">
                  Evaluates STAR structure &amp; measurable impact
                </div>
              </div>

              <div
                onClick={() => setInterviewType('system-design')}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  interviewType === 'system-design'
                    ? 'bg-[#eff4ff] border-[#4f46e5] ring-2 ring-[#4f46e5]/40 shadow-sm'
                    : 'bg-[#f8f9ff] border-[#e2e8f0] hover:bg-[#eff4ff]/40'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="p-2 rounded-lg bg-[#565e74] text-white">
                    <Terminal className="w-5 h-5" />
                  </div>
                  {interviewType === 'system-design' && (
                    <CheckCircle className="w-5 h-5 text-[#3525cd]" />
                  )}
                </div>
                <h3 className="font-heading text-sm font-bold text-[#0b1c30]">
                  Distributed System Design
                </h3>
                <p className="text-xs text-[#565e74] mt-1 leading-relaxed">
                  Data modeling, SQL sharding, caching tiers, rate limiters, queues, and fault-tolerant failover design.
                </p>
                <div className="mt-3 text-[11px] text-[#565e74]">
                  High-scale infrastructure bar
                </div>
              </div>

              <div
                onClick={() => setInterviewType('hr-cultural')}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  interviewType === 'hr-cultural'
                    ? 'bg-[#eff4ff] border-[#4f46e5] ring-2 ring-[#4f46e5]/40 shadow-sm'
                    : 'bg-[#f8f9ff] border-[#e2e8f0] hover:bg-[#eff4ff]/40'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="p-2 rounded-lg bg-[#00659a] text-white">
                    <Building className="w-5 h-5" />
                  </div>
                  {interviewType === 'hr-cultural' && (
                    <CheckCircle className="w-5 h-5 text-[#3525cd]" />
                  )}
                </div>
                <h3 className="font-heading text-sm font-bold text-[#0b1c30]">
                  HR &amp; Cultural Values Match
                </h3>
                <p className="text-xs text-[#565e74] mt-1 leading-relaxed">
                  Career trajectory alignment, operating principles, teamwork motivation, and role expectations.
                </p>
                <div className="mt-3 text-[11px] text-[#565e74]">
                  Hiring manager screening round
                </div>
              </div>
            </div>
          </section>

          {/* STEP 4: Experience Level, Duration & Voice */}
          <section className="bg-white rounded-xl p-6 border border-[#e2e8f0] shadow-sm space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-[#eff4ff] text-[#3525cd] flex items-center justify-center font-bold text-xs">
                4
              </div>
              <div>
                <h2 className="font-heading text-base font-bold text-[#0b1c30]">
                  Seniority Bar, Session Depth &amp; Voice Agent
                </h2>
                <p className="text-xs text-[#565e74]">
                  Controls question complexity, number of divided sections, and interviewer neural voice.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { id: 'entry', label: 'Junior / Entry', exp: '0–2 yrs', tag: 'Fundamentals' },
                { id: 'mid', label: 'Mid-Level', exp: '2–5 yrs', tag: 'Core L4' },
                { id: 'senior-staff', label: 'Senior / Staff', exp: '5+ yrs', tag: 'L6 Bar (Rec)' },
                { id: 'principal', label: 'Principal', exp: '10+ yrs', tag: 'Bar Raiser' },
              ].map((lvl) => (
                <div
                  key={lvl.id}
                  onClick={() => setDifficulty(lvl.id as any)}
                  className={`p-3.5 rounded-xl border cursor-pointer text-center transition-all ${
                    difficulty === lvl.id
                      ? 'bg-[#eff4ff] border-[#4f46e5] ring-2 ring-[#4f46e5]/40 shadow-sm'
                      : 'bg-[#f8f9ff] border-[#e2e8f0] hover:bg-[#eff4ff]/40'
                  }`}
                >
                  <div className="text-[10px] font-bold text-[#3525cd] uppercase tracking-wider mb-1">
                    {lvl.tag}
                  </div>
                  <div className="font-heading text-sm font-bold text-[#0b1c30]">{lvl.label}</div>
                  <div className="text-xs text-[#565e74] mt-0.5">{lvl.exp}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-[#f8f9ff] rounded-xl border border-[#e2e8f0]">
                <label className="text-xs font-semibold text-[#0b1c30] block mb-2">
                  Verbal Interview &amp; Neural Voice Agent
                </label>
                <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-[#eff4ff] border border-[#4f46e5]/30 text-xs font-semibold text-[#3525cd]">
                  <Mic className="w-4 h-4 shrink-0" />
                  <span>Live Verbal Only (Speech-to-Speech + Live Transcript)</span>
                </div>
                <div className="mt-2.5">
                  <label htmlFor="voice-select" className="text-[11px] font-semibold text-[#565e74] block mb-1">
                    Interviewer Neural Voice Tone
                  </label>
                  <select
                    id="voice-select"
                    value={voiceName}
                    onChange={(e) => setVoiceName(e.target.value as any)}
                    className="w-full bg-white border border-[#e2e8f0] rounded-lg px-2.5 py-1.5 text-xs font-medium text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#4f46e5]"
                  >
                    <option value="Kore">Kore — Warm Executive (Female)</option>
                    <option value="Zephyr">Zephyr — Crisp Analytical (Female)</option>
                    <option value="Charon">Charon — Grounded Director (Male)</option>
                    <option value="Puck">Puck — Collaborative Lead (Male)</option>
                    <option value="Fenrir">Fenrir — Incisive Bar-Raiser (Male)</option>
                  </select>
                </div>
              </div>

              <div className="p-4 bg-[#f8f9ff] rounded-xl border border-[#e2e8f0] flex flex-col justify-between">
                <div>
                  <label className="text-xs font-semibold text-[#0b1c30] block mb-2">
                    Session Length &amp; Question Count
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { mins: 15, qs: 3, label: 'Express' },
                      { mins: 30, qs: 4, label: 'Standard' },
                      { mins: 45, qs: 5, label: 'Full Loop' },
                    ].map((opt) => (
                      <button
                        key={opt.mins}
                        type="button"
                        onClick={() => {
                          setDurationMinutes(opt.mins);
                          setQuestionCount(opt.qs);
                        }}
                        className={`py-2 px-2 rounded-lg text-center border transition-all ${
                          questionCount === opt.qs
                            ? 'bg-[#3525cd] text-white border-[#3525cd] font-semibold'
                            : 'bg-white text-[#0b1c30] border-[#e2e8f0]'
                        }`}
                      >
                        <div className="text-xs font-bold">{opt.mins} min</div>
                        <div className="text-[10px] opacity-80">{opt.qs} Questions</div>
                      </button>
                    ))}
                  </div>
                </div>
                <span className="text-[11px] text-[#777587] mt-2 block">
                  Includes adaptive AI follow-ups triggered from your live responses.
                </span>
              </div>
            </div>
          </section>

          {/* STEP 5: DIVIDED INTERVIEW SECTIONS & ASSESSMENT RULES PREVIEW */}
          <section
            data-testid="interview-sections-blueprint"
            className="bg-white rounded-xl p-6 border border-[#e2e8f0] shadow-sm space-y-5"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-[#eff4ff] text-[#3525cd] flex items-center justify-center font-bold text-xs shrink-0">
                  5
                </div>
                <div>
                  <h2 className="font-heading text-base font-bold text-[#0b1c30]">
                    Divided Interview Sections &amp; Candidate Assessment Rules
                  </h2>
                  <p className="text-xs text-[#565e74]">
                    Exact topics {aiPersona} will ask for <strong>{targetRole}</strong> and the grading rules used to evaluate your answers.
                  </p>
                </div>
              </div>
              {isLoadingPlanPreview && (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#3525cd]">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Recalibrating...
                </span>
              )}
            </div>

            {/* Divided Role Sections */}
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#0b1c30] uppercase tracking-wider">
                <ListOrdered className="w-4 h-4 text-[#3525cd]" />
                <span>Planned Interview Sections ({plannedSections.length})</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {plannedSections.map((sec) => (
                  <div
                    key={sec.id}
                    data-testid="planned-interview-section-card"
                    className="p-4 rounded-xl bg-[#f8f9ff] border border-[#e2e8f0] flex flex-col gap-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-xs font-bold text-[#0b1c30]">
                        {sec.order}. {sec.sectionName}
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#eff4ff] text-[#3525cd] border border-[#c7d2fe] shrink-0">
                        {sec.weightPercentage}% weight
                      </span>
                    </div>

                    <p className="text-[11px] text-[#565e74] leading-relaxed">{sec.rationale}</p>

                    <div className="flex flex-wrap gap-1.5">
                      {sec.topicsCovered.map((topic) => (
                        <span
                          key={topic}
                          className="text-[10px] font-semibold px-2 py-0.5 rounded bg-white border border-[#e2e8f0] text-[#0b1c30]"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>

                    <div className="pt-2 border-t border-[#e2e8f0] space-y-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-[#3525cd]">
                        What We Assess Here:
                      </div>
                      {sec.assessmentCriteria.map((criterion, cIdx) => (
                        <div key={cIdx} className="text-[11px] text-[#464555] flex items-start gap-1.5">
                          <Check className="w-3 h-3 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{criterion}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Candidate Assessment Rules & Criteria */}
            <div className="space-y-3 pt-2 border-t border-[#e2e8f0]">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#0b1c30] uppercase tracking-wider">
                  <Scale className="w-4 h-4 text-[#3525cd]" />
                  <span>Assessment Rules &amp; Candidate-Only Scoring Criteria</span>
                </div>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  100% Candidate-Response Graded
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {assessmentRules.map((rule) => (
                  <div
                    key={rule.id}
                    data-testid="assessment-rule-card"
                    className="p-3.5 rounded-xl bg-white border border-[#e2e8f0] space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-[#0b1c30]">{rule.dimension}</span>
                      <span className="text-xs font-bold text-[#3525cd] tabular-nums shrink-0">
                        {rule.weightPercentage}%
                      </span>
                    </div>
                    <p className="text-[11px] text-[#565e74] leading-relaxed">{rule.ruleDescription}</p>
                    <div className="space-y-1 text-[11px]">
                      {rule.passSignals.slice(0, 1).map((sig, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-emerald-800">
                          <Check className="w-3 h-3 shrink-0 mt-0.5" />
                          <span>
                            <strong>Pass:</strong> {sig}
                          </span>
                        </div>
                      ))}
                      {rule.redFlags.slice(0, 1).map((flag, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-amber-800">
                          <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                          <span>
                            <strong>Deduction:</strong> {flag}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* STEP 6: AI Interviewer Persona */}
          <section className="bg-white rounded-xl p-6 border border-[#e2e8f0] shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-7 h-7 rounded-lg bg-[#eff4ff] text-[#3525cd] flex items-center justify-center font-bold text-xs">
                6
              </div>
              <div>
                <h2 className="font-heading text-base font-bold text-[#0b1c30]">
                  AI Interviewer Persona
                </h2>
                <p className="text-xs text-[#565e74]">
                  Tailor the interviewer persona style to match your target interview tone.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                {
                  name: 'Sarah',
                  role: 'Principal Systems Architect',
                  style: 'Methodical & Bar-Raiser',
                  desc: 'Probes edge-case resilience, SQL/system bottlenecks, and state failure recovery.',
                },
                {
                  name: 'Dr. Elena Vance',
                  role: 'AI Infrastructure Lead',
                  style: 'Analytical & Thorough',
                  desc: 'Evaluates algorithmic complexity, OOP design patterns, and clean code hygiene.',
                },
                {
                  name: 'Marcus Reed',
                  role: 'Engineering Director',
                  style: 'Executive & Strategic',
                  desc: 'Focuses on cross-team consensus, architecture tradeoffs, and business KPIs.',
                },
                {
                  name: 'David Chen',
                  role: 'Staff Software Lead',
                  style: 'Hands-on & Collaborative',
                  desc: 'Examines real-world project architecture, performance, and API reliability.',
                },
              ].map((p) => (
                <div
                  key={p.name}
                  onClick={() => setAiPersona(p.name as any)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    aiPersona === p.name
                      ? 'bg-[#eff4ff] border-[#4f46e5] ring-2 ring-[#4f46e5]/40 shadow-sm'
                      : 'bg-[#f8f9ff] border-[#e2e8f0] hover:bg-[#eff4ff]/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-heading text-sm font-bold text-[#0b1c30]">{p.name}</span>
                    <span className="text-[10px] font-semibold text-[#3525cd] bg-[#dae2fd] px-2 py-0.5 rounded-full">
                      {p.style}
                    </span>
                  </div>
                  <div className="text-xs text-[#565e74] font-medium">{p.role}</div>
                  <p className="text-[11px] text-[#777587] mt-1.5 leading-relaxed">{p.desc}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right Column: Launch Enclave Summary */}
        <div className="lg:col-span-4 flex flex-col gap-6 sticky top-20 text-left">
          <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm p-6 flex flex-col gap-5">
            <div className="pb-3 border-b border-[#e2e8f0]">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#3525cd]">
                Session Specifications
              </span>
              <h3 className="font-heading text-lg font-bold text-[#0b1c30] mt-0.5">
                Target Mock Overview
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-[#f1f5f9] gap-2">
                <span className="text-[#565e74]">Uploaded Resume</span>
                <span className="font-semibold text-[#0b1c30] truncate max-w-[170px]">{resumeAnalysis.fileName}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-[#f1f5f9]">
                <span className="text-[#565e74]">Resume ATS Score</span>
                <span className={`font-bold ${atsBand.textClass}`}>{atsScore}/100</span>
              </div>

              <div className="flex justify-between py-1 border-b border-[#f1f5f9]">
                <span className="text-[#565e74]">Target Role</span>
                <span className="font-semibold text-[#0b1c30]">{targetRole}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-[#f1f5f9]">
                <span className="text-[#565e74]">Target Company</span>
                <span className="font-semibold text-[#0b1c30]">{targetCompany}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-[#f1f5f9]">
                <span className="text-[#565e74]">Evaluation Domain</span>
                <span className="font-semibold text-[#3525cd] capitalize">{interviewType.replace('-', ' ')}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-[#f1f5f9]">
                <span className="text-[#565e74]">Planned Sections</span>
                <span className="font-semibold text-[#0b1c30]">{plannedSections.length} Role Sections</span>
              </div>

              <div className="flex justify-between py-1 border-b border-[#f1f5f9]">
                <span className="text-[#565e74]">Session Format</span>
                <span className="font-semibold text-[#0b1c30]">{durationMinutes} mins • {questionCount} Questions</span>
              </div>

              <div className="flex justify-between py-1">
                <span className="text-[#565e74]">AI Voice Agent</span>
                <span className="font-semibold text-[#0b1c30]">{aiPersona} ({voiceName})</span>
              </div>
            </div>

            <div className="p-3 bg-[#eff4ff] rounded-lg border border-[#c7c4d8]/40 text-xs text-[#565e74] flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-[#3525cd] shrink-0 mt-0.5" />
              <span>
                {aiPersona} greets you verbally, outlines the {plannedSections.length || questionCount} interview sections, adapts live with follow-up questions, and scores only your candidate responses.
              </span>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                data-testid="launch-interview-btn"
                onClick={handleLaunchSession}
                className="w-full py-3.5 rounded-xl bg-[#4f46e5] hover:bg-[#3525cd] text-white font-semibold text-sm transition-all shadow-md flex items-center justify-center gap-2 active:scale-95"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Launch Live Mock Room</span>
              </button>

              <button
                type="button"
                onClick={handleResetDefaults}
                className="w-full py-2 rounded-lg bg-white hover:bg-[#f8f9ff] text-[#565e74] text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 border border-[#e2e8f0]"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Setup Defaults</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
