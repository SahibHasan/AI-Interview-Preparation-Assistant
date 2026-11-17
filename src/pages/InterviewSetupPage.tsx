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
  RefreshCw,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { validateResumeFile, readFileAsBase64DataUrl, getAtsScoreBand } from '../utils/resumeFile';
import {
  INTERVIEW_ROLE_OPTIONS,
  CUSTOM_ROLE_VALUE,
  INTERVIEW_TYPE_LABELS,
  isPresetRole,
} from '../utils/roleCatalog';

export const InterviewSetupPage: React.FC = () => {
  const { updateUserMetrics } = useAuth();
  const {
    profile,
    resumeAnalysis,
    jobDescriptionText,
    setJobDescriptionText,
    interviewSetup,
    updateInterviewSetup,
    analyzeResumeAndJD,
    resetInterviewSession,
  } = useApp();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [targetRole, setTargetRole] = useState(interviewSetup.targetRole || 'Software Developer');
  const [useCustomRoleInput, setUseCustomRoleInput] = useState(
    !isPresetRole(interviewSetup.targetRole || 'Software Developer')
  );
  const [targetCompany, setTargetCompany] = useState(interviewSetup.targetCompany || 'Stripe');
  const [interviewType, setInterviewType] = useState(interviewSetup.interviewType || 'technical');
  const [difficulty, setDifficulty] = useState(interviewSetup.difficulty || 'senior-staff');
  const [durationMinutes, setDurationMinutes] = useState(interviewSetup.durationMinutes || 45);
  const [questionCount, setQuestionCount] = useState(interviewSetup.questionCount || 5);
  const [aiPersona, setAiPersona] = useState(interviewSetup.aiPersona || 'Sarah');
  const [voiceName, setVoiceName] = useState<'Kore' | 'Zephyr' | 'Charon' | 'Puck' | 'Fenrir'>(
    interviewSetup.voiceName || 'Kore'
  );

  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const [showPasteResume, setShowPasteResume] = useState(false);
  const [pastedResumeDraft, setPastedResumeDraft] = useState(resumeAnalysis.rawText || '');
  const [setupJdDraft, setSetupJdDraft] = useState(jobDescriptionText);
  const [showJdEditor, setShowJdEditor] = useState(false);

  const hasEditedRoleRef = useRef(false);
  const hasEditedCompanyRef = useRef(false);

  useEffect(() => {
    if (!hasEditedRoleRef.current && interviewSetup.targetRole) {
      setTargetRole(interviewSetup.targetRole);
      setUseCustomRoleInput(!isPresetRole(interviewSetup.targetRole));
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

  const companyPresets = ['Stripe', 'Google', 'Meta', 'Microsoft', 'Amazon', 'High-Growth Startup'];

  const handleSelectRoleOption = (selectedValue: string) => {
    hasEditedRoleRef.current = true;
    if (selectedValue === CUSTOM_ROLE_VALUE) {
      setUseCustomRoleInput(true);
      if (isPresetRole(targetRole)) {
        setTargetRole('');
      }
      return;
    }
    setUseCustomRoleInput(false);
    setTargetRole(selectedValue);
    updateInterviewSetup({ targetRole: selectedValue });
  };

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

    const effectiveRole = targetRole.trim() || interviewSetup.targetRole || 'Software Developer';
    const effectiveCompany = targetCompany.trim() || interviewSetup.targetCompany || 'Stripe';

    setIsUploadingResume(true);
    try {
      const base64 = await readFileAsBase64DataUrl(file);
      const result = await analyzeResumeAndJD({
        fileName: file.name,
        fileBase64: base64,
        mimeType: file.type,
        jdText: setupJdDraft,
        targetRole: effectiveRole,
        targetCompany: effectiveCompany,
        interviewType,
        difficulty,
        questionCount,
      });

      showToast({
        title: 'Resume Ready for Live Session',
        message: `${file.name} parsed (${result.wordCount || 0} words) · ATS Score: ${result.atsScore}/100.`,
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
    const effectiveRole = targetRole.trim() || interviewSetup.targetRole || 'Software Developer';
    const effectiveCompany = targetCompany.trim() || interviewSetup.targetCompany || 'Stripe';

    setIsUploadingResume(true);
    try {
      const result = await analyzeResumeAndJD({
        fileName: 'pasted_interview_resume.txt',
        rawText: pastedResumeDraft.trim(),
        jdText: setupJdDraft,
        targetRole: effectiveRole,
        targetCompany: effectiveCompany,
        interviewType,
        difficulty,
        questionCount,
      });
      setShowPasteResume(false);
      showToast({
        title: 'Resume Calibrated',
        message: `ATS Score: ${result.atsScore}/100 · Saved for live interview.`,
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
    const resolvedRole = targetRole.trim() || 'Software Developer';
    const resolvedCompany = targetCompany.trim() || 'Stripe';

    if (setupJdDraft !== jobDescriptionText) {
      setJobDescriptionText(setupJdDraft);
    }

    updateInterviewSetup({
      targetRole: resolvedRole,
      targetCompany: resolvedCompany,
      interviewType,
      difficulty,
      durationMinutes,
      questionCount,
      voiceModeEnabled: true,
      aiPersona,
      voiceName,
    });
    void updateUserMetrics({
      targetRole: resolvedRole,
      targetCompany: resolvedCompany,
    });
    resetInterviewSession();
    showToast({
      title: 'Starting Live Verbal Interview',
      message: `${aiPersona} is preparing your ${INTERVIEW_TYPE_LABELS[interviewType]} plan for ${resolvedRole} @ ${resolvedCompany}.`,
      type: 'info',
    });
    navigate('/live-session');
  };

  const handleResetDefaults = () => {
    hasEditedRoleRef.current = true;
    hasEditedCompanyRef.current = true;
    setTargetRole('Software Developer');
    setUseCustomRoleInput(false);
    setTargetCompany('Stripe');
    setInterviewType('technical');
    setDifficulty('senior-staff');
    setDurationMinutes(45);
    setQuestionCount(5);
    setAiPersona('Sarah');
    setVoiceName('Kore');
    updateInterviewSetup({
      targetRole: 'Software Developer',
      targetCompany: 'Stripe',
      interviewType: 'technical',
      difficulty: 'senior-staff',
      durationMinutes: 45,
      questionCount: 5,
      aiPersona: 'Sarah',
      voiceName: 'Kore',
    });
    showToast({
      title: 'Defaults Restored',
      message: 'Reset to Software Developer · Technical & Core CS · 45 mins.',
      type: 'info',
    });
  };

  const atsScore = Math.max(0, Math.min(100, resumeAnalysis.atsScore || 0));
  const atsBand = getAtsScoreBand(atsScore);
  const activeSkills = resumeAnalysis.parsedProfile?.skills || profile.skills || [];
  const effectiveRoleLabel = targetRole.trim() || 'Software Developer';
  const effectiveCompanyLabel = targetCompany.trim() || 'Stripe';

  return (
    <div className="flex flex-col w-full gap-6 pb-12 antialiased">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 text-left">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-[#565e74] uppercase tracking-wider font-semibold mb-1">
            <span>Platform</span>
            <span aria-hidden="true">·</span>
            <span className="text-[#3525cd]">Interview Setup &amp; Calibration</span>
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-[#0b1c30] tracking-tight">
            Configure Your AI Mock Interview
          </h1>
          <p className="text-sm text-[#464555] mt-1">
            Choose your target job role, interview focus, voice agent, and resume context. Your interviewer builds the topic order live once the session begins.
          </p>
        </div>

        <div className="text-xs font-semibold text-[#3525cd] glass-pill-bar px-3.5 py-2 rounded-xl self-start md:self-auto whitespace-nowrap">
          Active: {effectiveRoleLabel} · {INTERVIEW_TYPE_LABELS[interviewType]}
        </div>
      </div>

      {/* Main Grid: Steps (8 cols) + Summary Card (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Clean 4-Step Configuration */}
        <div className="lg:col-span-8 flex flex-col gap-6 text-left">
          {/* STEP 1: Target Role Dropdown & Company */}
          <section className="glass-panel rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg glass-btn-primary text-white flex items-center justify-center font-bold text-xs shrink-0">
                1
              </div>
              <div>
                <h2 className="font-heading text-base font-bold text-[#0b1c30]">
                  Target Job Role &amp; Organization
                </h2>
                <p className="text-xs text-[#464555]">
                  Select your exact role so the AI interviewer tailors your live interview order and evaluation bar.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#0b1c30] mb-1.5" htmlFor="role-select">
                  Target Job Role
                </label>
                <select
                  id="role-select"
                  data-testid="setup-role-select"
                  value={useCustomRoleInput ? CUSTOM_ROLE_VALUE : isPresetRole(targetRole) ? targetRole : CUSTOM_ROLE_VALUE}
                  onChange={(e) => handleSelectRoleOption(e.target.value)}
                  className="w-full glass-input rounded-xl px-3.5 py-2.5 text-sm text-[#0b1c30] font-medium outline-none"
                >
                  {INTERVIEW_ROLE_OPTIONS.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                  <option value={CUSTOM_ROLE_VALUE}>Custom Role Title...</option>
                </select>

                {useCustomRoleInput && (
                  <input
                    id="custom-role-input"
                    data-testid="setup-custom-role-input"
                    type="text"
                    value={targetRole}
                    onChange={(e) => {
                      hasEditedRoleRef.current = true;
                      setTargetRole(e.target.value);
                      updateInterviewSetup({ targetRole: e.target.value });
                    }}
                    className="mt-2 w-full glass-input rounded-xl px-3.5 py-2 text-sm text-[#0b1c30] font-medium outline-none"
                    placeholder="Enter custom role title (e.g. Solutions Architect)"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0b1c30] mb-1.5" htmlFor="company-input">
                  Target Organization / Company
                </label>
                <input
                  id="company-input"
                  data-testid="setup-company-input"
                  type="text"
                  value={targetCompany}
                  onChange={(e) => {
                    hasEditedCompanyRef.current = true;
                    setTargetCompany(e.target.value);
                    updateInterviewSetup({ targetCompany: e.target.value });
                  }}
                  className="w-full glass-input rounded-xl px-3.5 py-2.5 text-sm text-[#0b1c30] font-medium outline-none"
                  placeholder="e.g. Stripe, Google, Microsoft"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] text-[#777587] mr-1">Company Benchmarks:</span>
              {companyPresets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    hasEditedCompanyRef.current = true;
                    setTargetCompany(preset);
                    updateInterviewSetup({ targetCompany: preset });
                  }}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all ${
                    targetCompany === preset
                      ? 'glass-btn-primary text-white border-transparent font-semibold'
                      : 'glass-subcard text-[#464555] hover:bg-white'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </section>

          {/* STEP 2: Interview Type & Focus Area */}
          <section className="glass-panel rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-7 h-7 rounded-lg glass-subcard text-[#3525cd] flex items-center justify-center font-bold text-xs">
                2
              </div>
              <div>
                <h2 className="font-heading text-base font-bold text-[#0b1c30]">
                  Interview Type &amp; Focus Domain
                </h2>
                <p className="text-xs text-[#464555]">
                  Select the exact interview format you want {aiPersona} to conduct.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                type="button"
                data-testid="interview-type-technical"
                onClick={() => {
                  setInterviewType('technical');
                  updateInterviewSetup({ interviewType: 'technical' });
                }}
                className={`p-4 rounded-2xl border text-left glass-interactive ${
                  interviewType === 'technical'
                    ? 'bg-[#eff4ff]/85 backdrop-blur-md border-[#4f46e5] ring-2 ring-[#4f46e5]/30 shadow-md'
                    : 'glass-subcard hover:bg-white/80'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="p-2 rounded-xl bg-[#3525cd] text-white shadow-xs">
                    <Code className="w-5 h-5" />
                  </div>
                  {interviewType === 'technical' && <CheckCircle className="w-5 h-5 text-[#3525cd]" />}
                </div>
                <h3 className="font-heading text-sm font-bold text-[#0b1c30]">Technical &amp; Core CS Loop</h3>
                <p className="text-xs text-[#565e74] mt-1 leading-relaxed">
                  Role-matched coding, DSA, OOPs, SQL/data modeling, and technical project deep-dives from your resume.
                </p>
                <div className="mt-3 flex items-center gap-1 text-[11px] text-[#3525cd] font-semibold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Calibrated for {effectiveRoleLabel}</span>
                </div>
              </button>

              <button
                type="button"
                data-testid="interview-type-behavioral"
                onClick={() => {
                  setInterviewType('behavioral');
                  updateInterviewSetup({ interviewType: 'behavioral' });
                }}
                className={`p-4 rounded-2xl border text-left glass-interactive ${
                  interviewType === 'behavioral'
                    ? 'bg-[#eff4ff]/85 backdrop-blur-md border-[#4f46e5] ring-2 ring-[#4f46e5]/30 shadow-md'
                    : 'glass-subcard hover:bg-white/80'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="p-2 rounded-xl bg-[#004c76] text-white shadow-xs">
                    <Users className="w-5 h-5" />
                  </div>
                  {interviewType === 'behavioral' && <CheckCircle className="w-5 h-5 text-[#3525cd]" />}
                </div>
                <h3 className="font-heading text-sm font-bold text-[#0b1c30]">Behavioral &amp; Leadership (STAR)</h3>
                <p className="text-xs text-[#565e74] mt-1 leading-relaxed">
                  Evaluates project ownership, conflict resolution, delivery under pressure, and executive presence.
                </p>
                <div className="mt-3 text-[11px] text-[#565e74]">STAR structure &amp; measurable impact</div>
              </button>

              <button
                type="button"
                data-testid="interview-type-system-design"
                onClick={() => {
                  setInterviewType('system-design');
                  updateInterviewSetup({ interviewType: 'system-design' });
                }}
                className={`p-4 rounded-2xl border text-left glass-interactive ${
                  interviewType === 'system-design'
                    ? 'bg-[#eff4ff]/85 backdrop-blur-md border-[#4f46e5] ring-2 ring-[#4f46e5]/30 shadow-md'
                    : 'glass-subcard hover:bg-white/80'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="p-2 rounded-xl bg-[#565e74] text-white shadow-xs">
                    <Terminal className="w-5 h-5" />
                  </div>
                  {interviewType === 'system-design' && <CheckCircle className="w-5 h-5 text-[#3525cd]" />}
                </div>
                <h3 className="font-heading text-sm font-bold text-[#0b1c30]">Distributed System Design</h3>
                <p className="text-xs text-[#565e74] mt-1 leading-relaxed">
                  Data modeling, SQL sharding, caching tiers, rate limiters, queues, and fault-tolerant failover design.
                </p>
                <div className="mt-3 text-[11px] text-[#565e74]">High-scale architecture bar</div>
              </button>

              <button
                type="button"
                data-testid="interview-type-hr-cultural"
                onClick={() => {
                  setInterviewType('hr-cultural');
                  updateInterviewSetup({ interviewType: 'hr-cultural' });
                }}
                className={`p-4 rounded-2xl border text-left glass-interactive ${
                  interviewType === 'hr-cultural'
                    ? 'bg-[#eff4ff]/85 backdrop-blur-md border-[#4f46e5] ring-2 ring-[#4f46e5]/30 shadow-md'
                    : 'glass-subcard hover:bg-white/80'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="p-2 rounded-xl bg-[#00659a] text-white shadow-xs">
                    <Building className="w-5 h-5" />
                  </div>
                  {interviewType === 'hr-cultural' && <CheckCircle className="w-5 h-5 text-[#3525cd]" />}
                </div>
                <h3 className="font-heading text-sm font-bold text-[#0b1c30]">HR &amp; Cultural Values Match</h3>
                <p className="text-xs text-[#565e74] mt-1 leading-relaxed">
                  Career trajectory alignment, operating principles, teamwork motivation, and role expectations.
                </p>
                <div className="mt-3 text-[11px] text-[#565e74]">Hiring manager screening round</div>
              </button>
            </div>
          </section>

          {/* STEP 3: Experience Level, Session Length, Voice & Persona */}
          <section className="glass-panel rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg glass-subcard text-[#3525cd] flex items-center justify-center font-bold text-xs">
                3
              </div>
              <div>
                <h2 className="font-heading text-base font-bold text-[#0b1c30]">
                  Seniority Bar, Session Depth &amp; AI Voice Agent
                </h2>
                <p className="text-xs text-[#464555]">
                  Tune the interview bar, question count, interviewer persona, and natural voice tone.
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
                <button
                  key={lvl.id}
                  type="button"
                  onClick={() => {
                    setDifficulty(lvl.id as any);
                    updateInterviewSetup({ difficulty: lvl.id as any });
                  }}
                  className={`p-3.5 rounded-xl border text-center glass-interactive ${
                    difficulty === lvl.id
                      ? 'bg-[#eff4ff]/85 backdrop-blur-md border-[#4f46e5] ring-2 ring-[#4f46e5]/30 shadow-sm'
                      : 'glass-subcard hover:bg-white/80'
                  }`}
                >
                  <div className="text-[10px] font-bold text-[#3525cd] uppercase tracking-wider mb-1">
                    {lvl.tag}
                  </div>
                  <div className="font-heading text-sm font-bold text-[#0b1c30]">{lvl.label}</div>
                  <div className="text-xs text-[#565e74] mt-0.5">{lvl.exp}</div>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 glass-subcard rounded-xl">
                <label className="text-xs font-semibold text-[#0b1c30] block mb-2">
                  Verbal Interview &amp; Neural Voice Agent
                </label>
                <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-white/75 border border-[#4f46e5]/30 text-xs font-semibold text-[#3525cd]">
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
                    onChange={(e) => {
                      const v = e.target.value as any;
                      setVoiceName(v);
                      updateInterviewSetup({ voiceName: v });
                    }}
                    className="w-full glass-input rounded-lg px-2.5 py-1.5 text-xs font-medium text-[#0b1c30] outline-none"
                  >
                    <option value="Kore">Kore — Warm Executive (Female)</option>
                    <option value="Zephyr">Zephyr — Crisp Analytical (Female)</option>
                    <option value="Charon">Charon — Grounded Director (Male)</option>
                    <option value="Puck">Puck — Collaborative Lead (Male)</option>
                    <option value="Fenrir">Fenrir — Incisive Bar-Raiser (Male)</option>
                  </select>
                </div>
              </div>

              <div className="p-4 glass-subcard rounded-xl flex flex-col justify-between">
                <div>
                  <label className="text-xs font-semibold text-[#0b1c30] block mb-2">
                    Session Length &amp; Topic Count
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
                          updateInterviewSetup({ durationMinutes: opt.mins, questionCount: opt.qs });
                        }}
                        className={`py-2 px-2 rounded-lg text-center border transition-all ${
                          questionCount === opt.qs
                            ? 'glass-btn-primary text-white border-transparent font-semibold'
                            : 'bg-white/80 text-[#0b1c30] border-white hover:bg-white'
                        }`}
                      >
                        <div className="text-xs font-bold tabular-nums">{opt.mins} min</div>
                        <div className="text-[10px] opacity-85 tabular-nums">{opt.qs} Topics</div>
                      </button>
                    ))}
                  </div>
                </div>
                <span className="text-[11px] text-[#565e74] mt-2 block">
                  Includes adaptive AI follow-ups triggered from your live responses.
                </span>
              </div>
            </div>

            {/* Compact Persona Picker */}
            <div>
              <span className="block text-xs font-semibold text-[#0b1c30] mb-2">AI Interviewer Persona</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  {
                    name: 'Sarah',
                    role: 'Principal Systems Architect',
                    style: 'Methodical & Bar-Raiser',
                    desc: 'Probes edge-case resilience, system bottlenecks, and clear engineering judgment.',
                  },
                  {
                    name: 'Dr. Elena Vance',
                    role: 'AI Infrastructure Lead',
                    style: 'Analytical & Thorough',
                    desc: 'Evaluates algorithmic complexity, data architecture, and structured depth.',
                  },
                  {
                    name: 'Marcus Reed',
                    role: 'Engineering Director',
                    style: 'Executive & Strategic',
                    desc: 'Focuses on cross-team consensus, architecture tradeoffs, and business impact.',
                  },
                  {
                    name: 'David Chen',
                    role: 'Staff Software Lead',
                    style: 'Hands-on & Collaborative',
                    desc: 'Examines real-world project architecture, performance, and API reliability.',
                  },
                ].map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => {
                      setAiPersona(p.name as any);
                      updateInterviewSetup({ aiPersona: p.name as any });
                    }}
                    className={`p-3.5 rounded-xl border text-left glass-interactive ${
                      aiPersona === p.name
                        ? 'bg-[#eff4ff]/85 backdrop-blur-md border-[#4f46e5] ring-2 ring-[#4f46e5]/30 shadow-sm'
                        : 'glass-subcard hover:bg-white/80'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-heading text-sm font-bold text-[#0b1c30]">{p.name}</span>
                      <span className="text-[10px] font-semibold text-[#3525cd]">
                        {p.style}
                      </span>
                    </div>
                    <div className="text-xs text-[#565e74] font-medium">{p.role}</div>
                    <p className="text-[11px] text-[#565e74] mt-1 leading-relaxed">{p.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* STEP 4: Candidate Resume & Target JD Context */}
          <section
            data-testid="setup-resume-upload-section"
            className="glass-panel rounded-2xl p-6 space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg glass-subcard text-[#3525cd] flex items-center justify-center font-bold text-xs shrink-0">
                  4
                </div>
                <div>
                  <h2 className="font-heading text-base font-bold text-[#0b1c30]">
                    Candidate Resume &amp; Job Description Context
                  </h2>
                  <p className="text-xs text-[#565e74]">
                    Upload your latest resume and optionally customize the JD so {aiPersona} plans questions from your real projects.
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

            <div className="p-4 rounded-xl glass-subcard flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-white/90 border border-white text-[#3525cd] flex items-center justify-center shrink-0 shadow-xs">
                  {isUploadingResume ? <RefreshCw className="w-5 h-5 animate-spin" /> : <UploadCloud className="w-5 h-5" />}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      data-testid="setup-resume-filename"
                      className="text-xs sm:text-sm font-bold text-[#0b1c30] truncate max-w-[260px]"
                    >
                      {resumeAnalysis.fileName}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${atsBand.badgeClass}`}>
                      ATS {atsScore}/100
                    </span>
                  </div>
                  <div className="text-[11px] text-[#565e74] mt-0.5 tabular-nums">
                    {resumeAnalysis.fileSizeKb} KB · {resumeAnalysis.wordCount || 0} words · {activeSkills.length} detected skills ·{' '}
                    {resumeAnalysis.matchAnalysis.overallMatchPercentage}% JD match
                  </div>
                </div>
              </div>

              <label className="cursor-pointer inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl glass-btn-primary text-white text-xs font-semibold shrink-0 whitespace-nowrap">
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

            {/* Compact ATS Readiness Bar */}
            <div className="p-3.5 rounded-xl glass-subcard space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#0b1c30] flex items-center gap-1.5">
                  <Gauge className="w-4 h-4 text-[#3525cd]" />
                  <span>Resume ATS Readiness</span>
                </span>
                <span className={`font-bold tabular-nums ${atsBand.textClass}`}>
                  {atsScore}/100 — {atsBand.label}
                </span>
              </div>
              <div className="w-full h-2.5 bg-white/80 rounded-full overflow-hidden border border-white">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${atsBand.barClass}`}
                  style={{ width: `${Math.max(4, atsScore)}%` }}
                />
              </div>
              {activeSkills.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {activeSkills.slice(0, 8).map((sk) => (
                    <span
                      key={sk}
                      className="text-[11px] px-2 py-0.5 rounded bg-white/85 border border-white text-[#464555] font-medium"
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
              )}
            </div>

            {showPasteResume && (
              <div className="p-4 rounded-xl glass-subcard space-y-2.5">
                <label className="block text-xs font-semibold text-[#0b1c30]">
                  Paste Resume Content (Optional Alternative to File Upload)
                </label>
                <textarea
                  rows={5}
                  value={pastedResumeDraft}
                  onChange={(e) => setPastedResumeDraft(e.target.value)}
                  placeholder="Paste your experience, projects, SQL/DSA/OOPs skills, education..."
                  className="w-full glass-input rounded-xl p-2.5 text-xs font-mono text-[#0b1c30] outline-none"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPasteResume(false)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#565e74] bg-white/80 border border-white"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleAnalyzePastedSetupResume()}
                    disabled={isUploadingResume}
                    className="px-4 py-1.5 rounded-lg text-xs font-semibold glass-btn-primary text-white"
                  >
                    Save Resume Text
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
                {showJdEditor ? 'Hide Target Job Description' : 'Customize Target Job Description'}
              </button>
              <span className="text-[11px] text-[#565e74]">PDF, DOCX, DOC, TXT supported</span>
            </div>

            {showJdEditor && (
              <div className="space-y-2">
                <textarea
                  rows={4}
                  value={setupJdDraft}
                  onChange={(e) => {
                    setSetupJdDraft(e.target.value);
                    setJobDescriptionText(e.target.value);
                  }}
                  placeholder="Paste target Job Description..."
                  className="w-full glass-input rounded-xl p-3 text-xs font-mono text-[#0b1c30] outline-none"
                />
              </div>
            )}
          </section>
        </div>

        {/* Right Column: Launch Enclave Summary */}
        <div className="lg:col-span-4 flex flex-col gap-6 sticky top-20 text-left">
          <div className="glass-panel-elevated rounded-2xl p-6 flex flex-col gap-5">
            <div className="pb-3 border-b border-slate-200/70">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#3525cd]">
                Session Specifications
              </span>
              <h3 className="font-heading text-lg font-bold text-[#0b1c30] mt-0.5">
                Target Mock Overview
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-200/60 gap-2">
                <span className="text-[#565e74]">Target Role</span>
                <span data-testid="summary-target-role" className="font-semibold text-[#0b1c30] text-right">
                  {effectiveRoleLabel}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-200/60 gap-2">
                <span className="text-[#565e74]">Target Company</span>
                <span data-testid="summary-target-company" className="font-semibold text-[#0b1c30]">
                  {effectiveCompanyLabel}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-200/60 gap-2">
                <span className="text-[#565e74]">Interview Type</span>
                <span data-testid="summary-interview-type" className="font-semibold text-[#3525cd] text-right">
                  {INTERVIEW_TYPE_LABELS[interviewType]}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-[#565e74]">Seniority Bar</span>
                <span className="font-semibold text-[#0b1c30] capitalize">{difficulty.replace('-', ' ')}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-[#565e74]">Session Format</span>
                <span className="font-semibold text-[#0b1c30] tabular-nums">
                  {durationMinutes} mins · {questionCount} Topics
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-200/60 gap-2">
                <span className="text-[#565e74]">Uploaded Resume</span>
                <span className="font-semibold text-[#0b1c30] truncate max-w-[170px]">{resumeAnalysis.fileName}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-[#565e74]">Resume ATS Score</span>
                <span className={`font-bold tabular-nums ${atsBand.textClass}`}>{atsScore}/100</span>
              </div>

              <div className="flex justify-between py-1">
                <span className="text-[#565e74]">AI Voice Agent</span>
                <span className="font-semibold text-[#0b1c30]">
                  {aiPersona} ({voiceName})
                </span>
              </div>
            </div>

            <div className="p-3 glass-subcard rounded-xl text-xs text-[#464555] flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-[#3525cd] shrink-0 mt-0.5" />
              <span>
                When you start the live room, {aiPersona} reviews your <strong>{effectiveRoleLabel}</strong> track,{' '}
                {effectiveCompanyLabel} JD, and resume to plan the interview order live and ask real-time follow-ups.
              </span>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                data-testid="launch-interview-btn"
                onClick={handleLaunchSession}
                className="w-full py-3.5 rounded-xl glass-btn-primary text-white font-semibold text-sm flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Launch Live Mock Room</span>
              </button>

              <button
                type="button"
                onClick={handleResetDefaults}
                className="w-full py-2 rounded-xl glass-subcard hover:bg-white text-[#464555] text-xs font-semibold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap"
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
