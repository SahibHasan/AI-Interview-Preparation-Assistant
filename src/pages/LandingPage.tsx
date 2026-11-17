import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  PlayCircle,
  CheckCircle2,
  Bot,
  Mic,
  ShieldCheck,
  Target,
  Sparkles,
  BarChart3,
  Layers,
  Award,
  ChevronRight,
  GraduationCap,
  X,
  Plane,
} from 'lucide-react';
import { PublicNavbar } from '../components/layout/PublicNavbar';
import { ScrollReveal, GlassTiltCard3D } from '../components/common/MotionPrimitives';

export const LandingPage: React.FC = () => {
  const [demoModalOpen, setDemoModalOpen] = useState(false);

  return (
    <div className="min-h-screen glass-canvas text-[#0b1c30] flex flex-col antialiased">
      <PublicNavbar />

      <main className="w-full pt-20">
        {/* HERO SECTION */}
        <section className="relative w-full overflow-hidden py-12 lg:py-20">
          {/* Subtle crisp translucent ambient light planes (GPU composited, zero blur-3xl stalls) */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[920px] h-[440px] rounded-full opacity-55"
            style={{
              background:
                'radial-gradient(closest-side, rgba(79,70,229,0.16), rgba(56,189,248,0.08) 55%, transparent 100%)',
            }}
          />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
              {/* Announcement Strip */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-pill-bar mb-6 text-xs">
                <Sparkles className="w-3.5 h-3.5 text-[#4f46e5]" />
                <span className="text-[#3525cd] font-bold tracking-wide uppercase">
                  Copilot v2.4
                </span>
                <span className="text-[#777587]" aria-hidden="true">·</span>
                <span className="text-[#0b1c30] font-medium">
                  Neural Voice Coaching &amp; Rubric Scoring
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-[#3525cd]" />
              </div>

              {/* Headline */}
              <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#0b1c30] leading-[1.12]">
                Master High-Stakes Technical &amp; Leadership Interviews with{' '}
                <span className="bg-gradient-to-r from-[#3525cd] via-[#4f46e5] to-[#0284c7] bg-clip-text text-transparent">
                  Executive AI
                </span>
              </h1>

              {/* Subhead */}
              <p className="text-base sm:text-lg text-[#464555] max-w-2xl mt-5 mb-8 leading-relaxed">
                Upload your resume and target job description. Experience hyper-realistic mock loops with calibrated AI interviewers, live voice interrogation, and actionable rubric diagnostics.
              </p>

              {/* CTA Row */}
              <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                <Link
                  to="/register"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl glass-btn-primary text-white font-semibold text-sm whitespace-nowrap"
                >
                  <span>Start Free Mock Interview</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <button
                  onClick={() => setDemoModalOpen(true)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl glass-panel hover:bg-white/95 text-[#0b1c30] font-semibold text-sm transition-all duration-200 whitespace-nowrap"
                >
                  <PlayCircle className="w-5 h-5 text-[#4f46e5]" />
                  <span>Watch 2-Min Demo</span>
                </button>
              </div>

              {/* Micro Perks */}
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-[#464555] text-xs">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#4f46e5]" />
                  No credit card required
                </span>
                <span className="text-[#777587]" aria-hidden="true">·</span>
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#4f46e5]" />
                  Calibrated for L5–L8 loops
                </span>
                <span className="text-[#777587]" aria-hidden="true">·</span>
                <span className="flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-[#4f46e5]" />
                  5-minute diagnostic
                </span>
              </div>
            </div>

            {/* HERO VISUAL: 3D Translucent Glass Mock Simulator Window */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="mt-12 max-w-5xl mx-auto"
            >
              <GlassTiltCard3D intensity={2.5} hoverLift={4}>
                <div className="rounded-2xl glass-panel-elevated overflow-hidden">
                  {/* Window Header Bar */}
                  <div className="h-12 bg-white/65 backdrop-blur-md px-4 flex items-center justify-between border-b border-white/80">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-3 h-3 rounded-full bg-[#ef4444]/85 inline-block shrink-0" />
                      <span className="w-3 h-3 rounded-full bg-[#f59e0b]/85 inline-block shrink-0" />
                      <span className="w-3 h-3 rounded-full bg-[#10b981]/85 inline-block shrink-0" />
                      <span className="text-xs text-[#464555] font-medium ml-2 truncate">
                        Session #4092 · Distributed Consensus &amp; Raft Protocols
                      </span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[11px] font-mono font-semibold text-[#93000a] bg-[#ffdad6]/80 px-2.5 py-0.5 rounded-md tabular-nums">
                        LIVE REC · 18:24
                      </span>
                    </div>
                  </div>

                  {/* Dual Split Canvas inside Simulator */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[430px]">
                    {/* Left Pane: AI Interviewer & Voice Stream (7 cols) */}
                    <div className="lg:col-span-7 bg-gradient-to-br from-[#eff4ff]/70 to-white/40 p-6 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-white/75">
                      {/* Persona Header */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl glass-panel flex items-center justify-center">
                            <Bot className="w-6 h-6 text-[#3525cd]" />
                          </div>
                          <div className="text-left">
                            <div className="flex items-center gap-2 text-sm font-bold text-[#0b1c30]">
                              <span>Dr. Elena Vance</span>
                              <span className="text-[#777587] font-normal">·</span>
                              <span className="text-xs font-semibold text-[#3525cd]">AI Architect Persona</span>
                            </div>
                            <span className="text-xs text-[#464555]">
                              Calibrated: Stripe Staff Systems Rubric (L6+)
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl glass-subcard">
                          <Mic className="w-3.5 h-3.5 text-[#4f46e5]" />
                          <span className="text-xs font-mono font-semibold text-[#0b1c30]">Stereo 48kHz</span>
                        </div>
                      </div>

                      {/* Question Bubble & Waveform */}
                      <div className="my-6 flex flex-col gap-3">
                        <div className="p-4 rounded-2xl glass-panel text-left">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs text-[#3525cd] font-bold uppercase tracking-wider">
                              Interviewer Follow-Up
                            </span>
                            <span className="text-xs font-mono text-[#777587]">Just now</span>
                          </div>
                          <p className="text-sm text-[#0b1c30] font-medium leading-relaxed">
                            “You suggested splitting partition logs across three nodes. How does your Raft heartbeat threshold handle a temporary 800ms WAN jitter spike without false leader elections?”
                          </p>
                        </div>

                        {/* Live Voice Visualizer Bar */}
                        <div className="p-3.5 rounded-xl glass-subcard flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#4f46e5] shrink-0" />
                            <span className="text-xs font-semibold text-[#0b1c30] truncate">
                              Candidate Audio Stream (You)
                            </span>
                          </div>

                          {/* Crisp Waveform Bars */}
                          <div className="flex items-center gap-1 h-6 shrink-0">
                            {[12, 20, 9, 24, 15, 20, 10, 16].map((h, idx) => (
                              <motion.span
                                key={idx}
                                animate={{ scaleY: [0.6, 1.15, 0.75] }}
                                transition={{
                                  duration: 1.4,
                                  repeat: Infinity,
                                  repeatType: 'reverse',
                                  delay: idx * 0.12,
                                }}
                                className="w-1 bg-gradient-to-t from-[#4f46e5] to-[#0ea5e9] rounded-full origin-center"
                                style={{ height: `${h}px` }}
                              />
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Simulator Controls */}
                      <div className="flex items-center justify-between pt-2 text-xs text-[#464555]">
                        <span>Real-time neural voice synthesis</span>
                        <Link
                          to="/live-session"
                          className="text-[#3525cd] font-semibold hover:underline inline-flex items-center gap-1"
                        >
                          Enter Interactive Simulator
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>

                    {/* Right Pane: Live Telemetry & Rubric Monitor (5 cols) */}
                    <div className="lg:col-span-5 bg-white/55 backdrop-blur-md p-6 flex flex-col justify-between text-left">
                      <div>
                        <div className="flex items-center justify-between pb-3 border-b border-slate-200/70">
                          <span className="text-xs font-bold text-[#0b1c30] uppercase tracking-wider">
                            Live Rubric Telemetry
                          </span>
                          <span className="text-xs font-mono font-bold text-emerald-700">
                            86% Passing Bar
                          </span>
                        </div>

                        {/* Criteria Meters */}
                        <div className="mt-4 space-y-4">
                          <div>
                            <div className="flex justify-between text-xs mb-1.5">
                              <span className="text-[#464555]">Idempotency &amp; Failure Modes</span>
                              <span className="font-mono font-semibold text-[#0b1c30] tabular-nums">92%</span>
                            </div>
                            <div className="w-full bg-white/70 h-2 rounded-full overflow-hidden border border-white/80">
                              <div className="bg-gradient-to-r from-[#4f46e5] to-[#6366f1] h-full rounded-full" style={{ width: '92%' }} />
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-xs mb-1.5">
                              <span className="text-[#464555]">Partition Consensus &amp; Jitter</span>
                              <span className="font-mono font-semibold text-[#0b1c30] tabular-nums">74%</span>
                            </div>
                            <div className="w-full bg-white/70 h-2 rounded-full overflow-hidden border border-white/80">
                              <div className="bg-[#d97706] h-full rounded-full" style={{ width: '74%' }} />
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-xs mb-1.5">
                              <span className="text-[#464555]">STAR Framing &amp; Delivery Pace</span>
                              <span className="font-mono font-semibold text-[#0b1c30] tabular-nums">88%</span>
                            </div>
                            <div className="w-full bg-white/70 h-2 rounded-full overflow-hidden border border-white/80">
                              <div className="bg-gradient-to-r from-[#4f46e5] to-[#0ea5e9] h-full rounded-full" style={{ width: '88%' }} />
                            </div>
                          </div>
                        </div>

                        {/* Feedback Callout */}
                        <div className="mt-5 p-3.5 rounded-xl glass-subcard">
                          <div className="flex items-center gap-1.5 text-xs text-[#3525cd] font-bold mb-1">
                            <Sparkles className="w-3.5 h-3.5" />
                            Suggested Improvement
                          </div>
                          <p className="text-xs text-[#464555] leading-relaxed">
                            Mention explicit Pre-Vote RPCs to avoid split-brain elections during high packet latency windows.
                          </p>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-200/70 flex items-center justify-between">
                        <span className="text-xs text-[#777587]">Audited against 1,420+ Stripe L6 loops</span>
                        <Link
                          to="/evaluation-reports"
                          className="text-xs font-semibold text-[#4f46e5] hover:text-[#3525cd] whitespace-nowrap"
                        >
                          Sample Report →
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </GlassTiltCard3D>
            </motion.div>
          </div>
        </section>

        {/* FEATURES GRID SECTION */}
        <section id="features" className="py-20 border-y border-white/75 bg-white/35 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <ScrollReveal className="text-center max-w-3xl mx-auto mb-14">
              <span className="text-xs font-bold uppercase tracking-wider text-[#3525cd]">
                Full-Lifecycle Platform
              </span>
              <h2 className="font-heading text-3xl sm:text-4xl font-bold text-[#0b1c30] tracking-tight mt-2">
                Everything You Need from Resume Analysis to Offer Letter
              </h2>
              <p className="text-base text-[#464555] mt-3">
                Unlike generic prompts, PrepPilot AI builds a continuous candidate graph connecting your real resume, target role description, live interview practice, and customized drills.
              </p>
            </ScrollReveal>

            <ScrollReveal delay={0.06} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7 text-left">
              {[
                {
                  icon: Target,
                  bg: 'from-[#4f46e5] to-[#3730a3]',
                  title: 'Resume & JD Gap Intelligence',
                  desc: 'Parse candidate projects, skills, and work history. Benchmark against target job specifications to uncover matched strengths and critical competency voids.',
                  link: '/resume-job-match',
                  cta: 'Try Resume Analyzer',
                },
                {
                  icon: Bot,
                  bg: 'from-[#3525cd] to-[#4f46e5]',
                  title: 'Calibrated Mock Interview Loops',
                  desc: 'Simulate technical architecture, coding problem decomposition, behavioral STAR, and executive bar-raiser interview sessions with adaptive follow-up questions.',
                  link: '/interview-setup',
                  cta: 'Configure a Session',
                },
                {
                  icon: BarChart3,
                  bg: 'from-[#004c76] to-[#0284c7]',
                  title: 'Rubric-Based Evaluation Reports',
                  desc: 'Get quantitative category scores for technical correctness, problem decomposition, communication structure, and trade-off analysis with exemplar answers.',
                  link: '/evaluation-reports',
                  cta: 'View Sample Scorecard',
                },
                {
                  icon: GraduationCap,
                  bg: 'from-[#4f46e5] to-[#6366f1]',
                  title: 'Adaptive Learning Roadmap',
                  desc: 'Converts your real weaknesses into targeted learning modules and hands-on drills. Track progress directly toward your upcoming onsite loop.',
                  link: '/learning-plan',
                  cta: 'Explore Learning Plan',
                },
                {
                  icon: Layers,
                  bg: 'from-[#00659a] to-[#0ea5e9]',
                  title: 'Longitudinal Performance Analytics',
                  desc: 'Track score trends across multiple sessions. Filter by company track (Stripe, Meta, Google) or domain (System Architecture, STAR Behavioral).',
                  link: '/analytics-history',
                  cta: 'Browse Analytics',
                },
                {
                  icon: Award,
                  bg: 'from-[#3525cd] to-[#004c76]',
                  title: 'Candidate Profile & Isolation',
                  desc: 'Strict user-level data isolation. Keep your resumes, evaluations, and mock transcripts private, with exportable PDF, DOCX, and JSON dossiers.',
                  link: '/profile-settings',
                  cta: 'Review Security & Settings',
                },
              ].map((feat) => {
                const Icon = feat.icon;
                return (
                  <GlassTiltCard3D key={feat.title} intensity={4} hoverLift={4}>
                    <div className="glass-panel rounded-2xl p-6 h-full flex flex-col justify-between">
                      <div>
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feat.bg} text-white flex items-center justify-center mb-5 shadow-md`}>
                          <Icon className="w-6 h-6" />
                        </div>
                        <h3 className="font-heading text-lg font-bold text-[#0b1c30] mb-2">
                          {feat.title}
                        </h3>
                        <p className="text-sm text-[#464555] leading-relaxed mb-5">
                          {feat.desc}
                        </p>
                      </div>
                      <Link
                        to={feat.link}
                        className="text-sm font-semibold text-[#4f46e5] hover:text-[#3525cd] inline-flex items-center gap-1"
                      >
                        <span>{feat.cta}</span>
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </GlassTiltCard3D>
                );
              })}
            </ScrollReveal>
          </div>
        </section>

        {/* HOW IT WORKS SECTION */}
        <section id="how-it-works" className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <ScrollReveal className="text-center max-w-2xl mx-auto mb-14">
              <span className="text-xs font-bold uppercase tracking-wider text-[#3525cd]">
                Step-by-Step Workflow
              </span>
              <h2 className="font-heading text-3xl sm:text-4xl font-bold text-[#0b1c30] tracking-tight mt-2">
                How PrepPilot AI Prepares You
              </h2>
            </ScrollReveal>

            <ScrollReveal delay={0.06} className="grid grid-cols-1 md:grid-cols-4 gap-6 text-left">
              {[
                {
                  num: '01',
                  title: 'Upload Resume & JD',
                  desc: 'Extract core skills, experiences, and match them against required job qualifications.',
                },
                {
                  num: '02',
                  title: 'Configure Target Mock',
                  desc: 'Choose track, level (L4-L7), duration, and AI interviewer persona tailored to your target company.',
                },
                {
                  num: '03',
                  title: 'Simulate Real Interview',
                  desc: 'Engage in natural verbal interviews with neural AI voice, live transcription, and real-time follow-ups.',
                },
                {
                  num: '04',
                  title: 'Review & Drill Roadmap',
                  desc: 'Receive structured rubric scores, pinpoint missing concepts, and complete targeted curriculum drills.',
                },
              ].map((step) => (
                <GlassTiltCard3D key={step.num} intensity={4} hoverLift={3}>
                  <div className="glass-panel p-6 rounded-2xl h-full">
                    <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-[#eff4ff] border border-white text-lg font-heading font-bold text-[#4f46e5] font-mono">
                      {step.num}
                    </span>
                    <h4 className="font-heading text-base font-bold text-[#0b1c30] mt-4 mb-1.5">
                      {step.title}
                    </h4>
                    <p className="text-xs text-[#464555] leading-relaxed">{step.desc}</p>
                  </div>
                </GlassTiltCard3D>
              ))}
            </ScrollReveal>
          </div>
        </section>

        {/* BOTTOM CTA SECTION */}
        <section id="roles" className="py-20 glass-dark text-white relative overflow-hidden">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
            <span className="text-xs font-bold uppercase tracking-wider text-[#a5b4fc]">
              Launch Your Preparation
            </span>
            <h2 className="font-heading text-3xl sm:text-5xl font-extrabold tracking-tight text-white mt-3 max-w-3xl mx-auto">
              Ready to Accelerate Your Engineering Career?
            </h2>
            <p className="text-base text-[#94a3b8] max-w-2xl mx-auto mt-4 mb-8">
              Prepare with calibrated mock interviews, real-time speech coaching, and role-specific evaluation rubrics.
            </p>

            <div id="rubrics" className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/register"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl glass-btn-primary text-white font-semibold text-sm whitespace-nowrap"
              >
                <span>Get Started Free</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/dashboard"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-white border border-white/15 font-semibold text-sm transition-all whitespace-nowrap"
              >
                <span>Explore Candidate Console</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="bg-[#091120] text-[#94a3b8] py-12 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg glass-btn-primary flex items-center justify-center text-white">
              <Plane className="w-4 h-4" />
            </div>
            <span className="font-heading text-base font-bold text-white tracking-tight">
              PrepPilot AI
            </span>
            <span className="text-xs text-[#64748b]">· B.Tech Computer Science Project</span>
          </div>

          <div className="flex items-center gap-6 text-xs flex-wrap justify-center">
            <Link to="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
            <Link to="/resume-job-match" className="hover:text-white transition-colors">Resume Match</Link>
            <Link to="/interview-setup" className="hover:text-white transition-colors">Interview Setup</Link>
            <Link to="/evaluation-reports" className="hover:text-white transition-colors">Scorecard</Link>
            <Link to="/profile-settings" className="hover:text-white transition-colors">Privacy &amp; Enclave</Link>
          </div>

          <p className="text-xs text-[#64748b]">
            © {new Date().getFullYear()} PrepPilot AI. Engineering interview preparation platform.
          </p>
        </div>
      </footer>

      {/* 2-Min Demo Modal */}
      {demoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm">
          <div className="glass-panel-elevated rounded-2xl max-w-2xl w-full p-6 relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/70">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#4f46e5]" />
                <h3 className="font-heading text-lg font-bold text-[#0b1c30]">
                  PrepPilot AI Interactive Simulation Demo
                </h3>
              </div>
              <button
                onClick={() => setDemoModalOpen(false)}
                className="p-1.5 text-[#565e74] hover:text-[#0b1c30] rounded-lg hover:bg-white/70"
                aria-label="Close demo dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-5 p-6 rounded-2xl glass-dark text-white flex flex-col items-center justify-center text-center gap-4 min-h-[260px]">
              <div className="w-16 h-16 rounded-full bg-[#4f46e5]/25 text-[#c3c0ff] flex items-center justify-center border border-[#4f46e5]/40">
                <PlayCircle className="w-8 h-8" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Experience PrepPilot in Real Time</p>
                <p className="text-xs text-[#94a3b8] max-w-md mt-1">
                  Jump directly into the live verbal interview console, test resume parsing, and inspect evaluation scorecards.
                </p>
              </div>

              <div className="flex items-center gap-3 mt-2">
                <Link
                  to="/live-session"
                  onClick={() => setDemoModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl glass-btn-primary text-white font-semibold text-xs whitespace-nowrap"
                >
                  Launch Live Mock Room
                </Link>
                <Link
                  to="/dashboard"
                  onClick={() => setDemoModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-white/[0.1] hover:bg-white/[0.18] text-white font-semibold text-xs border border-white/15 transition-colors whitespace-nowrap"
                >
                  Open Candidate Console
                </Link>
              </div>
            </div>

            <div className="text-center text-xs text-[#565e74]">
              Simulates authentic audio streams, verbal interrogation, and calibrated rubric feedback.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
