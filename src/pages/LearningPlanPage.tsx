import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Play,
  RotateCw,
  FileDown,
  Layers,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Sparkles,
  BookOpen,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { AnimatedCounter } from '../components/common/AnimatedCounter';

export const LearningPlanPage: React.FC = () => {
  const { learningPlan, toggleLearningModule, updateInterviewSetup } = useApp();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [expandedModuleId, setExpandedModuleId] = useState<string | null>(null);

  const filteredModules = (learningPlan.modules || []).filter((m) => {
    if (filterPriority === 'all') return true;
    return m.priority === filterPriority;
  });

  const handleExport = () => {
    showToast({
      title: 'Preparing Syllabus Document',
      message: 'Opening print dialog with complete learning syllabus breakdown.',
      type: 'info',
    });
    window.print();
  };

  const handleToggleModule = (moduleId: string, moduleTitle: string, currentStatus: boolean) => {
    toggleLearningModule(moduleId);
    showToast({
      title: currentStatus ? 'Module Marked Incomplete' : 'Module Completed!',
      message: currentStatus
        ? `Reopened "${moduleTitle}".`
        : `Mastered "${moduleTitle}". Readiness velocity updated!`,
      type: currentStatus ? 'info' : 'success',
    });
  };

  const handleStartModuleDrill = (moduleTitle: string) => {
    updateInterviewSetup({
      targetRole: 'Senior Frontend Engineer',
      targetCompany: 'Stripe',
      interviewType: 'technical',
    });
    showToast({
      title: 'Drill Launched',
      message: `Configured mock room focused on ${moduleTitle}.`,
      type: 'info',
    });
    navigate('/live-session');
  };

  return (
    <div className="flex flex-col w-full gap-6 pb-12 antialiased">
      {/* Top Action & Context Banner */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 text-left">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[#565e74] text-xs uppercase tracking-wider">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#eff4ff] text-[#3525cd] font-semibold border border-[#c7c4d8]/40">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4f46e5] animate-pulse" />
              Adaptive Syllabus v3.4
            </span>
            <span>•</span>
            <span>Target: {learningPlan.targetCompany} {learningPlan.targetRole}</span>
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-[#0b1c30] tracking-tight">
            Personalized Learning &amp; Drill Roadmap
          </h1>
          <p className="text-sm text-[#464555] max-w-3xl leading-relaxed">
            Curated curriculum generated from your {learningPlan.targetCompany} benchmarks, automated resume gap indexing, and transcript telemetry from your completed mock sessions.
          </p>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center flex-wrap gap-2 shrink-0">
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 bg-[#4f46e5] hover:bg-[#3525cd] text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-sm transition-all active:scale-95"
          >
            <FileDown className="w-4 h-4" />
            <span>Export PDF Plan</span>
          </button>
        </div>
      </div>

      {/* Metric Velocity Band (Top Row Bento matching Stitch) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
        {/* Card 1: Curriculum Progress */}
        <div className="bg-white rounded-xl p-5 border border-[#e2e8f0] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#565e74] uppercase tracking-wider">Curriculum Progress</span>
            <span className="text-xs font-bold text-[#3525cd] bg-[#eff4ff] px-2 py-0.5 rounded-full">On Track</span>
          </div>

          <div className="my-3 flex items-center justify-between gap-4">
            <div>
              <div className="font-heading text-3xl font-bold text-[#0b1c30]">
                <AnimatedCounter value={learningPlan.completionPercentage} suffix="%" />
              </div>
              <p className="text-xs text-[#464555] mt-0.5">
                {learningPlan.completedModules} of {learningPlan.totalModules} Modules Mastered
              </p>
            </div>

            {/* SVG Progress Donut */}
            <div className="relative w-14 h-14 shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-[#e5eeff]"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.5"
                />
                <path
                  className="text-[#4f46e5] transition-all duration-700"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeDasharray={`${learningPlan.completionPercentage}, 100`}
                  strokeLinecap="round"
                  strokeWidth="3.5"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-[#0b1c30]">
                {learningPlan.totalModules - learningPlan.completedModules}
              </div>
            </div>
          </div>

          <div className="w-full bg-[#eff4ff] rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-[#4f46e5] h-1.5 rounded-full transition-all duration-700"
              style={{ width: `${learningPlan.completionPercentage}%` }}
            />
          </div>
        </div>

        {/* Card 2: Countdown & Target Date */}
        <div className="bg-white rounded-xl p-5 border border-[#e2e8f0] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#565e74] uppercase tracking-wider">Target Onsite</span>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-[#93000a] bg-[#ffdad6] px-2 py-0.5 rounded-full">
              <Clock className="w-3 h-3" /> 12 Days Left
            </span>
          </div>

          <div className="my-3">
            <div className="font-heading text-2xl font-bold text-[#0b1c30]">{learningPlan.targetDate}</div>
            <p className="text-xs text-[#464555] flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-[#4f46e5]" />
              {learningPlan.targetCompany} Onsite Loop
            </p>
          </div>

          <div className="flex items-center justify-between text-[#565e74] text-xs pt-2 border-t border-[#e2e8f0]">
            <span>5 Rounds Scheduled</span>
            <span className="text-[#0b1c30] font-semibold">Stage: Pre-Flight</span>
          </div>
        </div>

        {/* Card 3: Priority Gap Focus */}
        <div className="bg-white rounded-xl p-5 border border-[#e2e8f0] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#565e74] uppercase tracking-wider">Priority Focus</span>
            <span className="text-xs font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
              3 Critical
            </span>
          </div>

          <div className="my-3">
            <div className="font-heading text-2xl font-bold text-[#0b1c30]">Distributed State</div>
            <p className="text-xs text-[#464555] mt-0.5">
              Raft Consensus &amp; Client Idempotency
            </p>
          </div>

          <div className="text-xs text-[#565e74] pt-2 border-t border-[#e2e8f0]">
            Primary delta to clearing Stripe L6 bar
          </div>
        </div>

        {/* Card 4: Estimated Pace */}
        <div className="bg-white rounded-xl p-5 border border-[#e2e8f0] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#565e74] uppercase tracking-wider">Pace &amp; Velocity</span>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              6.0 hrs/wk
            </span>
          </div>

          <div className="my-3">
            <div className="font-heading text-2xl font-bold text-[#0b1c30]">8.5 Hours</div>
            <p className="text-xs text-[#464555] mt-0.5">
              Estimated Remaining Drill Work
            </p>
          </div>

          <div className="flex items-center justify-between text-[#565e74] text-xs pt-2 border-t border-[#e2e8f0]">
            <span>Velocity: Optimal</span>
            <span className="text-[#3525cd] font-semibold">~3 drills/week</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between bg-white p-2 rounded-xl border border-[#e2e8f0] shadow-sm flex-wrap gap-2 text-left">
        <div className="flex items-center gap-1">
          {['all', 'critical', 'high', 'recommended'].map((f) => (
            <button
              key={f}
              onClick={() => setFilterPriority(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                filterPriority === f
                  ? 'bg-[#4f46e5] text-white shadow-sm'
                  : 'text-[#565e74] hover:text-[#0b1c30] hover:bg-[#eff4ff]'
              }`}
            >
              {f === 'all' ? 'All Modules (5)' : `${f} Priority`}
            </button>
          ))}
        </div>

        <div className="text-xs text-[#565e74] px-2">
          Click any module checkbox to update your live preparation progress.
        </div>
      </div>

      {/* Module List with Interactive Completion Checkboxes and Expandable Syllabus Details */}
      <div className="space-y-4 text-left">
        {filteredModules.map((module) => {
          const isExpanded = expandedModuleId === module.id;

          return (
            <div
              key={module.id}
              className={`p-5 rounded-xl border transition-all ${
                module.completed
                  ? 'bg-emerald-50/40 border-emerald-200'
                  : module.priority === 'critical'
                  ? 'bg-white border-red-200 hover:border-red-300 shadow-sm'
                  : 'bg-white border-[#e2e8f0] hover:border-[#cbd5e1] shadow-sm'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex items-start gap-3.5 min-w-0">
                  {/* Interactive Checkbox */}
                  <button
                    type="button"
                    onClick={() => handleToggleModule(module.id, module.title, module.completed)}
                    className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 transition-all active:scale-90 ${
                      module.completed
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                        : 'bg-white border-[#c7c4d8] hover:border-[#4f46e5]'
                    }`}
                    aria-label={`Mark ${module.title} as ${module.completed ? 'incomplete' : 'completed'}`}
                  >
                    {module.completed && <CheckCircle2 className="w-4 h-4" />}
                  </button>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          module.priority === 'critical'
                            ? 'bg-red-100 text-red-800'
                            : module.priority === 'high'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-[#e5eeff] text-[#3525cd]'
                        }`}
                      >
                        {module.priority} Priority
                      </span>
                      <span className="text-xs text-[#565e74]">•</span>
                      <span className="text-xs font-semibold text-[#565e74]">{module.domain}</span>
                      <span className="text-xs text-[#565e74]">•</span>
                      <span className="text-xs text-[#777587] flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {module.estimatedHours} hrs
                      </span>
                    </div>

                    <h3
                      className={`font-heading text-base font-bold transition-colors ${
                        module.completed ? 'text-[#565e74] line-through' : 'text-[#0b1c30]'
                      }`}
                    >
                      {module.title}
                    </h3>

                    <p className="text-xs text-[#464555] mt-1 leading-relaxed">
                      {module.reason}
                    </p>

                    {/* Key Topics Pills */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-3">
                      <span className="text-[11px] text-[#777587]">Topics covered:</span>
                      {module.keyTopics.map((topic, tIdx) => (
                        <span
                          key={tIdx}
                          className="px-2 py-0.5 rounded bg-[#eff4ff] text-[#3525cd] text-[11px] font-medium border border-[#c7c4d8]/40"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>

                    {/* Syllabus Detail Drawer Toggle */}
                    <button
                      type="button"
                      onClick={() => setExpandedModuleId(isExpanded ? null : module.id)}
                      className="mt-3 text-xs font-semibold text-[#4f46e5] hover:text-[#3525cd] flex items-center gap-1"
                    >
                      <span>{isExpanded ? 'Hide Module Syllabus & Traps' : 'View Module Syllabus & Traps'}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Action Button */}
                <div className="shrink-0 self-end sm:self-center">
                  <button
                    onClick={() => handleStartModuleDrill(module.title)}
                    className="px-4 py-2 rounded-lg bg-[#4f46e5] hover:bg-[#3525cd] text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 active:scale-95"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Launch Focused Drill</span>
                  </button>
                </div>
              </div>

              {/* Expandable Syllabus Detail Drawer */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 pt-4 border-t border-[#e2e8f0] text-xs space-y-3 overflow-hidden"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="p-3 bg-[#eff4ff]/60 rounded-lg border border-[#c7d2fe]/60">
                        <div className="font-bold text-[#0b1c30] flex items-center gap-1.5 mb-1">
                          <BookOpen className="w-3.5 h-3.5 text-[#3525cd]" />
                          <span>Key Architectural Concepts to Master</span>
                        </div>
                        <ul className="space-y-1 text-[#464555]">
                          <li>• In-memory vs persistent WAL logs</li>
                          <li>• Split-brain avoidance with odd quorum partitions</li>
                          <li>• Client heartbeat jitter timeout formulas (150-300ms)</li>
                        </ul>
                      </div>

                      <div className="p-3 bg-amber-50/60 rounded-lg border border-amber-200/60">
                        <div className="font-bold text-amber-900 flex items-center gap-1.5 mb-1">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
                          <span>Candidate Interview Pitfalls</span>
                        </div>
                        <ul className="space-y-1 text-[#464555]">
                          <li>• Assuming network packets arrive sequentially in order</li>
                          <li>• Forgetting client retry idempotency token generation</li>
                          <li>• Skipping backpressure propagation during queue saturation</li>
                        </ul>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
};
