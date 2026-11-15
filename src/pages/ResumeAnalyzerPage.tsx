import React, { useState } from 'react';
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
  BarChart3,
  TrendingUp,
  Layers,
  Award,
  ExternalLink,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { AnimatedCounter } from '../components/common/AnimatedCounter';

export const ResumeAnalyzerPage: React.FC = () => {
  const { user } = useAuth();
  const { profile, resumeAnalysis, jobDescriptionText, analyzeResumeAndJD, updateInterviewSetup } = useApp();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'sections' | 'keywords' | 'fit'>('sections');
  const [jdInput, setJdInput] = useState<string>(jobDescriptionText);
  const [fileName, setFileName] = useState<string>(resumeAnalysis.fileName);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisStep, setAnalysisStep] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [customSkill, setCustomSkill] = useState<string>('');
  const [skillsList, setSkillsList] = useState<string[]>(
    resumeAnalysis.parsedProfile.skills || [
      'TypeScript',
      'React 19 & Next.js',
      'Distributed Client Caching',
      'State Synchronization',
      'Web Vitals & Performance P99',
      'GraphQL & REST',
      'Tailwind CSS & Design Tokens',
      'WebSockets',
      'Unit & E2E Testing'
    ]
  );
  const [expandedExperience, setExpandedExperience] = useState<number | null>(0);
  const [keywordFilter, setKeywordFilter] = useState<string>('all');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processUploadedFile(e.target.files[0]);
    }
  };

  const processUploadedFile = (file: File) => {
    setFileName(file.name);
    showToast({
      title: 'Resume Document Uploaded',
      message: `Parsed ${file.name} (${(file.size / 1024).toFixed(1)} KB) into semantic candidate profile.`,
      type: 'success',
    });
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
      processUploadedFile(e.dataTransfer.files[0]);
    }
  };

  const handleRunAnalysis = () => {
    setIsAnalyzing(true);
    setAnalysisStep('Tokenizing resume competencies...');
    
    setTimeout(() => {
      setAnalysisStep('Extracting semantic requirements from Stripe JD...');
    }, 400);

    setTimeout(() => {
      setAnalysisStep('Benchmarking against Stripe L6 Staff Frontend bar...');
    }, 800);

    setTimeout(() => {
      analyzeResumeAndJD(fileName, jdInput);
      setIsAnalyzing(false);
      setAnalysisStep('');
      showToast({
        title: 'Alignment Analysis Complete',
        message: 'ATS match score updated to 92% with 3 prioritized competency drills.',
        type: 'success',
      });
    }, 1300);
  };

  const handleAddSkill = () => {
    const trimmed = customSkill.trim();
    if (trimmed && !skillsList.includes(trimmed)) {
      setSkillsList([...skillsList, trimmed]);
      setCustomSkill('');
      showToast({
        title: 'Skill Added to Profile',
        message: `"${trimmed}" added to candidate verified competencies.`,
        type: 'info',
      });
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkillsList(skillsList.filter((s) => s !== skillToRemove));
    showToast({
      title: 'Skill Removed',
      message: `Removed "${skillToRemove}" from active profile.`,
      type: 'info',
    });
  };

  const handleStartInterviewWithRole = () => {
    updateInterviewSetup({
      targetRole: 'Senior Frontend Engineer',
      targetCompany: 'Stripe',
      interviewType: 'technical',
    });
    showToast({
      title: 'Target Interview Configured',
      message: 'Synthesizing tailored questions targeting your identified gap areas.',
      type: 'info',
    });
    navigate('/interview-setup');
  };

  const keywordData = [
    { term: 'TypeScript', status: 'present', count: 14, density: '3.8%', category: 'Language' },
    { term: 'React 19 & Hooks', status: 'present', count: 18, density: '4.6%', category: 'Framework' },
    { term: 'Distributed Caching', status: 'present', count: 6, density: '1.5%', category: 'Architecture' },
    { term: 'State Synchronization', status: 'present', count: 8, density: '2.1%', category: 'Architecture' },
    { term: 'Web Vitals & P99', status: 'present', count: 7, density: '1.9%', category: 'Performance' },
    { term: 'Raft Consensus Protocol', status: 'missing', count: 0, density: '0.0%', category: 'Distributed Systems' },
    { term: 'Client Idempotency Keys', status: 'missing', count: 0, density: '0.0%', category: 'API Design' },
    { term: 'GraphQL Federation', status: 'present', count: 4, density: '1.1%', category: 'API Design' },
    { term: 'Partition Recovery', status: 'missing', count: 0, density: '0.0%', category: 'Fault Tolerance' },
  ];

  const filteredKeywords = keywordData.filter((k) => {
    if (keywordFilter === 'all') return true;
    if (keywordFilter === 'present') return k.status === 'present';
    if (keywordFilter === 'missing') return k.status === 'missing';
    return true;
  });

  return (
    <div className="flex flex-col w-full gap-6 pb-12 antialiased">
      {/* Top Banner / Intelligence Header */}
      <div className="relative overflow-hidden bg-white rounded-xl p-6 border border-[#e2e8f0] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1 max-w-3xl z-10 text-left">
          <div className="flex items-center gap-1.5 text-[#3525cd] text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            <span>Neural Resume-to-Role Alignment</span>
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-[#0b1c30] tracking-tight">
            Resume &amp; Job Match Intelligence
          </h1>
          <p className="text-sm text-[#565e74]">
            Upload your CV and paste a target job description to pinpoint skill gaps and tailor your AI interview questions.
          </p>
        </div>

        <div className="flex items-center gap-3 z-10 shrink-0">
          <button
            onClick={handleRunAnalysis}
            disabled={isAnalyzing}
            className="flex items-center gap-2 bg-[#4f46e5] hover:bg-[#3525cd] text-white px-5 py-2.5 rounded-lg text-xs font-semibold shadow-sm transition-all active:scale-95 disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
            <span>{isAnalyzing ? (analysisStep || 'Analyzing Alignment...') : 'Re-run Alignment'}</span>
          </button>
        </div>

        <div className="absolute -right-12 -top-12 w-64 h-64 rounded-full bg-[#e2dfff]/40 blur-3xl pointer-events-none" />
      </div>

      {/* Analysis Step Notification Bar (when actively analyzing) */}
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
                <div className="text-xs font-bold text-[#0b1c30]">AI Alignment Engine in Progress</div>
                <div className="text-[11px] text-[#565e74]">{analysisStep}</div>
              </div>
            </div>
            <div className="w-32 bg-white rounded-full h-1.5 overflow-hidden border border-[#c7c4d8]/40">
              <div className="bg-[#4f46e5] h-full w-2/3 animate-pulse" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Perspective Navigation Tabs */}
      <div className="flex items-center justify-between bg-white p-1.5 rounded-xl border border-[#e2e8f0] shadow-sm overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          <button
            onClick={() => setActiveTab('sections')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'sections'
                ? 'bg-[#4f46e5] text-white shadow-sm'
                : 'text-[#565e74] hover:text-[#0b1c30] hover:bg-[#eff4ff]'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Parsed Sections &amp; Match</span>
          </button>

          <button
            onClick={() => setActiveTab('keywords')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'keywords'
                ? 'bg-[#4f46e5] text-white shadow-sm'
                : 'text-[#565e74] hover:text-[#0b1c30] hover:bg-[#eff4ff]'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>Keywords &amp; Density</span>
          </button>

          <button
            onClick={() => setActiveTab('fit')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'fit'
                ? 'bg-[#4f46e5] text-white shadow-sm'
                : 'text-[#565e74] hover:text-[#0b1c30] hover:bg-[#eff4ff]'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>Seniority &amp; Leveling Fit</span>
          </button>
        </div>

        <div className="hidden lg:flex items-center gap-3 px-3 text-xs text-[#565e74]">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            ATS Index: <strong className="text-[#0b1c30]"><AnimatedCounter value={92} suffix="/100" /></strong>
          </span>
          <span className="text-[#c7c4d8]">•</span>
          <span className="text-[#3525cd] font-medium">Model: Gemini 2.5 Flash Embedding</span>
        </div>
      </div>

      {/* TAB 1: PARSED SECTIONS & MATCH */}
      {activeTab === 'sections' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Candidate Resume Profile (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm p-6 flex flex-col gap-5 text-left">
              <div className="flex items-center justify-between pb-3 border-b border-[#e2e8f0]">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#3525cd]" />
                  <h2 className="font-heading text-base font-bold text-[#0b1c30]">
                    Candidate Resume Profile
                  </h2>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#eff4ff] text-[#3525cd]">
                  ATS Ready
                </span>
              </div>

              {/* Uploaded File Badge with Drag-and-Drop Dropzone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                  isDragging
                    ? 'bg-[#e5eeff] border-[#4f46e5] border-dashed ring-2 ring-[#4f46e5]/30'
                    : 'bg-[#eff4ff]/70 border-[#c7c4d8]/40'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-[#3525cd] shadow-sm shrink-0 border border-[#e2e8f0]">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col min-w-0 text-left">
                    <span className="text-xs font-bold text-[#0b1c30] truncate">{fileName}</span>
                    <div className="flex items-center gap-2 text-[11px] text-[#565e74]">
                      <span>240 KB</span>
                      <span>•</span>
                      <span className="text-emerald-700 font-semibold flex items-center gap-0.5">
                        <Check className="w-3 h-3" /> Parsed &amp; Verified
                      </span>
                    </div>
                  </div>
                </div>

                <label className="cursor-pointer bg-white hover:bg-[#eff4ff] text-[#0b1c30] text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#e2e8f0] transition-colors shadow-sm shrink-0">
                  <span>Replace</span>
                  <input type="file" accept=".pdf,.doc,.docx,.txt" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>

              {/* Candidate Identity */}
              <div className="flex items-center gap-3 p-3.5 bg-[#f8f9ff] rounded-xl border border-[#e2e8f0]">
                <img
                  src={user?.avatarUrl || profile.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256'}
                  alt={user?.name || profile.fullName || 'Alex Morgan'}
                  className="w-12 h-12 rounded-full object-cover shadow-sm ring-2 ring-[#e5eeff]"
                />
                <div>
                  <h3 className="font-heading text-sm font-bold text-[#0b1c30]">{user?.name || profile.fullName || 'Alex Morgan'}</h3>
                  <p className="text-xs text-[#565e74]">{profile.location || 'Seattle, WA • Open to Remote & Hybrid'}</p>
                  <span className="text-[11px] font-semibold text-[#3525cd]">{profile.headline || '5+ Years Frontend Architecture'}</span>
                </div>
              </div>

              {/* Verified Experience Accordion */}
              <div>
                <span className="text-[11px] font-semibold text-[#565e74] uppercase tracking-wider block mb-2">
                  Verified Experience &amp; Impact
                </span>
                <div className="space-y-2">
                  {[
                    {
                      role: 'Senior Frontend Engineer',
                      company: 'Vercel Ecosystem / Cloud Corp',
                      period: '2022 - Present',
                      bullets: [
                        'Architected distributed client state caching layer reducing redundant API queries by 42%.',
                        'Optimized Core Web Vitals across 80+ enterprise dashboard surfaces to achieve P99 < 120ms.',
                      ],
                    },
                    {
                      role: 'Frontend Engineer',
                      company: 'ScaleFin SaaS',
                      period: '2020 - 2022',
                      bullets: [
                        'Constructed atomic design system tokens with Tailwind CSS and React component libraries.',
                        'Built WebSockets real-time portfolio feed handling 15k concurrent financial events.',
                      ],
                    },
                  ].map((exp, idx) => (
                    <div
                      key={idx}
                      className="border border-[#e2e8f0] rounded-xl overflow-hidden bg-[#f8f9ff] transition-all"
                    >
                      <button
                        type="button"
                        onClick={() => setExpandedExperience(expandedExperience === idx ? null : idx)}
                        className="w-full p-3 flex items-center justify-between text-left hover:bg-[#eff4ff]/60 transition-colors"
                      >
                        <div>
                          <div className="text-xs font-bold text-[#0b1c30]">{exp.role}</div>
                          <div className="text-[11px] text-[#565e74]">{exp.company} • {exp.period}</div>
                        </div>
                        {expandedExperience === idx ? (
                          <ChevronUp className="w-4 h-4 text-[#565e74]" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-[#565e74]" />
                        )}
                      </button>

                      {expandedExperience === idx && (
                        <div className="p-3 bg-white border-t border-[#e2e8f0] text-xs text-[#464555] space-y-1.5 animate-fade-in">
                          {exp.bullets.map((b, bIdx) => (
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
              </div>

              {/* Education Highlight */}
              <div>
                <span className="text-[11px] font-semibold text-[#565e74] uppercase tracking-wider block mb-1.5">
                  Verified Education
                </span>
                <div className="p-3 bg-[#f8f9ff] rounded-xl border border-[#e2e8f0] flex items-start gap-2.5">
                  <GraduationCap className="w-5 h-5 text-[#3525cd] shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-[#0b1c30]">B.S. in Computer Science</div>
                    <div className="text-xs text-[#565e74]">University of Washington (Class of 2020)</div>
                  </div>
                </div>
              </div>

              {/* Skills List with add/remove capability */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold text-[#565e74] uppercase tracking-wider">
                    Extracted Skills &amp; Competencies ({skillsList.length})
                  </span>
                  <span className="text-[10px] text-[#777587]">Verified from resume</span>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-3 max-h-48 overflow-y-auto p-1">
                  {skillsList.map((skill, index) => (
                    <span
                      key={index}
                      className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#eff4ff] text-[#3525cd] text-xs font-medium border border-[#c7c4d8]/40 hover:bg-[#e0ecff] transition-colors"
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

                {/* Add/Correct Input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customSkill}
                    onChange={(e) => setCustomSkill(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddSkill()}
                    placeholder="Add custom skill (e.g. WebRTC, Docker)..."
                    className="flex-1 bg-[#f8f9ff] border border-[#e2e8f0] rounded-lg px-3 py-1.5 text-xs text-[#0b1c30] placeholder:text-[#777587] focus:outline-none focus:ring-1 focus:ring-[#4f46e5]"
                  />
                  <button
                    type="button"
                    onClick={handleAddSkill}
                    className="px-3 py-1.5 bg-[#eff4ff] hover:bg-[#e5eeff] text-[#3525cd] rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors border border-[#c7c4d8]/40 active:scale-95"
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
            {/* Target Job Description Editor & View */}
            <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm p-6 text-left">
              <div className="flex items-center justify-between pb-3 border-b border-[#e2e8f0] mb-4">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-[#3525cd]" />
                  <h3 className="font-heading text-base font-bold text-[#0b1c30]">Target Job Description</h3>
                </div>
                <span className="text-xs text-[#565e74]">Target: Senior Frontend Engineer @ Stripe</span>
              </div>

              <div className="relative">
                <textarea
                  rows={6}
                  value={jdInput}
                  onChange={(e) => setJdInput(e.target.value)}
                  className="w-full bg-[#f8f9ff] border border-[#e2e8f0] rounded-xl p-3.5 text-xs text-[#0b1c30] font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#4f46e5] resize-y"
                  placeholder="Paste the full job description here..."
                />
              </div>

              <div className="flex items-center justify-between mt-3">
                <span className="text-[11px] text-[#777587]">
                  AI parses must-have skills, seniority bar, and system design expectations.
                </span>
                <button
                  type="button"
                  onClick={handleRunAnalysis}
                  className="text-xs font-semibold text-[#4f46e5] hover:text-[#3525cd] flex items-center gap-1 transition-colors"
                >
                  <span>Reparse JD Keywords</span>
                  <RefreshCw className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Alignment Scorecard & Gaps Breakdown */}
            <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm p-6 text-left">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#e2e8f0]">
                <div>
                  <h3 className="font-heading text-base font-bold text-[#0b1c30]">
                    Role Alignment &amp; Competency Gaps
                  </h3>
                  <p className="text-xs text-[#565e74]">
                    Benchmarked against {resumeAnalysis.matchAnalysis.matchedSkills.length + resumeAnalysis.matchAnalysis.missingSkills.length} core competencies
                  </p>
                </div>

                <div className="flex items-center gap-3 bg-[#eff4ff] px-4 py-2 rounded-xl border border-[#c7c4d8]/40">
                  <div className="text-right">
                    <div className="font-heading text-2xl font-bold text-[#3525cd]">
                      <AnimatedCounter value={resumeAnalysis.matchAnalysis.overallMatchPercentage} suffix="%" />
                    </div>
                    <div className="text-[10px] text-[#565e74] uppercase font-semibold">Match Score</div>
                  </div>
                </div>
              </div>

              {/* Matched Strengths */}
              <div className="mt-5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#059669] uppercase tracking-wider mb-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Verified Matching Skills ({resumeAnalysis.matchAnalysis.matchedSkills.length})</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {resumeAnalysis.matchAnalysis.matchedSkills.map((m, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-emerald-50/60 border border-emerald-100 rounded-lg flex items-center justify-between hover:bg-emerald-50 transition-colors"
                    >
                      <div>
                        <div className="text-xs font-semibold text-[#0b1c30]">{m.skill}</div>
                        <div className="text-[10px] text-[#565e74]">{m.category}</div>
                      </div>
                      <span className="text-xs font-bold text-emerald-700">{m.matchStrength}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Critical Competency Gaps */}
              <div className="mt-6">
                <div className="flex items-center gap-1.5 text-xs font-bold text-red-700 uppercase tracking-wider mb-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>Identified Competency Gaps to Target in Mocks ({resumeAnalysis.matchAnalysis.missingSkills.length})</span>
                </div>

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
                        onClick={handleStartInterviewWithRole}
                        className="text-xs font-semibold text-[#3525cd] hover:underline self-end sm:self-center flex items-center gap-1"
                      >
                        <span>Add Drill to Plan</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Launch CTA */}
              <div className="mt-8 p-4 bg-[#eff4ff] rounded-xl border border-[#c7c4d8]/40 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h4 className="font-heading text-sm font-bold text-[#0b1c30]">
                    Ready to test your readiness for this exact job?
                  </h4>
                  <p className="text-xs text-[#565e74] mt-0.5">
                    PrepPilot will synthesize an interview panel addressing these exact missing competencies.
                  </p>
                </div>

                <button
                  onClick={handleStartInterviewWithRole}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-[#4f46e5] hover:bg-[#3525cd] text-white font-semibold text-xs transition-all shadow-sm flex items-center justify-center gap-2 shrink-0 active:scale-95"
                >
                  <span>Launch Tailored Interview</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: KEYWORDS & DENSITY */}
      {activeTab === 'keywords' && (
        <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm p-6 text-left space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#e2e8f0]">
            <div>
              <h3 className="font-heading text-lg font-bold text-[#0b1c30]">
                Semantic Keyword Frequency &amp; ATS Density
              </h3>
              <p className="text-xs text-[#565e74]">
                Analyzes keyword occurrences in your resume versus target job description requirements.
              </p>
            </div>

            {/* Filter buttons */}
            <div className="flex items-center gap-1.5 bg-[#f8f9ff] p-1 rounded-lg border border-[#e2e8f0]">
              <button
                type="button"
                onClick={() => setKeywordFilter('all')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                  keywordFilter === 'all' ? 'bg-[#4f46e5] text-white shadow-sm' : 'text-[#565e74]'
                }`}
              >
                All ({keywordData.length})
              </button>
              <button
                type="button"
                onClick={() => setKeywordFilter('present')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                  keywordFilter === 'present' ? 'bg-[#4f46e5] text-white shadow-sm' : 'text-[#565e74]'
                }`}
              >
                Present (6)
              </button>
              <button
                type="button"
                onClick={() => setKeywordFilter('missing')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                  keywordFilter === 'missing' ? 'bg-[#4f46e5] text-white shadow-sm' : 'text-[#565e74]'
                }`}
              >
                Gaps (3)
              </button>
            </div>
          </div>

          {/* Keyword Cloud Visualization */}
          <div className="p-5 bg-[#f8f9ff] rounded-xl border border-[#e2e8f0]">
            <span className="text-[11px] font-bold text-[#565e74] uppercase tracking-wider block mb-3">
              Keyword Cloud (Weighted by JD Criticality)
            </span>
            <div className="flex flex-wrap gap-2.5 items-center">
              {keywordData.map((k, idx) => (
                <span
                  key={idx}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-transform hover:scale-105 ${
                    k.status === 'present'
                      ? 'bg-white text-[#0b1c30] border-[#c7d2fe] shadow-sm'
                      : 'bg-red-50 text-red-700 border-red-200'
                  }`}
                  style={{ fontSize: k.count > 10 ? '14px' : k.count > 0 ? '12px' : '11px' }}
                >
                  {k.term} ({k.count}x)
                </span>
              ))}
            </div>
          </div>

          {/* Density Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f8f9ff] border-b border-[#e2e8f0] text-[#565e74] uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3">Keyword / Competency</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Occurrences</th>
                  <th className="px-4 py-3">Relative Density</th>
                  <th className="px-4 py-3">ATS Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0]">
                {filteredKeywords.map((k, idx) => (
                  <tr key={idx} className="hover:bg-[#eff4ff]/40 transition-colors">
                    <td className="px-4 py-3 font-bold text-[#0b1c30]">{k.term}</td>
                    <td className="px-4 py-3 text-[#565e74]">{k.category}</td>
                    <td className="px-4 py-3 font-mono font-medium text-[#0b1c30]">{k.count}</td>
                    <td className="px-4 py-3 font-mono text-[#565e74]">{k.density}</td>
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
                              setSkillsList([...skillsList, k.term]);
                              showToast({
                                title: 'Skill Added to Profile',
                                message: `Added "${k.term}" to candidate skills.`,
                                type: 'success',
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

      {/* TAB 3: SENIORITY & LEVELING FIT */}
      {activeTab === 'fit' && (
        <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm p-6 text-left space-y-6">
          <div className="pb-4 border-b border-[#e2e8f0]">
            <h3 className="font-heading text-lg font-bold text-[#0b1c30]">
              Seniority Calibration &amp; Stripe Leveling Fit
            </h3>
            <p className="text-xs text-[#565e74]">
              Evaluation of candidate scope against Stripe's internal engineering career ladder (L4 to L6).
            </p>
          </div>

          {/* Leveling Bar Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { level: 'L4 • Mid-Level', bar: 'Independent Contributor', fit: '100% Exceeded', status: 'solid' },
              { level: 'L5 • Senior Engineer', bar: 'Tech Lead / Subsystem Owner', fit: '95% Fit', status: 'solid' },
              { level: 'L6 • Staff Engineer', bar: 'Multi-Team Architecture Bar', fit: '88% Target Match', status: 'target' },
              { level: 'L7 • Principal', bar: 'Org-Wide Strategy', fit: '52% Gap', status: 'gap' },
            ].map((lvl, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-xl border transition-all ${
                  lvl.status === 'target'
                    ? 'bg-[#eff4ff] border-[#4f46e5] ring-2 ring-[#4f46e5]/30'
                    : lvl.status === 'solid'
                    ? 'bg-emerald-50/50 border-emerald-200'
                    : 'bg-[#f8f9ff] border-[#e2e8f0]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-heading text-sm font-bold text-[#0b1c30]">{lvl.level}</span>
                  {lvl.status === 'target' && (
                    <span className="px-2 py-0.5 rounded-full bg-[#4f46e5] text-white text-[10px] font-bold">
                      Current Target
                    </span>
                  )}
                </div>
                <div className="text-xs text-[#565e74] font-medium">{lvl.bar}</div>
                <div className="mt-3 text-xs font-bold text-[#0b1c30] flex items-center justify-between">
                  <span>Alignment:</span>
                  <span className={lvl.status === 'gap' ? 'text-[#777587]' : 'text-[#3525cd]'}>{lvl.fit}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Compensation & Scope Benchmark */}
          <div className="p-5 bg-[#f8f9ff] rounded-xl border border-[#e2e8f0] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold text-[#0b1c30] flex items-center gap-1.5">
                <Award className="w-4 h-4 text-[#3525cd]" />
                <span>Market Compensation Calibration (Seattle / Remote US)</span>
              </div>
              <p className="text-xs text-[#565e74] mt-0.5">
                Senior Staff frontend band based on verified Levels.fyi &amp; Comprehensive compensation data.
              </p>
            </div>
            <div className="text-right shrink-0 bg-white px-4 py-2 rounded-xl border border-[#e2e8f0]">
              <div className="font-heading text-xl font-bold text-[#0b1c30]">$285k - $340k</div>
              <div className="text-[10px] text-[#565e74] uppercase font-semibold">Total Target Comp</div>
            </div>
          </div>

          {/* Ready to Practice Button */}
          <div className="flex justify-end pt-2">
            <button
              onClick={handleStartInterviewWithRole}
              className="px-6 py-2.5 rounded-lg bg-[#4f46e5] hover:bg-[#3525cd] text-white font-semibold text-xs shadow-sm transition-all flex items-center gap-2 active:scale-95"
            >
              <span>Setup L6 Mock Interview</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
