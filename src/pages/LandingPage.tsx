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
import { ScrollReveal } from '../components/common/MotionPrimitives';

export const LandingPage: React.FC = () => {
  const [demoModalOpen, setDemoModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30] flex flex-col antialiased">
      <PublicNavbar />

      <main className="w-full pt-20">
        {/* HERO SECTION */}
        <section className="relative w-full overflow-hidden bg-[#f8f9ff] py-12 lg:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
              {/* Announcement Banner */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg bg-[#dae2fd]/60 border border-[#c7c4d8]/50 shadow-xs mb-6">
                <span className="w-2 h-2 rounded-full bg-[#4f46e5]" />
                <span className="text-xs text-[#3525cd] font-semibold tracking-wide uppercase">
                  Copilot v2.4 Release
                </span>
                <span className="text-[#777587] text-xs">•</span>
                <span className="text-xs text-[#0b1c30] font-medium">
                  Neural Voice Coaching &amp; Rubric Scoring
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-[#3525cd]" />
              </div>

              {/* Headline */}
              <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#0b1c30] leading-[1.15]">
                Master High-Stakes Technical &amp; Leadership Interviews with{' '}
                <span className="text-[#4f46e5]">Executive AI</span>
              </h1>

              {/* Subhead */}
              <p className="text-base sm:text-lg text-[#464555] max-w-2xl mt-5 mb-8 leading-relaxed">
                Upload your resume and target job description. Experience hyper-realistic mock loops with calibrated AI interviewers, live voice interrogation, and actionable rubric diagnostics.
              </p>

              {/* CTA Row */}
              <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                <Link
                  to="/register"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-lg bg-[#4f46e5] hover:bg-[#3525cd] text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all duration-200"
                >
                  <span>Start Free Mock Interview</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <button
                  onClick={() => setDemoModalOpen(true)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-white hover:bg-[#eff4ff] text-[#0b1c30] border border-[#e2e8f0] font-semibold text-sm shadow-sm transition-all duration-200"
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
                <span className="text-[#777587]">•</span>
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#4f46e5]" />
                  Calibrated for L5–L8 loops
                </span>
                <span className="text-[#777587]">•</span>
                <span className="flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-[#4f46e5]" />
                  5-minute diagnostic
                </span>
              </div>
            </div>

            {/* HERO VISUAL: Mock Simulator Window matching Stitch */}
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="mt-12 max-w-5xl mx-auto"
            >
              <div className="rounded-xl shadow-xl bg-white border border-[#e2e8f0] overflow-hidden">
                {/* Window Header Bar */}
                <div className="h-11 bg-[#e5eeff] px-4 flex items-center justify-between border-b border-[#c7c4d8]/40">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#ba1a1a]/80 inline-block" />
                    <span className="w-3 h-3 rounded-full bg-[#d97706]/80 inline-block" />
                    <span className="w-3 h-3 rounded-full bg-[#059669]/80 inline-block" />
                    <span className="text-xs text-[#464555] font-medium ml-2">
                      Session #4092: Distributed Consensus &amp; Raft Protocols
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#ffdad6] text-[#93000a] text-xs font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#ba1a1a]" />
                      LIVE REC • 18:24
                    </span>
                  </div>
                </div>

                {/* Dual Split Canvas inside Simulator */}
                <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[440px]">
                  {/* Left Pane: AI Interviewer & Voice Stream (7 cols) */}
                  <div className="lg:col-span-7 bg-[#eff4ff]/60 p-6 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-[#e2e8f0]">
                    {/* Persona Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center border border-[#e2e8f0]">
                          <Bot className="w-6 h-6 text-[#3525cd]" />
                        </div>
                        <div className="text-left">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-[#0b1c30]">Dr. Elena Vance</span>
                            <span className="px-2 py-0.5 rounded-full bg-[#dae2fd] text-[#3525cd] text-[11px] font-semibold">
                              AI Architect Persona
                            </span>
                          </div>
                          <span className="text-xs text-[#464555]">
                            Calibrated: Stripe Staff Systems Rubric (L6+)
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-white border border-[#e2e8f0] shadow-sm">
                        <Mic className="w-3.5 h-3.5 text-[#4f46e5]" />
                        <span className="text-xs font-semibold text-[#0b1c30]">Stereo 48kHz</span>
                      </div>
                    </div>

                    {/* Question Bubble & Waveform */}
                    <div className="my-6 flex flex-col gap-3">
                      <div className="p-4 rounded-xl bg-white border border-[#e2e8f0] shadow-sm">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-[#3525cd] font-bold uppercase tracking-wider">
                            Interviewer Follow-Up
                          </span>
                          <span className="text-xs text-[#777587]">Just now</span>
                        </div>
                        <p className="text-sm text-[#0b1c30] font-medium leading-relaxed">
                          “You suggested splitting partition logs across three nodes. How does your Raft heartbeat threshold handle a temporary 800ms WAN jitter spike without false leader elections?”
                        </p>
                      </div>

                      {/* Live Voice Visualizer Bar */}
                      <div className="p-3 rounded-lg bg-white/90 border border-[#e2e8f0] shadow-sm flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#4f46e5] shrink-0" />
                          <span className="text-xs font-medium text-[#0b1c30] truncate">
                            Candidate Audio Stream (You)
                          </span>
                        </div>

                        {/* Minimal Waveform Bars */}
                        <div className="flex items-center gap-1 h-6 shrink-0">
                          <span className="w-1 h-3 bg-[#4f46e5] rounded-full" />
                          <span className="w-1 h-5 bg-[#4f46e5] rounded-full" />
                          <span className="w-1 h-2 bg-[#4f46e5] rounded-full" />
                          <span className="w-1 h-6 bg-[#4f46e5] rounded-full" />
                          <span className="w-1 h-4 bg-[#4f46e5] rounded-full" />
                          <span className="w-1 h-5 bg-[#4f46e5] rounded-full" />
                          <span className="w-1 h-2 bg-[#4f46e5] rounded-full" />
                          <span className="w-1 h-4 bg-[#4f46e5] rounded-full" />
                        </div>
                      </div>
                    </div>

                    {/* Simulator Controls */}
                    <div className="flex items-center justify-between pt-2 text-xs text-[#464555]">
                      <span>Real-time voice synthesis</span>
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
                  <div className="lg:col-span-5 bg-white p-6 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between pb-3 border-b border-[#e2e8f0]">
                        <span className="text-xs font-bold text-[#0b1c30] uppercase tracking-wider">
                          Live Rubric Telemetry
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold">
                          86% Passing Bar
                        </span>
                      </div>

                      {/* Criteria Meters */}
                      <div className="mt-4 space-y-4">
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-[#464555]">Idempotency &amp; Failure Modes</span>
                            <span className="font-semibold text-[#0b1c30]">92%</span>
                          </div>
                          <div className="w-full bg-[#eff4ff] h-1.5 rounded-full overflow-hidden">
                            <div className="bg-[#4f46e5] h-full rounded-full" style={{ width: '92%' }} />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-[#464555]">Partition Consensus &amp; Jitter</span>
                            <span className="font-semibold text-[#0b1c30]">74%</span>
                          </div>
                          <div className="w-full bg-[#eff4ff] h-1.5 rounded-full overflow-hidden">
                            <div className="bg-[#d97706] h-full rounded-full" style={{ width: '74%' }} />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-[#464555]">STAR Framing &amp; Delivery Pace</span>
                            <span className="font-semibold text-[#0b1c30]">88%</span>
                          </div>
                          <div className="w-full bg-[#eff4ff] h-1.5 rounded-full overflow-hidden">
                            <div className="bg-[#4f46e5] h-full rounded-full" style={{ width: '88%' }} />
                          </div>
                        </div>
                      </div>

                      {/* Feedback Callout */}
                      <div className="mt-5 p-3 rounded-lg bg-[#eff4ff] border border-[#c7c4d8]/40">
                        <div className="flex items-center gap-1.5 text-xs text-[#3525cd] font-bold mb-1">
                          <Sparkles className="w-3.5 h-3.5" />
                          Suggested Improvement
                        </div>
                        <p className="text-xs text-[#464555] leading-relaxed">
                          Mention explicit Pre-Vote RPCs to avoid split-brain elections during high packet latency windows.
                        </p>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-[#e2e8f0] flex items-center justify-between">
                      <span className="text-xs text-[#777587]">Audited against 1,420+ Stripe L6 loops</span>
                      <Link
                        to="/evaluation-reports"
                        className="text-xs font-semibold text-[#4f46e5] hover:text-[#3525cd]"
                      >
                        Sample Report →
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* FEATURES GRID SECTION */}
        <section id="features" className="py-20 bg-white border-y border-[#e2e8f0]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <ScrollReveal className="text-center max-w-3xl mx-auto mb-16">
              <span className="text-xs font-bold uppercase tracking-wider text-[#3525cd] bg-[#eff4ff] px-3 py-1 rounded-full">
                Full-Lifecycle Platform
              </span>
              <h2 className="font-heading text-3xl sm:text-4xl font-bold text-[#0b1c30] tracking-tight mt-3">
                Everything You Need from Resume Analysis to Offer Letter
              </h2>
              <p className="text-base text-[#464555] mt-3">
                Unlike generic ChatGPT prompts, PrepPilot AI builds a continuous candidate graph that connects your real resume, your target role description, live interview practice, and customized drills.
              </p>
            </ScrollReveal>

            <ScrollReveal delay={0.08} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="bg-[#f8f9ff] rounded-xl p-6 border border-[#e2e8f0] shadow-sm hover:shadow-md transition-all">
                <div className="w-12 h-12 rounded-lg bg-[#4f46e5] text-white flex items-center justify-center mb-5 shadow-sm">
                  <Target className="w-6 h-6" />
                </div>
                <h3 className="font-heading text-lg font-bold text-[#0b1c30] mb-2">
                  Resume &amp; JD Gap Intelligence
                </h3>
                <p className="text-sm text-[#464555] leading-relaxed mb-4">
                  Parse candidate projects, skills, and work history. Benchmark against target job specifications to uncover matched strengths and critical competency voids.
                </p>
                <Link to="/resume-job-match" className="text-sm font-semibold text-[#4f46e5] hover:text-[#3525cd] inline-flex items-center gap-1">
                  Try Resume Analyzer <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              {/* Feature 2 */}
              <div className="bg-[#f8f9ff] rounded-xl p-6 border border-[#e2e8f0] shadow-sm hover:shadow-md transition-all">
                <div className="w-12 h-12 rounded-lg bg-[#3525cd] text-white flex items-center justify-center mb-5 shadow-sm">
                  <Bot className="w-6 h-6" />
                </div>
                <h3 className="font-heading text-lg font-bold text-[#0b1c30] mb-2">
                  Calibrated Mock Interview Loops
                </h3>
                <p className="text-sm text-[#464555] leading-relaxed mb-4">
                  Simulate technical architecture, coding problem decomposition, behavioral STAR, and executive bar-raiser interview sessions with adaptive follow-up questions.
                </p>
                <Link to="/interview-setup" className="text-sm font-semibold text-[#4f46e5] hover:text-[#3525cd] inline-flex items-center gap-1">
                  Configure a Session <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              {/* Feature 3 */}
              <div className="bg-[#f8f9ff] rounded-xl p-6 border border-[#e2e8f0] shadow-sm hover:shadow-md transition-all">
                <div className="w-12 h-12 rounded-lg bg-[#004c76] text-white flex items-center justify-center mb-5 shadow-sm">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <h3 className="font-heading text-lg font-bold text-[#0b1c30] mb-2">
                  Rubric-Based Evaluation Reports
                </h3>
                <p className="text-sm text-[#464555] leading-relaxed mb-4">
                  Get quantitative category scores for technical correctness, problem decomposition, communication structure, and trade-off analysis with exemplar answers.
                </p>
                <Link to="/evaluation-reports" className="text-sm font-semibold text-[#4f46e5] hover:text-[#3525cd] inline-flex items-center gap-1">
                  View Sample Scorecard <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              {/* Feature 4 */}
              <div className="bg-[#f8f9ff] rounded-xl p-6 border border-[#e2e8f0] shadow-sm hover:shadow-md transition-all">
                <div className="w-12 h-12 rounded-lg bg-[#4f46e5] text-white flex items-center justify-center mb-5 shadow-sm">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <h3 className="font-heading text-lg font-bold text-[#0b1c30] mb-2">
                  Adaptive Learning Roadmap
                </h3>
                <p className="text-sm text-[#464555] leading-relaxed mb-4">
                  Converts your real weaknesses into targeted learning modules and hands-on drills. Track progress directly toward your upcoming onsite loop.
                </p>
                <Link to="/learning-plan" className="text-sm font-semibold text-[#4f46e5] hover:text-[#3525cd] inline-flex items-center gap-1">
                  Explore Learning Plan <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              {/* Feature 5 */}
              <div className="bg-[#f8f9ff] rounded-xl p-6 border border-[#e2e8f0] shadow-sm hover:shadow-md transition-all">
                <div className="w-12 h-12 rounded-lg bg-[#00659a] text-white flex items-center justify-center mb-5 shadow-sm">
                  <Layers className="w-6 h-6" />
                </div>
                <h3 className="font-heading text-lg font-bold text-[#0b1c30] mb-2">
                  Longitudinal Performance Analytics
                </h3>
                <p className="text-sm text-[#464555] leading-relaxed mb-4">
                  Track score trends across multiple sessions. Filter by company track (Stripe, Meta, Google) or domain (System Architecture, STAR Behavioral).
                </p>
                <Link to="/analytics-history" className="text-sm font-semibold text-[#4f46e5] hover:text-[#3525cd] inline-flex items-center gap-1">
                  Browse Analytics <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              {/* Feature 6 */}
              <div className="bg-[#f8f9ff] rounded-xl p-6 border border-[#e2e8f0] shadow-sm hover:shadow-md transition-all">
                <div className="w-12 h-12 rounded-lg bg-[#3525cd] text-white flex items-center justify-center mb-5 shadow-sm">
                  <Award className="w-6 h-6" />
                </div>
                <h3 className="font-heading text-lg font-bold text-[#0b1c30] mb-2">
                  Candidate Profile &amp; Isolation
                </h3>
                <p className="text-sm text-[#464555] leading-relaxed mb-4">
                  Strict user-level data isolation. Keep your resumes, evaluations, and mock transcripts private, with exportable JSON dossiers and granular preferences.
                </p>
                <Link to="/profile-settings" className="text-sm font-semibold text-[#4f46e5] hover:text-[#3525cd] inline-flex items-center gap-1">
                  Review Security &amp; Settings <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* HOW IT WORKS SECTION */}
        <section id="how-it-works" className="py-20 bg-[#f8f9ff]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <ScrollReveal className="text-center max-w-2xl mx-auto mb-16">
              <span className="text-xs font-bold uppercase tracking-wider text-[#3525cd] bg-[#eff4ff] px-3 py-1 rounded-full">
                Step-by-Step Workflow
              </span>
              <h2 className="font-heading text-3xl sm:text-4xl font-bold text-[#0b1c30] tracking-tight mt-3">
                How PrepPilot AI Prepares You
              </h2>
            </ScrollReveal>

            <ScrollReveal delay={0.08} className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-xl border border-[#e2e8f0] shadow-sm relative">
                <span className="text-2xl font-bold text-[#4f46e5]">01</span>
                <h4 className="font-heading text-base font-bold text-[#0b1c30] mt-3 mb-1">Upload Resume &amp; JD</h4>
                <p className="text-xs text-[#464555] leading-relaxed">
                  Extract core skills, experiences, and match them against required job qualifications.
                </p>
              </div>

              <div className="bg-white p-6 rounded-xl border border-[#e2e8f0] shadow-sm relative">
                <span className="text-2xl font-bold text-[#4f46e5]">02</span>
                <h4 className="font-heading text-base font-bold text-[#0b1c30] mt-3 mb-1">Configure Target Mock</h4>
                <p className="text-xs text-[#464555] leading-relaxed">
                  Choose track, level (L4-L7), duration, and AI interviewer persona tailored to your target company.
                </p>
              </div>

              <div className="bg-white p-6 rounded-xl border border-[#e2e8f0] shadow-sm relative">
                <span className="text-2xl font-bold text-[#4f46e5]">03</span>
                <h4 className="font-heading text-base font-bold text-[#0b1c30] mt-3 mb-1">Simulate Real Interview</h4>
                <p className="text-xs text-[#464555] leading-relaxed">
                  Engage in natural verbal interviews with neural AI voice, live transcription, and real-time follow-ups.
                </p>
              </div>

              <div className="bg-white p-6 rounded-xl border border-[#e2e8f0] shadow-sm relative">
                <span className="text-2xl font-bold text-[#4f46e5]">04</span>
                <h4 className="font-heading text-base font-bold text-[#0b1c30] mt-3 mb-1">Review &amp; Drill Roadmap</h4>
                <p className="text-xs text-[#464555] leading-relaxed">
                  Receive structured rubric scores, pinpoint missing concepts, and complete targeted curriculum drills.
                </p>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* BOTTOM CTA SECTION */}
        <section className="py-20 bg-[#0f172a] text-white relative overflow-hidden">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
            <span className="px-3 py-1 rounded-full bg-[#334155] text-[#c3c0ff] text-xs font-semibold uppercase tracking-wider">
              Launch Your Preparation
            </span>
            <h2 className="font-heading text-3xl sm:text-5xl font-extrabold tracking-tight text-white mt-4 max-w-3xl mx-auto">
              Ready to Accelerate Your Engineering Career?
            </h2>
            <p className="text-base text-[#94a3b8] max-w-2xl mx-auto mt-4 mb-8">
              Join thousands of software engineers, fresh graduates, and senior architects preparing with PrepPilot AI.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/register"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-lg bg-[#4f46e5] hover:bg-[#4338ca] text-white font-semibold text-sm shadow-md transition-all"
              >
                <span>Get Started Free</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/dashboard"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-lg bg-[#1e293b] hover:bg-[#334155] text-white border border-[#334155] font-semibold text-sm transition-all"
              >
                <span>Explore Candidate Console</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="bg-[#0b1c30] text-[#94a3b8] py-12 border-t border-[#1e293b]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-[#4f46e5] flex items-center justify-center text-white">
              <Plane className="w-4 h-4" />
            </div>
            <span className="font-heading text-base font-bold text-white tracking-tight">
              PrepPilot AI
            </span>
            <span className="text-xs text-[#64748b]">| B.Tech Computer Science Project</span>
          </div>

          <div className="flex items-center gap-6 text-xs">
            <Link to="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
            <Link to="/resume-job-match" className="hover:text-white transition-colors">Resume Match</Link>
            <Link to="/interview-setup" className="hover:text-white transition-colors">Interview Setup</Link>
            <Link to="/evaluation-reports" className="hover:text-white transition-colors">Scorecard</Link>
            <Link to="/profile-settings" className="hover:text-white transition-colors">Privacy & Enclave</Link>
          </div>

          <p className="text-xs text-[#64748b]">
            © {new Date().getFullYear()} PrepPilot AI. Built for verified academic engineering demonstration.
          </p>
        </div>
      </footer>

      {/* 2-Min Demo Video Modal */}
      {demoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-[#e2e8f0] relative">
            <div className="flex items-center justify-between pb-3 border-b border-[#e2e8f0]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#4f46e5]" />
                <h3 className="font-heading text-lg font-bold text-[#0b1c30]">
                  PrepPilot AI Interactive Simulation Demo
                </h3>
              </div>
              <button
                onClick={() => setDemoModalOpen(false)}
                className="p-1.5 text-[#565e74] hover:text-[#0b1c30] rounded-lg hover:bg-[#eff4ff]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-5 p-6 rounded-xl bg-[#0f172a] text-white flex flex-col items-center justify-center text-center gap-4 min-h-[260px]">
              <div className="w-16 h-16 rounded-full bg-[#4f46e5]/20 text-[#c3c0ff] flex items-center justify-center border border-[#4f46e5]/40">
                <PlayCircle className="w-8 h-8" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Experience PrepPilot in Real Time</p>
                <p className="text-xs text-[#94a3b8] max-w-md mt-1">
                  You can jump right into the actual live interview console, test resume parsing, and inspect evaluation scorecards without a video delay!
                </p>
              </div>

              <div className="flex items-center gap-3 mt-2">
                <Link
                  to="/live-session"
                  onClick={() => setDemoModalOpen(false)}
                  className="px-5 py-2 rounded-lg bg-[#4f46e5] text-white font-semibold text-xs hover:bg-[#4338ca] transition-colors"
                >
                  Launch Live Mock Room
                </Link>
                <Link
                  to="/dashboard"
                  onClick={() => setDemoModalOpen(false)}
                  className="px-5 py-2 rounded-lg bg-[#1e293b] text-white font-semibold text-xs hover:bg-[#334155] border border-[#334155] transition-colors"
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
