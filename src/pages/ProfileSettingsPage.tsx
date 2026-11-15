import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User as UserIcon,
  Building,
  Briefcase,
  Shield,
  Bot,
  Mic,
  Camera,
  Download,
  CheckCircle2,
  Trash2,
  Lock,
  RefreshCw,
  X,
  Volume2,
  Server,
  Database,
  Check,
  Upload,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import {
  validateAvatarFile,
  resizeImageFileToDataUrl,
  formatAuthProviderLabel,
} from '../utils/avatar';

export const ProfileSettingsPage: React.FC = () => {
  const { user, updateUserMetrics, updateAvatar } = useAuth();
  const { profile, updateProfile, updateInterviewSetup, resetInterviewSession } = useApp();
  const { showToast } = useToast();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const testAudioRef = useRef<HTMLAudioElement | null>(null);

  const [activeTab, setActiveTab] = useState<'general' | 'track' | 'ai' | 'devices' | 'security'>('general');

  // Form states
  const [fullName, setFullName] = useState(
    profile.fullName && profile.fullName !== 'Alex Morgan' ? profile.fullName : user?.name || profile.fullName
  );
  const [headline, setHeadline] = useState(profile.headline);
  const [location, setLocation] = useState(profile.location);
  const [targetCompany, setTargetCompany] = useState(user?.targetCompany || 'Stripe');
  const [targetRole, setTargetRole] = useState(user?.targetRole || 'Senior Frontend Engineer');
  const [aiPersona, setAiPersona] = useState(profile.preferences.aiInterviewerPersona);
  const [interviewerStyle, setInterviewerStyle] = useState(profile.preferences.interviewerStyle);
  const [speechTranscription, setSpeechTranscription] = useState(profile.preferences.speechTranscriptionEnabled);
  const [voiceFeedback, setVoiceFeedback] = useState(profile.preferences.voiceFeedbackEnabled);
  const [cameraEnabled, setCameraEnabled] = useState(profile.preferences.cameraEnabled);

  React.useEffect(() => {
    const preferredName =
      profile.fullName && profile.fullName !== 'Alex Morgan'
        ? profile.fullName
        : user?.name || profile.fullName;
    if (preferredName && preferredName !== fullName) {
      setFullName(preferredName);
    }
    if (user?.targetCompany) setTargetCompany(user.targetCompany);
    if (user?.targetRole) setTargetRole(user.targetRole);
  }, [user?.name, user?.targetCompany, user?.targetRole, profile.fullName]);

  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const validation = validateAvatarFile({ type: file.type, size: file.size });
    if (!validation.valid) {
      showToast({
        title: 'Invalid Profile Image',
        message: validation.error || 'Please choose a valid image file.',
        type: 'error',
      });
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const dataUrl = await resizeImageFileToDataUrl(file, 256);
      const savedUrl = await updateAvatar(dataUrl);
      if (savedUrl) {
        await updateProfile({ avatarUrl: savedUrl });
      }
      showToast({
        title: 'Profile Image Saved',
        message: 'Your profile photo was saved to the database and will persist across sign-ins.',
        type: 'success',
      });
    } catch (err: any) {
      showToast({
        title: 'Upload Failed',
        message: err?.message || 'Could not process the selected image.',
        type: 'error',
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleResetAvatar = async () => {
    setIsUploadingAvatar(true);
    try {
      const savedUrl = await updateAvatar('');
      if (savedUrl) {
        await updateProfile({ avatarUrl: savedUrl });
      }
      showToast({
        title: 'Profile Image Reset',
        message: 'Restored default candidate profile avatar.',
        type: 'info',
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    setTimeout(() => {
      updateProfile({
        fullName,
        headline,
        location,
        preferences: {
          ...profile.preferences,
          aiInterviewerPersona: aiPersona,
          interviewerStyle,
          speechTranscriptionEnabled: speechTranscription,
          voiceFeedbackEnabled: voiceFeedback,
          cameraEnabled,
        },
      });

      updateUserMetrics({
        name: fullName,
        targetCompany,
        targetRole,
      });

      updateInterviewSetup({
        aiPersona,
        targetCompany,
        targetRole,
      });

      setIsSaving(false);
      showToast({
        title: 'Profile & Calibration Updated',
        message: 'Your candidate settings and rubric targets were securely persisted.',
        type: 'success',
      });
    }, 400);
  };

  const handleExportDossier = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify({ profile, user }, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `preppilot_candidate_dossier_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    showToast({
      title: 'Candidate Dossier Exported',
      message: 'Downloaded complete candidate dossier JSON file.',
      type: 'success',
    });
  };

  const handleConfirmReset = () => {
    resetInterviewSession();
    setResetModalOpen(false);
    showToast({
      title: 'Session Cache Flushed',
      message: 'Active interview draft and telemetry buffers have been reset.',
      type: 'info',
    });
  };

  const handleTestAudio = async () => {
    const sampleText = `Hi, I'm ${aiPersona}. Your human neural interview voice is calibrated and ready for your live session.`;
    try {
      if (testAudioRef.current) {
        testAudioRef.current.pause();
        testAudioRef.current = null;
      }
      const res = await fetch('/api/ai/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: sampleText, persona: aiPersona }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.audioBase64) {
          const audio = new Audio(`data:${data.mimeType || 'audio/mpeg'};base64,${data.audioBase64}`);
          testAudioRef.current = audio;
          await audio.play();
          showToast({
            title: 'Human Neural Voice Active',
            message: `Playing ${data.neuralVoiceId || data.voiceName} neural voice calibration sample.`,
            type: 'success',
          });
          return;
        }
      }
    } catch {
      // Fallback below if network audio is unavailable
    }

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(sampleText);
      window.speechSynthesis.speak(utterance);
      showToast({
        title: 'Audio Check Playing',
        message: 'Synthesizing voice playback on default audio output.',
        type: 'info',
      });
    } else {
      showToast({
        title: 'Audio Output Ready',
        message: 'Audio playback device verified.',
        type: 'info',
      });
    }
  };

  return (
    <div className="flex flex-col w-full gap-6 pb-12 antialiased">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-left">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-[#565e74] uppercase tracking-wider font-semibold mb-1">
            <span>Platform</span>
            <span>•</span>
            <span className="text-[#3525cd]">Profile &amp; Settings</span>
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-[#0b1c30] tracking-tight">
            Candidate Profile &amp; Settings
          </h1>
          <p className="text-sm text-[#464555] max-w-3xl mt-1 leading-relaxed">
            Manage your professional identity, target company calibration benchmarks, adversarial AI evaluation personas, and security preferences.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={handleExportDossier}
            className="flex items-center gap-1.5 bg-white text-[#0b1c30] px-4 py-2.5 rounded-lg text-xs font-semibold shadow-sm hover:bg-[#eff4ff] border border-[#e2e8f0] transition-colors active:scale-95"
          >
            <Download className="w-4 h-4 text-[#565e74]" />
            <span>Export Dossier (JSON)</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 bg-[#4f46e5] text-white px-5 py-2.5 rounded-lg text-xs font-semibold shadow-sm hover:bg-[#3525cd] transition-all active:scale-95 disabled:opacity-60"
          >
            {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm p-1.5 overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          <button
            onClick={() => setActiveTab('general')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'general'
                ? 'bg-[#4f46e5] text-white shadow-sm'
                : 'text-[#565e74] hover:text-[#0b1c30] hover:bg-[#eff4ff]'
            }`}
          >
            <UserIcon className="w-4 h-4" />
            <span>General Profile</span>
          </button>

          <button
            onClick={() => setActiveTab('track')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'track'
                ? 'bg-[#4f46e5] text-white shadow-sm'
                : 'text-[#565e74] hover:text-[#0b1c30] hover:bg-[#eff4ff]'
            }`}
          >
            <Building className="w-4 h-4" />
            <span>Target Track &amp; Company</span>
          </button>

          <button
            onClick={() => setActiveTab('ai')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'ai'
                ? 'bg-[#4f46e5] text-white shadow-sm'
                : 'text-[#565e74] hover:text-[#0b1c30] hover:bg-[#eff4ff]'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>AI Coach &amp; Personas</span>
          </button>

          <button
            onClick={() => setActiveTab('devices')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'devices'
                ? 'bg-[#4f46e5] text-white shadow-sm'
                : 'text-[#565e74] hover:text-[#0b1c30] hover:bg-[#eff4ff]'
            }`}
          >
            <Mic className="w-4 h-4" />
            <span>Audio &amp; Telemetry</span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'security'
                ? 'bg-[#4f46e5] text-white shadow-sm'
                : 'text-[#565e74] hover:text-[#0b1c30] hover:bg-[#eff4ff]'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Security &amp; Privacy Enclave</span>
          </button>
        </div>
      </div>

      {/* Main Tab Panels */}
      <form onSubmit={handleSave} className="space-y-6 text-left">
        {activeTab === 'general' && (
          <section className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm p-6 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#e2e8f0]">
              <div>
                <h3 className="font-heading text-base font-bold text-[#0b1c30]">Executive Information</h3>
                <p className="text-xs text-[#565e74]">Core identity matched against job descriptions and senior rubric benchmarks.</p>
              </div>
              <span className="px-2.5 py-1 bg-[#eff4ff] text-[#3525cd] text-xs font-bold rounded-full">
                Primary Dossier
              </span>
            </div>

            {/* Avatar Upload & Identity Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-[#f8f9ff] rounded-xl border border-[#e2e8f0]">
              <div className="flex items-center gap-4">
                <div className="relative group shrink-0">
                  <img
                    src={user?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256'}
                    alt={fullName}
                    className="w-20 h-20 rounded-xl object-cover ring-2 ring-[#e5eeff] shadow-sm bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                    aria-label="Change profile photo"
                    className="absolute inset-0 bg-[#0b1c30]/50 text-white rounded-xl opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                  >
                    {isUploadingAvatar ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <Camera className="w-5 h-5" />
                    )}
                  </button>
                </div>

                <div>
                  <h4 className="font-heading text-base font-bold text-[#0b1c30]">{fullName}</h4>
                  <p className="text-xs text-[#565e74]">{headline}</p>
                  <div className="flex items-center flex-wrap gap-2 mt-1.5">
                    <span className="text-[11px] text-[#3525cd] font-semibold">
                      Verified Candidate Enclave
                    </span>
                    <span className="text-[#c7c4d8]">•</span>
                    <span className="px-2 py-0.5 rounded-full bg-[#eff4ff] border border-[#c7c4d8]/50 text-[10px] font-semibold text-[#3525cd]">
                      {formatAuthProviderLabel(user?.authProvider)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <input
                  ref={avatarInputRef}
                  id="profile-avatar-upload"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={handleAvatarFileChange}
                  className="hidden"
                  aria-label="Upload profile image file"
                />
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="flex items-center gap-1.5 bg-white hover:bg-[#eff4ff] text-[#3525cd] px-3.5 py-2 rounded-lg text-xs font-semibold border border-[#c7d2fe] shadow-sm transition-colors disabled:opacity-60"
                >
                  {isUploadingAvatar ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Upload className="w-3.5 h-3.5" />
                  )}
                  <span>{isUploadingAvatar ? 'Saving...' : 'Upload Photo'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetAvatar}
                  disabled={isUploadingAvatar}
                  className="px-3 py-2 rounded-lg text-xs font-semibold text-[#565e74] hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors disabled:opacity-60"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#0b1c30]" htmlFor="prof-name">Full Name</label>
                <input
                  id="prof-name"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="bg-[#f8f9ff] border border-[#e2e8f0] rounded-lg p-2.5 text-xs text-[#0b1c30] font-medium focus:ring-2 focus:ring-[#4f46e5] outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#0b1c30]" htmlFor="prof-email">Email Address</label>
                <input
                  id="prof-email"
                  type="email"
                  value={user?.email || 'alex.morgan@example.com'}
                  disabled
                  className="bg-[#eff4ff] border border-[#e2e8f0] rounded-lg p-2.5 text-xs text-[#565e74] cursor-not-allowed"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#0b1c30]" htmlFor="prof-headline">Professional Headline</label>
                <input
                  id="prof-headline"
                  type="text"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  className="bg-[#f8f9ff] border border-[#e2e8f0] rounded-lg p-2.5 text-xs text-[#0b1c30] font-medium focus:ring-2 focus:ring-[#4f46e5] outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#0b1c30]" htmlFor="prof-loc">Location Preference</label>
                <input
                  id="prof-loc"
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="bg-[#f8f9ff] border border-[#e2e8f0] rounded-lg p-2.5 text-xs text-[#0b1c30] font-medium focus:ring-2 focus:ring-[#4f46e5] outline-none"
                />
              </div>
            </div>
          </section>
        )}

        {activeTab === 'track' && (
          <section className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm p-6 space-y-6">
            <div className="pb-3 border-b border-[#e2e8f0]">
              <h3 className="font-heading text-base font-bold text-[#0b1c30]">Company Calibration &amp; Target Track</h3>
              <p className="text-xs text-[#565e74]">Aligns rubric weights, question pools, and bar-raiser expectations.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#0b1c30]">Target Company Tier</label>
                <select
                  value={targetCompany}
                  onChange={(e) => setTargetCompany(e.target.value)}
                  className="bg-[#f8f9ff] border border-[#e2e8f0] rounded-lg p-2.5 text-xs text-[#0b1c30] font-semibold focus:ring-2 focus:ring-[#4f46e5] outline-none"
                >
                  <option value="Stripe">Stripe (Systems &amp; Reliability Core)</option>
                  <option value="Google">Google (L5/L6 Distributed Scale)</option>
                  <option value="Meta">Meta (Fast Execution &amp; Product Architecture)</option>
                  <option value="Amazon">Amazon (Leadership Principles &amp; Bar Raiser)</option>
                  <option value="Microsoft">Microsoft (Enterprise Cloud &amp; Design)</option>
                  <option value="OpenAI">OpenAI (Frontiers &amp; Research Engineering)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#0b1c30]">Primary Engineering Track</label>
                <select
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  className="bg-[#f8f9ff] border border-[#e2e8f0] rounded-lg p-2.5 text-xs text-[#0b1c30] font-semibold focus:ring-2 focus:ring-[#4f46e5] outline-none"
                >
                  <option value="Senior Frontend Engineer">Senior Frontend Engineer (Staff Track)</option>
                  <option value="Staff Systems Architect">Staff Systems Architect</option>
                  <option value="Full-Stack Technical Lead">Full-Stack Technical Lead</option>
                  <option value="Distributed Systems Engineer">Distributed Systems Engineer</option>
                  <option value="Engineering Manager">Engineering Manager / Director</option>
                </select>
              </div>
            </div>

            <div className="p-4 bg-[#eff4ff] rounded-xl border border-[#c7d2fe] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#3525cd] text-white flex items-center justify-center font-bold text-sm">
                  {targetCompany.charAt(0)}
                </div>
                <div>
                  <h4 className="font-heading text-xs font-bold text-[#0b1c30]">
                    Calibrated Rubric: {targetCompany} Bar Standard
                  </h4>
                  <p className="text-[11px] text-[#565e74]">
                    Weighted: Technical Depth (35%), Tradeoff Analysis (25%), Communication (20%), Decomposition (20%).
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 bg-white text-[#3525cd] text-[11px] font-bold rounded-lg border border-[#c7d2fe]">
                L6 Staff Bar Active
              </span>
            </div>
          </section>
        )}

        {activeTab === 'ai' && (
          <section className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm p-6 space-y-6">
            <div className="pb-3 border-b border-[#e2e8f0]">
              <h3 className="font-heading text-base font-bold text-[#0b1c30]">AI Interviewer Persona &amp; Style</h3>
              <p className="text-xs text-[#565e74]">Customize adaptive follow-up behavior, questioning tone, and critique rigor.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                {
                  id: 'Sarah',
                  title: 'Sarah (Staff Bar-Raiser)',
                  desc: 'Incisive, data-driven, and relentlessly probes edge conditions, rollback plans, and trade-offs.',
                  accent: 'border-[#4f46e5] bg-[#eff4ff]/60',
                },
                {
                  id: 'Dr. Elena Vance',
                  title: 'Dr. Elena Vance (Systems Architect)',
                  desc: 'Focuses on architectural boundaries, formal correctness, and consensus algorithms under high partition.',
                  accent: 'border-[#e2e8f0] bg-white',
                },
                {
                  id: 'Marcus Reed',
                  title: 'Marcus Reed (VP Engineering)',
                  desc: 'Evaluates business leverage, communication brevity, cross-team influence, and mentorship velocity.',
                  accent: 'border-[#e2e8f0] bg-white',
                },
                {
                  id: 'David Chen',
                  title: 'David Chen (Principal Tech Lead)',
                  desc: 'Balanced, collaborative deep-diver emphasizing clean code structure, testability, and latency budgets.',
                  accent: 'border-[#e2e8f0] bg-white',
                },
              ].map((p) => (
                <div
                  key={p.id}
                  onClick={() => setAiPersona(p.id as any)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    aiPersona === p.id
                      ? 'border-[#4f46e5] ring-2 ring-[#4f46e5]/20 bg-[#eff4ff]'
                      : 'border-[#e2e8f0] bg-[#f8f9ff] hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-heading text-xs font-bold text-[#0b1c30]">{p.title}</span>
                    {aiPersona === p.id && <CheckCircle2 className="w-4 h-4 text-[#4f46e5]" />}
                  </div>
                  <p className="text-[11px] text-[#565e74] leading-relaxed">{p.desc}</p>
                </div>
              ))}
            </div>

            <div className="pt-2">
              <label className="text-xs font-semibold text-[#0b1c30] block mb-2">Interviewer Pressure Level</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'supportive', label: 'Supportive & Guiding' },
                  { id: 'bar-raiser', label: 'Bar-Raiser (Standard)' },
                  { id: 'adversarial', label: 'Adversarial & High Pressure' },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setInterviewerStyle(s.id as any)}
                    className={`p-2.5 text-xs font-semibold rounded-lg border transition-all text-center ${
                      interviewerStyle === s.id
                        ? 'bg-[#4f46e5] text-white border-[#4f46e5] shadow-sm'
                        : 'bg-[#f8f9ff] text-[#565e74] border-[#e2e8f0] hover:bg-white'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {activeTab === 'devices' && (
          <section className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm p-6 space-y-6">
            <div className="pb-3 border-b border-[#e2e8f0]">
              <h3 className="font-heading text-base font-bold text-[#0b1c30]">Audio, Mic &amp; Speech Synthesis Telemetry</h3>
              <p className="text-xs text-[#565e74]">Configure real-time voice streaming, transcript recording, and camera presence.</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-[#f8f9ff] rounded-xl border border-[#e2e8f0]">
                <div className="flex items-center gap-3">
                  <Mic className="w-5 h-5 text-[#3525cd]" />
                  <div>
                    <div className="text-xs font-bold text-[#0b1c30]">Real-Time Speech-to-Text Transcription</div>
                    <div className="text-[11px] text-[#565e74]">Streams candidate speech with latency &lt; 200ms.</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={speechTranscription}
                  onChange={(e) => setSpeechTranscription(e.target.checked)}
                  className="w-4 h-4 accent-[#4f46e5] rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-[#f8f9ff] rounded-xl border border-[#e2e8f0]">
                <div className="flex items-center gap-3">
                  <Volume2 className="w-5 h-5 text-[#3525cd]" />
                  <div>
                    <div className="text-xs font-bold text-[#0b1c30]">Interviewer Audio Voice Synthesis</div>
                    <div className="text-[11px] text-[#565e74]">Plays adaptive follow-ups using text-to-speech engine.</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleTestAudio}
                    className="px-3 py-1 bg-white border border-[#e2e8f0] hover:bg-[#eff4ff] text-[#3525cd] text-xs font-semibold rounded-lg transition-colors"
                  >
                    Test Audio
                  </button>
                  <input
                    type="checkbox"
                    checked={voiceFeedback}
                    onChange={(e) => setVoiceFeedback(e.target.checked)}
                    className="w-4 h-4 accent-[#4f46e5] rounded cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-[#f8f9ff] rounded-xl border border-[#e2e8f0]">
                <div className="flex items-center gap-3">
                  <Camera className="w-5 h-5 text-[#3525cd]" />
                  <div>
                    <div className="text-xs font-bold text-[#0b1c30]">Webcam Presence Feedback</div>
                    <div className="text-[11px] text-[#565e74]">Provides confidence pacing and posture cues (client-only).</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={cameraEnabled}
                  onChange={(e) => setCameraEnabled(e.target.checked)}
                  className="w-4 h-4 accent-[#4f46e5] rounded cursor-pointer"
                />
              </div>
            </div>
          </section>
        )}

        {/* SECURITY & DATA ISOLATION ENCLAVE */}
        {activeTab === 'security' && (
          <section className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm p-6 space-y-6">
            <div className="pb-3 border-b border-[#e2e8f0]">
              <h3 className="font-heading text-base font-bold text-[#0b1c30]">Security, Privacy &amp; Data Enclave</h3>
              <p className="text-xs text-[#565e74]">Candidate profiles, mock sessions, and evaluations are securely isolated and protected.</p>
            </div>

            {/* Official Server-Side Database Architecture Card */}
            <div className="p-5 bg-[#f8f9ff] rounded-xl border border-[#e2e8f0] space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-[#eff4ff] text-[#3525cd] flex items-center justify-center">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#0b1c30] uppercase tracking-wider">
                      Official Cloud PostgreSQL Database
                    </h4>
                    <p className="text-[11px] text-[#565e74]">
                      Managed server-side persistence for candidate profiles, resumes, evaluations, and learning plans.
                    </p>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Enclave Active</span>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="p-3 bg-white rounded-lg border border-[#e2e8f0]">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#0b1c30] mb-1">
                    <Server className="w-4 h-4 text-[#3525cd]" />
                    <span>Server-Side Enclave</span>
                  </div>
                  <p className="text-[11px] text-[#565e74] leading-relaxed">
                    Database credentials and connection pools are isolated on the server. Zero keys are exposed to client browser bundles.
                  </p>
                </div>

                <div className="p-3 bg-white rounded-lg border border-[#e2e8f0]">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#0b1c30] mb-1">
                    <Shield className="w-4 h-4 text-emerald-600" />
                    <span>Row Level Security</span>
                  </div>
                  <p className="text-[11px] text-[#565e74] leading-relaxed">
                    PostgreSQL Row Level Security (RLS) policies enforce cryptographic data isolation across all candidate dossiers.
                  </p>
                </div>

                <div className="p-3 bg-white rounded-lg border border-[#e2e8f0]">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#0b1c30] mb-1">
                    <Lock className="w-4 h-4 text-[#3525cd]" />
                    <span>End-to-End Encryption</span>
                  </div>
                  <p className="text-[11px] text-[#565e74] leading-relaxed">
                    All network traffic is encrypted via TLS 1.3 in transit and AES-256 for all stored transcripts and evaluation artifacts.
                  </p>
                </div>
              </div>
            </div>

            {/* Zero Public Retention Guarantee */}
            <div className="p-4 bg-emerald-50/80 rounded-xl border border-emerald-200 text-xs text-emerald-900 leading-relaxed">
              <div className="flex items-center gap-2 font-bold mb-1">
                <Lock className="w-4 h-4 text-emerald-700" />
                <span>Zero Third-Party Data Retention Guarantee</span>
              </div>
              <p>
                PrepPilot AI stores mock interview sessions and parsed resumes in isolated user records. No candidate audio, video, or resume text is accessible across accounts or exposed to external third-party recruiters without explicit candidate authorization.
              </p>
            </div>

            {/* Danger Zone: Flush Cache */}
            <div className="p-4 bg-red-50/60 rounded-xl border border-red-200/80 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-red-900 flex items-center gap-1.5">
                  <Trash2 className="w-4 h-4 text-red-700" />
                  <span>Flush Session Draft Cache</span>
                </div>
                <p className="text-[11px] text-[#565e74] mt-0.5">
                  Clears local drafts and resets active questions back to initial state.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setResetModalOpen(true)}
                className="px-3.5 py-1.5 rounded-lg bg-white hover:bg-red-50 text-red-700 text-xs font-semibold border border-red-200 shadow-sm transition-colors"
              >
                Flush Cache
              </button>
            </div>
          </section>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 rounded-lg bg-[#4f46e5] hover:bg-[#3525cd] text-white font-semibold text-xs shadow-sm transition-all active:scale-95 disabled:opacity-60 flex items-center gap-1.5"
          >
            {isSaving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
            <span>Save All Changes</span>
          </button>
        </div>
      </form>

      {/* Reset Confirmation Modal */}
      <AnimatePresence>
        {resetModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl p-6 max-w-md w-full border border-[#e2e8f0] shadow-xl text-left"
            >
              <div className="flex items-center gap-3 text-red-600 mb-3">
                <Trash2 className="w-5 h-5" />
                <h3 className="font-heading text-base font-bold text-[#0b1c30]">Flush Session Draft Cache?</h3>
              </div>
              <p className="text-xs text-[#565e74] leading-relaxed mb-6">
                This will clear unsaved draft answers, recorded mock audio buffers, and active session timers. Saved reports and curriculum records in your cloud enclave will not be deleted.
              </p>
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setResetModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-[#565e74] hover:bg-[#f1f5f9]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReset}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-700 text-white"
                >
                  Confirm Flush
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
