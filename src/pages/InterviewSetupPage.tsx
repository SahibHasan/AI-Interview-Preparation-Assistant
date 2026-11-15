import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Code,
  Users,
  Building,
  Terminal,
  Clock,
  Mic,
  Play,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  CheckCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';

export const InterviewSetupPage: React.FC = () => {
  const { interviewSetup, updateInterviewSetup, resetInterviewSession } = useApp();
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

  const rolePresets = [
    'Senior Frontend Engineer',
    'Full Stack Engineer',
    'System Architect',
    'Backend Systems Engineer',
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
      message: `Reviewing your resume & ${targetCompany} JD to plan topic order with ${aiPersona}.`,
      type: 'info',
    });
    navigate('/live-session');
  };

  const handleResetDefaults = () => {
    hasEditedRoleRef.current = true;
    hasEditedCompanyRef.current = true;
    setTargetRole('Senior Frontend Engineer');
    setTargetCompany('Stripe');
    setInterviewType('technical');
    setDifficulty('senior-staff');
    setDurationMinutes(45);
    setQuestionCount(5);
    setAiPersona('Sarah');
    setVoiceName('Kore');
    showToast({
      title: 'Defaults Restored',
      message: 'Reset target track to Stripe Senior Frontend Engineer (L6 Staff Track).',
      type: 'info',
    });
  };

  return (
    <div className="flex flex-col w-full gap-6 pb-12 antialiased">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-[#565e74] uppercase tracking-wider font-semibold mb-1">
            <span>Platform</span>
            <span>•</span>
            <span className="text-[#3525cd]">Interview Setup</span>
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-[#0b1c30] tracking-tight">
            Configure Your AI Mock Interview
          </h1>
          <p className="text-sm text-[#464555] mt-1">
            Personalize the interview scenario to match your upcoming real-world interview.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-[#eff4ff] px-3.5 py-1.5 rounded-full border border-[#c7c4d8]/40 self-start md:self-auto">
          <span className="w-2 h-2 rounded-full bg-[#4f46e5] animate-pulse" />
          <span className="text-xs font-semibold text-[#0b1c30] uppercase tracking-wider">
            Setup Phase • Active Session Draft
          </span>
        </div>
      </div>

      {/* Main Grid: Steps (8 cols) + Summary Card (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Configuration Steps */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* STEP 1: Target Role & Company */}
          <section className="bg-white rounded-xl p-6 border border-[#e2e8f0] shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-7 h-7 rounded-lg bg-[#eff4ff] text-[#3525cd] flex items-center justify-center font-bold text-xs">
                1
              </div>
              <div>
                <h2 className="font-heading text-base font-bold text-[#0b1c30]">
                  Target Job Role &amp; Organization
                </h2>
                <p className="text-xs text-[#565e74]">
                  Calibrates the AI model's benchmark criteria and company-specific question rubrics.
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
                  }}
                  className="w-full bg-[#f8f9ff] border border-[#e2e8f0] rounded-lg px-3.5 py-2.5 text-sm text-[#0b1c30] font-medium focus:outline-none focus:ring-2 focus:ring-[#4f46e5]"
                  placeholder="e.g. Senior Frontend Engineer"
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
                  }}
                  className="w-full bg-[#f8f9ff] border border-[#e2e8f0] rounded-lg px-3.5 py-2.5 text-sm text-[#0b1c30] font-medium focus:outline-none focus:ring-2 focus:ring-[#4f46e5]"
                  placeholder="e.g. Stripe, OpenAI, Datadog"
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

          {/* STEP 2: Interview Type & Focus Area */}
          <section className="bg-white rounded-xl p-6 border border-[#e2e8f0] shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-7 h-7 rounded-lg bg-[#eff4ff] text-[#3525cd] flex items-center justify-center font-bold text-xs">
                2
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
              {/* Type 1: Technical & System Architecture */}
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
                  Technical &amp; System Architecture
                </h3>
                <p className="text-xs text-[#565e74] mt-1 leading-relaxed">
                  Deep dive into code architecture, state synchronization, client-side performance, and fault-tolerant API design.
                </p>
                <div className="mt-3 flex items-center gap-1 text-[11px] text-[#3525cd] font-semibold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Recommended for {targetCompany}</span>
                </div>
              </div>

              {/* Type 2: Behavioral & Leadership STAR */}
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
                  Evaluate cross-functional stakeholder conflict, mentorship impact, delivery setbacks, and organizational influence.
                </p>
                <div className="mt-3 text-[11px] text-[#565e74]">
                  Evaluates STAR structure &amp; executive presence
                </div>
              </div>

              {/* Type 3: System Design */}
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
                  Partitioning, database sharding, caching tiers, consensus, rate limiters, and backpressure management.
                </p>
                <div className="mt-3 text-[11px] text-[#565e74]">
                  High-scale infrastructure bar
                </div>
              </div>

              {/* Type 4: HR & Cultural Alignment */}
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
                  Career trajectory, compensation negotiation, operating principles, and company cultural pillars.
                </p>
                <div className="mt-3 text-[11px] text-[#565e74]">
                  Hiring manager screening round
                </div>
              </div>
            </div>
          </section>

          {/* STEP 3: Experience Level & Difficulty */}
          <section className="bg-white rounded-xl p-6 border border-[#e2e8f0] shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-7 h-7 rounded-lg bg-[#eff4ff] text-[#3525cd] flex items-center justify-center font-bold text-xs">
                3
              </div>
              <div>
                <h2 className="font-heading text-base font-bold text-[#0b1c30]">
                  Seniority Level &amp; Bar Calibration
                </h2>
                <p className="text-xs text-[#565e74]">
                  Adjusts question difficulty, edge case scrutiny, and expected depth.
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
          </section>

          {/* STEP 4: Mode, Duration & Questions */}
          <section className="bg-white rounded-xl p-6 border border-[#e2e8f0] shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-7 h-7 rounded-lg bg-[#eff4ff] text-[#3525cd] flex items-center justify-center font-bold text-xs">
                4
              </div>
              <div>
                <h2 className="font-heading text-base font-bold text-[#0b1c30]">
                  Session Duration &amp; Interaction Mode
                </h2>
                <p className="text-xs text-[#565e74]">
                  Configure pace, question volume, and microphone input support.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Verbal Interaction Mode */}
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
                <span className="text-[11px] text-[#777587] mt-2 block">
                  AI reviews your role, JD &amp; resume first, greets you, shares the planned topic order, and interviews verbally.
                </span>
              </div>

              {/* Duration and Questions */}
              <div className="p-4 bg-[#f8f9ff] rounded-xl border border-[#e2e8f0] flex flex-col justify-between">
                <div>
                  <label className="text-xs font-semibold text-[#0b1c30] block mb-2">
                    Session Length &amp; Question Depth
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
                          durationMinutes === opt.mins
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
                  Includes 10m deep-dive + adaptive AI follow-up prompts.
                </span>
              </div>
            </div>
          </section>

          {/* STEP 5: AI Interviewer Persona */}
          <section className="bg-white rounded-xl p-6 border border-[#e2e8f0] shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-7 h-7 rounded-lg bg-[#eff4ff] text-[#3525cd] flex items-center justify-center font-bold text-xs">
                5
              </div>
              <div>
                <h2 className="font-heading text-base font-bold text-[#0b1c30]">
                  AI Interviewer Persona
                </h2>
                <p className="text-xs text-[#565e74]">
                  Tailor the interviewer persona style to match the interview tone.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                {
                  name: 'Sarah',
                  role: 'Principal Systems Architect',
                  style: 'Methodical & Bar-Raiser',
                  desc: 'Probes edge-case resilience, partition consensus, and state failure recovery.',
                },
                {
                  name: 'Dr. Elena Vance',
                  role: 'AI Infrastructure Lead',
                  style: 'Analytical & Thorough',
                  desc: 'Evaluates architectural tradeoffs, concurrency primitives, and clean code hygiene.',
                },
                {
                  name: 'Marcus Reed',
                  role: 'Engineering Director',
                  style: 'Executive & Strategic',
                  desc: 'Focuses on cross-team consensus, technical debt tradeoffs, and business KPIs.',
                },
                {
                  name: 'David Chen',
                  role: 'Staff Frontend Lead',
                  style: 'Hands-on & Collaborative',
                  desc: 'Examines rendering performance, Web Vitals, and responsive component architecture.',
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
        <div className="lg:col-span-4 flex flex-col gap-6 sticky top-20">
          <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm p-6 flex flex-col gap-5">
            <div className="pb-3 border-b border-[#e2e8f0]">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#3525cd]">
                Session Specifications
              </span>
              <h3 className="font-heading text-lg font-bold text-[#0b1c30] mt-0.5">
                Target Mock Overview
              </h3>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="flex justify-between py-1 border-b border-[#f1f5f9]">
                <span className="text-[#565e74]">Target Track</span>
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
                <span className="text-[#565e74]">Difficulty Bar</span>
                <span className="font-semibold text-[#0b1c30] capitalize">{difficulty.replace('-', ' ')}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-[#f1f5f9]">
                <span className="text-[#565e74]">Session Format</span>
                <span className="font-semibold text-[#0b1c30]">{durationMinutes} mins • {questionCount} Questions</span>
              </div>

              <div className="flex justify-between py-1 border-b border-[#f1f5f9]">
                <span className="text-[#565e74]">Interviewer Persona</span>
                <span className="font-semibold text-[#0b1c30]">{aiPersona}</span>
              </div>

              <div className="flex justify-between py-1">
                <span className="text-[#565e74]">Input Mode</span>
                <span className="font-semibold text-[#0b1c30]">Verbal Voice Only ({voiceName})</span>
              </div>
            </div>

            <div className="p-3 bg-[#eff4ff] rounded-lg border border-[#c7c4d8]/40 text-xs text-[#565e74] flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-[#3525cd] shrink-0 mt-0.5" />
              <span>Session questions are calibrated against verified company rubric weights and personal resume gap data.</span>
            </div>

            {/* Launch CTA */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
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
