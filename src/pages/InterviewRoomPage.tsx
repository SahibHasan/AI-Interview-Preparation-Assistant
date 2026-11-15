import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Timer,
  LogOut,
  Mic,
  MicOff,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  X,
  Volume2,
  VolumeX,
  FileCheck,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  MessageSquare,
  ListOrdered,
  Play,
  Radio,
  AudioLines,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { useVoiceAgent } from '../hooks/useVoiceAgent';
import {
  InterviewPhase,
  PlannedTopic,
  TranscriptEntry,
  INTERVIEWER_VOICE_OPTIONS,
  isCandidateReadyConfirmation,
  getVoiceToneLabel,
  formatClockTimestamp,
} from '../utils/interviewFlow';
import { InterviewQuestion } from '../types';

export const InterviewRoomPage: React.FC = () => {
  const { user } = useAuth();
  const {
    profile,
    resumeAnalysis,
    jobDescriptionText,
    interviewSetup,
    updateInterviewSetup,
    questions,
    setPlannedQuestions,
    activeQuestionIndex,
    setActiveQuestionIndex,
    answers,
    saveAnswer,
    finishInterviewSession,
  } = useApp();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const {
    isSpeaking,
    isSynthesizing,
    voiceProvider,
    activeVoiceName,
    audioBlocked,
    isListening,
    isTranscribingAudio,
    committedTranscript,
    interimTranscript,
    micError,
    speak,
    stopSpeaking,
    replayLastSpeech,
    startListening,
    stopListening,
    resetCapturedSpeech,
    getCombinedTranscript,
  } = useVoiceAgent();

  const [phase, setPhase] = useState<InterviewPhase>('planning');
  const [plannedTopics, setPlannedTopics] = useState<PlannedTopic[]>([]);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [followUpCounts, setFollowUpCounts] = useState<Record<number, number>>({});
  const [primaryAnswersByIdx, setPrimaryAnswersByIdx] = useState<Record<number, string>>({});
  const [followUpMetaByIdx, setFollowUpMetaByIdx] = useState<
    Record<number, { triggerReason: string; followUpQuestion: string }>
  >({});

  const [selectedVoice, setSelectedVoice] = useState<'Kore' | 'Zephyr' | 'Charon' | 'Puck' | 'Fenrir'>(
    interviewSetup.voiceName || 'Kore'
  );
  const [voiceMuted, setVoiceMuted] = useState<boolean>(false);

  const [questionSeconds, setQuestionSeconds] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [endModalOpen, setEndModalOpen] = useState(false);
  const [isProcessingTurn, setIsProcessingTurn] = useState(false);
  const [isFinishingReport, setIsFinishingReport] = useState(false);
  const [audioBars, setAudioBars] = useState<number[]>([3, 5, 8, 6, 10, 7, 4, 8, 5, 3]);

  const transcriptViewportRef = useRef<HTMLDivElement>(null);
  const transcriptRef = useRef<TranscriptEntry[]>([]);
  const initializedPlanRef = useRef(false);

  const currentTopic: PlannedTopic | undefined = plannedTopics[activeQuestionIndex];
  const currentQuestion: InterviewQuestion | undefined = questions[activeQuestionIndex] || questions[0];

  const appendTranscript = useCallback(
    (entry: Omit<TranscriptEntry, 'id' | 'timestamp'>): TranscriptEntry => {
      const fullEntry: TranscriptEntry = {
        ...entry,
        id: `tr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        timestamp: formatClockTimestamp(),
      };
      const next = [...transcriptRef.current, fullEntry];
      transcriptRef.current = next;
      setTranscript(next);
      return fullEntry;
    },
    []
  );

  const scrollTranscriptToTop = () => {
    if (transcriptViewportRef.current) {
      transcriptViewportRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const scrollTranscriptToBottom = () => {
    if (transcriptViewportRef.current) {
      transcriptViewportRef.current.scrollTo({
        top: transcriptViewportRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  };

  // Auto-scroll transcript smoothly to latest turn whenever transcript or live captions change
  useEffect(() => {
    scrollTranscriptToBottom();
  }, [transcript.length, interimTranscript, committedTranscript]);

  // Helper to speak AI utterance unless muted
  const speakAsInterviewer = useCallback(
    (text: string, onEnd?: () => void) => {
      if (voiceMuted) {
        onEnd?.();
        return;
      }
      void speak({
        text,
        persona: interviewSetup.aiPersona,
        voiceOverride: selectedVoice,
        onEnd,
      });
    },
    [voiceMuted, speak, interviewSetup.aiPersona, selectedVoice]
  );

  // Step 1 on Mount: AI reviews Job Role, JD, and Resume -> prepares ordered topics -> greets candidate + gives smart overview -> asks if ready
  useEffect(() => {
    if (initializedPlanRef.current) return;
    initializedPlanRef.current = true;

    let cancelled = false;
    async function initializePlannedInterview() {
      setPhase('planning');
      try {
        const res = await fetch('/api/ai/interview/plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            candidateName: user?.name || profile.fullName || 'Candidate',
            targetRole: interviewSetup.targetRole,
            targetCompany: interviewSetup.targetCompany,
            interviewType: interviewSetup.interviewType,
            difficulty: interviewSetup.difficulty,
            questionCount: interviewSetup.questionCount || 4,
            aiPersona: interviewSetup.aiPersona,
            resumeSummary: {
              headline: profile.headline,
              skills: profile.skills,
              experiences: profile.extractedExperiences,
              matchedSkills: resumeAnalysis.matchAnalysis.matchedSkills.map((s) => s.skill),
              missingSkills: resumeAnalysis.matchAnalysis.missingSkills.map((s) => s.skill),
              suggestedFocusAreas: resumeAnalysis.matchAnalysis.suggestedFocusAreas,
            },
            jobDescriptionText,
          }),
        });

        if (cancelled) return;
        const data = await res.json();
        const plan = data?.plan;

        if (plan?.topicOrder && plan?.questions) {
          setPlannedTopics(plan.topicOrder);
          setPlannedQuestions(plan.questions);
          setPhase('greeting-ready-check');

          const greetingEntry: TranscriptEntry = {
            id: `tr_greeting_${Date.now()}`,
            speaker: 'ai',
            speakerName: interviewSetup.aiPersona,
            kind: 'greeting',
            text: plan.greetingOverview,
            timestamp: formatClockTimestamp(),
          };
          transcriptRef.current = [greetingEntry];
          setTranscript([greetingEntry]);

          speakAsInterviewer(plan.greetingOverview);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[InterviewRoom] Plan initialization error:', err);
          setPhase('greeting-ready-check');
        }
      }
    }

    void initializePlannedInterview();
    return () => {
      cancelled = true;
      stopSpeaking();
    };
  }, []);

  // Live session timer
  useEffect(() => {
    const timer = setInterval(() => {
      if (phase === 'listening' || phase === 'asking-question' || phase === 'ai-thinking') {
        setQuestionSeconds((prev) => prev + 1);
      }
      setTotalSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [phase]);

  // Dynamic acoustic waveform animation
  useEffect(() => {
    if (isSpeaking || isListening) {
      const interval = setInterval(() => {
        setAudioBars([
          Math.floor(Math.random() * 8) + 3,
          Math.floor(Math.random() * 11) + 4,
          Math.floor(Math.random() * 14) + 6,
          Math.floor(Math.random() * 10) + 4,
          Math.floor(Math.random() * 15) + 6,
          Math.floor(Math.random() * 12) + 5,
          Math.floor(Math.random() * 9) + 3,
          Math.floor(Math.random() * 13) + 5,
          Math.floor(Math.random() * 10) + 4,
          Math.floor(Math.random() * 6) + 2,
        ]);
      }, 110);
      return () => clearInterval(interval);
    } else {
      setAudioBars([2, 3, 2, 3, 2, 3, 2, 3, 2, 2]);
    }
  }, [isSpeaking, isListening]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Start Question #1 after candidate confirms readiness (either verbally or via button)
  const beginInterviewWithFirstQuestion = useCallback(
    (candidateConfirmationText?: string) => {
      const firstQ = questions[0];
      const firstTopic = plannedTopics[0];
      if (!firstQ) return;

      if (candidateConfirmationText) {
        appendTranscript({
          speaker: 'candidate',
          speakerName: user?.name || profile.fullName || 'Candidate',
          kind: 'response',
          text: candidateConfirmationText,
        });
      }

      setActiveQuestionIndex(0);
      setQuestionSeconds(0);
      setPhase('asking-question');

      const openingBridge = `Great, let's get started with topic 1: ${
        firstTopic?.title || firstQ.category
      }. ${firstQ.questionText}`;

      appendTranscript({
        speaker: 'ai',
        speakerName: interviewSetup.aiPersona,
        kind: 'question',
        topicOrder: 1,
        topicTitle: firstTopic?.title || firstQ.category,
        text: openingBridge,
      });

      speakAsInterviewer(openingBridge, () => {
        setPhase('listening');
      });

      // Immediately transition phase cleanly to listening if voice is muted
      if (voiceMuted) {
        setPhase('listening');
      }
    },
    [
      questions,
      plannedTopics,
      appendTranscript,
      user?.name,
      profile.fullName,
      setActiveQuestionIndex,
      interviewSetup.aiPersona,
      speakAsInterviewer,
      voiceMuted,
    ]
  );

  const handleToggleMicrophone = async () => {
    if (isListening) {
      await handleSubmitSpokenTurn();
    } else {
      resetCapturedSpeech();
      if (phase === 'asking-question') {
        setPhase('listening');
      }
      await startListening();
    }
  };

  // Submit the candidate's spoken audio response to real-time AI evaluator
  const handleSubmitSpokenTurn = async () => {
    setIsProcessingTurn(true);
    try {
      const recordedText = await stopListening();
      const spokenText = (recordedText || getCombinedTranscript()).trim();
      resetCapturedSpeech();

      if (!spokenText) {
        showToast({
          title: 'No Speech Detected',
          message: 'Tap the microphone and speak your answer clearly before submitting.',
          type: 'warning',
        });
        setIsProcessingTurn(false);
        return;
      }

      // Phase A: Greeting Ready Check -> confirm readiness verbally
      if (phase === 'greeting-ready-check') {
        if (isCandidateReadyConfirmation(spokenText)) {
          beginInterviewWithFirstQuestion(spokenText);
        } else {
          appendTranscript({
            speaker: 'candidate',
            speakerName: user?.name || profile.fullName || 'Candidate',
            kind: 'response',
            text: spokenText,
          });
          const clarifyPrompt =
            'Take your time—whenever you feel set to begin topic one, just say "Yes, I\'m ready".';
          appendTranscript({
            speaker: 'ai',
            speakerName: interviewSetup.aiPersona,
            kind: 'greeting',
            text: clarifyPrompt,
          });
          speakAsInterviewer(clarifyPrompt);
        }
        setIsProcessingTurn(false);
        return;
      }

      // Phase B: Active Topic Question / Follow-Up -> record verbal answer & get real-time AI response
      const idx = activeQuestionIndex;
      const q = questions[idx];
      const topic = plannedTopics[idx] || {
        id: `topic_${idx + 1}`,
        order: idx + 1,
        title: q?.category || `Topic ${idx + 1}`,
        category: q?.category || 'Technical',
        focusSource: 'jd' as const,
        rationale: '',
      };

      const existingFollowUps = followUpCounts[idx] || 0;
      const primaryText = primaryAnswersByIdx[idx];

      appendTranscript({
        speaker: 'candidate',
        speakerName: user?.name || profile.fullName || 'Candidate',
        kind: 'response',
        topicOrder: topic.order,
        topicTitle: topic.title,
        text: spokenText,
      });

      if (existingFollowUps === 0) {
        setPrimaryAnswersByIdx((prev) => ({ ...prev, [idx]: spokenText }));
        saveAnswer(q.id, spokenText, questionSeconds);
      } else {
        const meta = followUpMetaByIdx[idx];
        saveAnswer(q.id, primaryText || spokenText, questionSeconds, {
          triggerReason: meta?.triggerReason || 'Real-time adaptive follow-up probe',
          followUpQuestion: meta?.followUpQuestion || 'Follow-up probe',
          followUpAnswer: spokenText,
        });
      }

      setPhase('ai-thinking');

      const nextIdx = idx + 1;
      const nextTopic = plannedTopics[nextIdx] || null;
      const nextQuestion = questions[nextIdx] || null;

      const res = await fetch('/api/ai/interview/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateName: user?.name || profile.fullName || 'Candidate',
          targetRole: interviewSetup.targetRole,
          targetCompany: interviewSetup.targetCompany,
          aiPersona: interviewSetup.aiPersona,
          currentTopic: topic,
          currentQuestion: q,
          candidateSpokenText: spokenText,
          followUpCountForTopic: existingFollowUps,
          nextTopic,
          nextQuestion,
          recentTranscript: transcriptRef.current.slice(-4).map((t) => ({ speaker: t.speakerName, text: t.text })),
        }),
      });

      const turn = await res.json();

      if (turn.action === 'follow_up') {
        setFollowUpCounts((prev) => ({ ...prev, [idx]: existingFollowUps + 1 }));
        setFollowUpMetaByIdx((prev) => ({
          ...prev,
          [idx]: {
            triggerReason: turn.triggerReason || 'Real-time adaptive deep dive',
            followUpQuestion: turn.followUpQuestion || turn.spokenResponse,
          },
        }));

        setPhase('asking-question');
        appendTranscript({
          speaker: 'ai',
          speakerName: interviewSetup.aiPersona,
          kind: 'follow-up',
          topicOrder: topic.order,
          topicTitle: topic.title,
          text: turn.spokenResponse,
        });

        speakAsInterviewer(turn.spokenResponse, () => {
          setPhase('listening');
        });
        if (voiceMuted) setPhase('listening');
      } else if (turn.action === 'next_topic' && nextQuestion) {
        setActiveQuestionIndex(nextIdx);
        setQuestionSeconds(0);
        setPhase('asking-question');

        appendTranscript({
          speaker: 'ai',
          speakerName: interviewSetup.aiPersona,
          kind: 'question',
          topicOrder: nextTopic?.order || nextIdx + 1,
          topicTitle: nextTopic?.title || nextQuestion.category,
          text: turn.spokenResponse,
        });

        speakAsInterviewer(turn.spokenResponse, () => {
          setPhase('listening');
        });
        if (voiceMuted) setPhase('listening');
      } else {
        setPhase('completed');
        setIsFinishingReport(true);
        appendTranscript({
          speaker: 'ai',
          speakerName: interviewSetup.aiPersona,
          kind: 'summary',
          text: turn.spokenResponse,
        });

        speakAsInterviewer(turn.spokenResponse);
        await finishInterviewSession({
          transcript: transcriptRef.current,
          durationSeconds: totalSeconds,
        });
        showToast({
          title: 'Verbal Interview Evaluated & Saved',
          message: 'Real-time evaluation report generated from your transcript and saved to your account.',
          type: 'success',
        });
        setIsFinishingReport(false);
        navigate('/evaluation-reports');
      }
    } catch (err) {
      console.error('[InterviewRoom] Verbal turn error:', err);
      setIsFinishingReport(false);
      setPhase('listening');
      showToast({
        title: 'Turn Processing Notice',
        message: 'Recovered session state—please continue speaking when ready.',
        type: 'warning',
      });
    } finally {
      setIsProcessingTurn(false);
    }
  };

  const handleVoiceChange = (newVoice: 'Kore' | 'Zephyr' | 'Charon' | 'Puck' | 'Fenrir') => {
    setSelectedVoice(newVoice);
    updateInterviewSetup({ voiceName: newVoice });
    showToast({
      title: 'Interviewer Voice Updated',
      message: `Switched neural voice agent to ${getVoiceToneLabel(interviewSetup.aiPersona, newVoice)}.`,
      type: 'info',
    });
  };

  const handleToggleMuteVoice = () => {
    const nextMuted = !voiceMuted;
    setVoiceMuted(nextMuted);
    if (nextMuted) {
      stopSpeaking();
    }
  };

  const handleConfirmEndInterview = async () => {
    if (isFinishingReport) return;
    setIsFinishingReport(true);
    try {
      await stopListening();
      stopSpeaking();
      await finishInterviewSession({
        transcript: transcriptRef.current,
        durationSeconds: totalSeconds,
      });
      showToast({
        title: 'Evaluation Report Saved',
        message: 'Generated real-time scorecard from your conversation transcript and saved to your profile.',
        type: 'success',
      });
      setEndModalOpen(false);
      navigate('/evaluation-reports');
    } catch (err) {
      console.error('[InterviewRoom] Finalize error:', err);
      showToast({
        title: 'Report Generation Notice',
        message: 'Could not finalize report. Please try again.',
        type: 'warning',
      });
    } finally {
      setIsFinishingReport(false);
    }
  };

  const totalTopics = plannedTopics.length || questions.length || 4;
  const completedTopicsCount =
    phase === 'greeting-ready-check' || phase === 'planning'
      ? 0
      : phase === 'completed'
      ? totalTopics
      : activeQuestionIndex;
  const progressPercent = Math.round(((completedTopicsCount + (phase === 'listening' ? 0.5 : 0)) / totalTopics) * 100);
  const liveSpeechDraft = [committedTranscript.trim(), interimTranscript.trim()].filter(Boolean).join(' ');

  return (
    <div className="flex flex-col w-full gap-5 pb-12 antialiased">
      {/* Top Session Header */}
      <div className="bg-white border border-[#e2e8f0] shadow-sm rounded-xl px-5 py-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          <div className="w-2.5 h-2.5 rounded-full bg-[#4f46e5] animate-pulse shrink-0" />
          <div className="min-w-0 text-left">
            <div className="flex items-center gap-2 text-xs text-[#565e74] flex-wrap">
              <span className="font-bold text-[#3525cd] uppercase tracking-wider">Verbal AI Interview</span>
              <span aria-hidden="true">·</span>
              <span>
                {interviewSetup.targetCompany} · {interviewSetup.difficulty === 'senior-staff' ? 'L6 Staff Track' : interviewSetup.difficulty}
              </span>
            </div>
            <h1 className="font-heading text-base sm:text-lg font-bold text-[#0b1c30] leading-snug mt-0.5">
              {interviewSetup.targetRole} — Spoken Loop with {interviewSetup.aiPersona}
            </h1>
          </div>
        </div>

        {/* Planned Topic Progress */}
        <div className="flex flex-col items-start xl:items-center gap-1.5 px-1 shrink-0">
          <div className="flex items-center gap-2 text-xs text-[#565e74] tabular-nums whitespace-nowrap">
            <span className="font-bold text-[#0b1c30]">
              {phase === 'greeting-ready-check'
                ? 'Overview & Ready Check'
                : phase === 'planning'
                ? 'Preparing Topics...'
                : `Topic ${Math.min(activeQuestionIndex + 1, totalTopics)} of ${totalTopics}`}
            </span>
            <span className="text-[#777587]">({Math.min(100, progressPercent)}%)</span>
          </div>
          <div className="w-40 bg-[#e5eeff] h-2 rounded-full overflow-hidden">
            <motion.div
              className="bg-[#4f46e5] h-full rounded-full"
              initial={{ width: '0%' }}
              animate={{ width: `${Math.max(8, Math.min(100, progressPercent))}%` }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
        </div>

        {/* Clocks & End CTA */}
        <div className="flex items-center gap-4 shrink-0 justify-between md:justify-end">
          <div className="text-right tabular-nums">
            <div className="flex items-center justify-end gap-1 text-xs font-semibold text-[#0b1c30]">
              <Timer className="w-3.5 h-3.5 text-[#3525cd]" />
              <span className="font-mono">{formatTime(questionSeconds)}</span>
              <span className="text-[#777587] font-normal">topic</span>
            </div>
            <div className="text-[11px] text-[#565e74]">
              Session elapsed: <span className="font-mono font-medium text-[#0b1c30]">{formatTime(totalSeconds)}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setEndModalOpen(true)}
            className="bg-[#ffdad6] text-[#93000a] hover:bg-[#ba1a1a] hover:text-white px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm active:scale-95"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>End Interview</span>
          </button>
        </div>
      </div>

      {/* Main Split-Screen Verbal Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT PANEL (5 cols): AI Voice Stage, Planned Topic Order & Rubric */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          {/* AI Voice Stage Card */}
          <div className="bg-white rounded-xl p-5 border border-[#e2e8f0] shadow-sm relative overflow-hidden text-left">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative shrink-0">
                  <div
                    className={`w-14 h-14 rounded-full bg-gradient-to-br from-[#4f46e5] to-[#3525cd] text-white flex items-center justify-center font-heading text-lg font-bold shadow-sm transition-transform duration-300 ${
                      isSpeaking ? 'scale-105 ring-4 ring-[#4f46e5]/25' : 'ring-2 ring-[#e5eeff]'
                    }`}
                  >
                    {interviewSetup.aiPersona
                      .split(' ')
                      .map((p) => p[0])
                      .join('')
                      .slice(0, 2)}
                  </div>
                  <span
                    className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full ring-2 ring-white ${
                      isSpeaking ? 'bg-emerald-500 animate-pulse' : 'bg-[#4f46e5]'
                    }`}
                  />
                </div>
                <div className="min-w-0">
                  <h2 className="font-heading text-sm font-bold text-[#0b1c30] truncate">
                    {interviewSetup.aiPersona}
                  </h2>
                  <p className="text-xs text-[#565e74] truncate">
                    {getVoiceToneLabel(interviewSetup.aiPersona, selectedVoice)}
                  </p>
                  <p className="text-[11px] text-[#777587] truncate mt-0.5">
                    {voiceProvider === 'gemini-neural-tts' ? 'Neural Human Voice Agent' : 'Natural Browser Voice'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleToggleMuteVoice}
                aria-label={voiceMuted ? 'Unmute AI interviewer voice' : 'Mute AI interviewer voice'}
                className={`p-2 rounded-lg border text-xs font-semibold transition-colors shrink-0 ${
                  voiceMuted
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : 'bg-[#f8f9ff] text-[#3525cd] border-[#e2e8f0] hover:bg-[#eff4ff]'
                }`}
                title={voiceMuted ? 'Unmute AI Voice' : 'Mute AI Voice'}
              >
                {voiceMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </div>

            {/* Acoustic Voice Monitor & Waveform */}
            <div className="bg-[#f8f9ff] rounded-xl p-3.5 border border-[#e2e8f0] flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs text-[#565e74]">
                <span className="flex items-center gap-1.5 font-medium text-[#0b1c30]">
                  <AudioLines
                    className={`w-4 h-4 ${
                      isSpeaking
                        ? 'text-[#3525cd]'
                        : isListening
                        ? 'text-red-600'
                        : 'text-[#777587]'
                    }`}
                  />
                  <span>
                    {isSynthesizing
                      ? 'Synthesizing natural voice response...'
                      : isSpeaking
                      ? `${interviewSetup.aiPersona} is speaking...`
                      : isListening
                      ? 'Listening to your spoken response...'
                      : isProcessingTurn || isTranscribingAudio
                      ? 'Analyzing response for real-time follow-up...'
                      : phase === 'greeting-ready-check'
                      ? 'Awaiting your verbal ready confirmation'
                      : 'Voice session ready'}
                  </span>
                </span>
                <span className="font-mono text-[11px] text-[#3525cd] tabular-nums">
                  {activeVoiceName}
                </span>
              </div>

              {/* Waveform Bars */}
              <div className="flex items-center gap-1.5 h-8 pt-1 justify-center">
                {audioBars.map((h, bIdx) => (
                  <div
                    key={bIdx}
                    className={`w-[4px] rounded-full transition-all duration-100 ${
                      isListening
                        ? 'bg-red-500'
                        : isSpeaking
                        ? 'bg-[#4f46e5]'
                        : 'bg-[#c7c4d8]'
                    }`}
                    style={{ height: `${Math.max(6, h * 2.2)}px` }}
                  />
                ))}
              </div>
            </div>

            {/* Voice Selector & Autoplay / Replay Controls */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <label htmlFor="room-voice-picker" className="text-[11px] font-semibold text-[#565e74]">
                  Voice:
                </label>
                <select
                  id="room-voice-picker"
                  value={selectedVoice}
                  onChange={(e) => handleVoiceChange(e.target.value as any)}
                  className="bg-[#f8f9ff] border border-[#e2e8f0] rounded-lg px-2 py-1 text-[11px] font-semibold text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#4f46e5]"
                >
                  {INTERVIEWER_VOICE_OPTIONS.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                {audioBlocked && (
                  <button
                    type="button"
                    onClick={replayLastSpeech}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#4f46e5] text-white hover:bg-[#3525cd] transition-colors shadow-sm"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Play AI Voice</span>
                  </button>
                )}
                {!audioBlocked && (
                  <button
                    type="button"
                    onClick={() => (isSpeaking ? stopSpeaking() : replayLastSpeech())}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#4f46e5] hover:bg-[#eff4ff] border border-[#c7d2fe] transition-colors"
                  >
                    {isSpeaking ? <VolumeX className="w-3.5 h-3.5 text-red-600" /> : <Volume2 className="w-3.5 h-3.5" />}
                    <span>{isSpeaking ? 'Pause Voice' : 'Replay Prompt'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* PINNED CLICK-TO-SPEAK CONTROLS — Placed directly below AI Voice Box for instant Android/Mobile tap */}
          <div
            data-testid="pinned-speak-controls"
            className="bg-white rounded-xl p-4 sm:p-5 border border-[#c7d2fe] shadow-sm text-left space-y-3"
          >
            {micError && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-2">
                <span>{micError}</span>
              </div>
            )}

            {phase === 'planning' && (
              <div className="flex items-center gap-2.5 text-xs text-[#565e74]">
                <RefreshCw className="w-4 h-4 text-[#4f46e5] animate-spin shrink-0" />
                <span>Preparing voice session and topic plan from your JD &amp; resume...</span>
              </div>
            )}

            {phase === 'greeting-ready-check' && (
              <div className="space-y-3">
                <div>
                  <div className="text-xs font-bold text-[#0b1c30] flex items-center justify-between gap-2">
                    <span>Ready Check from {interviewSetup.aiPersona}</span>
                    <span className="text-[10px] font-semibold text-[#3525cd] bg-[#eff4ff] px-2 py-0.5 rounded-full">
                      Verbal Reply
                    </span>
                  </div>
                  <p className="text-xs text-[#464555] mt-1 leading-relaxed">
                    Speak &ldquo;Yes, I&apos;m ready&rdquo; into your mic or tap Start below to hear Topic 1.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleToggleMicrophone}
                    disabled={isProcessingTurn}
                    className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all border ${
                      isListening
                        ? 'bg-red-600 text-white border-red-700 shadow-sm'
                        : 'bg-[#eff4ff] text-[#3525cd] border-[#c7d2fe] hover:bg-[#e5eeff]'
                    }`}
                  >
                    {isListening ? <MicOff className="w-4 h-4 animate-pulse" /> : <Mic className="w-4 h-4" />}
                    <span>{isListening ? 'Submit Spoken Reply' : 'Speak Ready Reply'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => beginInterviewWithFirstQuestion("Yes, I'm ready to begin.")}
                    disabled={isProcessingTurn}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#4f46e5] hover:bg-[#3525cd] text-white shadow-sm transition-all active:scale-95"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>I&apos;m Ready — Start Interview</span>
                  </button>
                </div>
              </div>
            )}

            {phase !== 'greeting-ready-check' && phase !== 'planning' && phase !== 'completed' && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-[#0b1c30]">
                    Your Verbal Response
                  </span>
                  <span className="text-[11px] font-medium text-[#565e74]">
                    Topic {Math.min(activeQuestionIndex + 1, totalTopics)} of {totalTopics}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleToggleMicrophone}
                  disabled={isProcessingTurn || isTranscribingAudio}
                  className={`w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-sm active:scale-95 disabled:opacity-60 ${
                    isListening
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-[#4f46e5] hover:bg-[#3525cd] text-white'
                  }`}
                >
                  {isProcessingTurn || isTranscribingAudio ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>
                        {isTranscribingAudio
                          ? 'Transcribing Audio...'
                          : 'AI Evaluating Spoken Answer...'}
                      </span>
                    </>
                  ) : isListening ? (
                    <>
                      <MicOff className="w-4 h-4 animate-pulse" />
                      <span>Stop Speaking &amp; Submit Answer</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4" />
                      <span>Speak Your Answer</span>
                    </>
                  )}
                </button>

                {isListening && (
                  <div className="p-3 rounded-lg bg-[#eff4ff] border border-[#4f46e5]/30 text-xs text-[#0b1c30] leading-relaxed">
                    <div className="flex items-center gap-1.5 text-[11px] text-red-600 font-semibold mb-1">
                      <Radio className="w-3 h-3 animate-pulse" />
                      <span>Capturing live voice...</span>
                    </div>
                    <p>{liveSpeechDraft || 'Speak naturally into your microphone...'}</p>
                  </div>
                )}

                <p className="text-[11px] text-[#565e74] flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-[#4f46e5] shrink-0" />
                  <span>Verbal-only mode: AI listens &amp; triggers adaptive follow-ups in real time</span>
                </p>
              </div>
            )}

            {phase === 'completed' && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-3 text-xs text-emerald-900">
                <span className="font-semibold">
                  {isFinishingReport
                    ? 'Analyzing your candidate responses and saving report to database...'
                    : 'All planned topics completed. Redirecting to your evaluation scorecard...'}
                </span>
                <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
              </div>
            )}
          </div>

          {/* Planned Interview Order Card (Built from Job Role + JD + Resume) */}
          <div className="bg-white rounded-xl p-5 border border-[#e2e8f0] shadow-sm text-left">
            <div className="flex items-center justify-between pb-3 border-b border-[#e2e8f0] mb-3">
              <div className="flex items-center gap-2">
                <ListOrdered className="w-4 h-4 text-[#3525cd]" />
                <div>
                  <h3 className="font-heading text-sm font-bold text-[#0b1c30]">
                    Planned Interview Topic Order
                  </h3>
                  <p className="text-[11px] text-[#565e74]">
                    Curated from {interviewSetup.targetRole} JD &amp; your resume
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-[#3525cd] whitespace-nowrap shrink-0">
                {plannedTopics.length} Topics
              </span>
            </div>

            {phase === 'planning' ? (
              <div className="space-y-2.5 py-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 rounded-lg bg-[#eff4ff] animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {plannedTopics.map((topic, idx) => {
                  const isActive =
                    phase !== 'greeting-ready-check' &&
                    phase !== 'completed' &&
                    idx === activeQuestionIndex;
                  const isDone =
                    phase === 'completed' ||
                    (phase !== 'greeting-ready-check' && idx < activeQuestionIndex);
                  const followUps = followUpCounts[idx] || 0;

                  return (
                    <div
                      key={topic.id}
                      className={`p-3 rounded-lg border transition-all duration-200 ${
                        isActive
                          ? 'bg-[#eff4ff] border-[#4f46e5] shadow-xs'
                          : isDone
                          ? 'bg-[#f8f9ff] border-[#e2e8f0] opacity-80'
                          : 'bg-white border-[#e2e8f0]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <span
                            className={`w-5 h-5 rounded-md text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5 ${
                              isDone
                                ? 'bg-emerald-600 text-white'
                                : isActive
                                ? 'bg-[#4f46e5] text-white'
                                : 'bg-[#e5eeff] text-[#3525cd]'
                            }`}
                          >
                            {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : topic.order}
                          </span>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-[#0b1c30] leading-snug">
                              {topic.title}
                            </div>
                            <div className="text-[11px] text-[#565e74] mt-0.5 leading-relaxed">
                              {topic.rationale}
                            </div>
                          </div>
                        </div>

                        <span className="text-[10px] font-semibold text-[#565e74] whitespace-nowrap shrink-0">
                          {isDone
                            ? 'Completed'
                            : isActive && followUps > 0
                            ? 'Follow-up'
                            : isActive
                            ? 'Active'
                            : 'Queued'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Active Topic Rubric Focus (shown once questioning begins) */}
          <AnimatePresence mode="wait">
            {phase !== 'greeting-ready-check' && phase !== 'planning' && currentQuestion && (
              <motion.div
                key={currentQuestion.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22 }}
                className="bg-white rounded-xl p-5 border border-[#e2e8f0] shadow-sm text-left space-y-3"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#3525cd]">
                    {currentTopic?.title || currentQuestion.category} · {currentQuestion.difficulty}
                  </span>
                  <span className="text-[#777587] font-mono tabular-nums">
                    Q{activeQuestionIndex + 1}
                  </span>
                </div>

                {currentQuestion.contextOrConstraint && (
                  <p className="text-xs text-[#464555] bg-[#f8f9ff] p-3 rounded-lg border border-[#e2e8f0] leading-relaxed">
                    <strong className="text-[#0b1c30]">Scenario Scope: </strong>
                    {currentQuestion.contextOrConstraint}
                  </p>
                )}

                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-semibold text-[#565e74] block">
                    Live Rubric Focus
                  </span>
                  {currentQuestion.evaluationRubric.map((r, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-xs py-1 px-2.5 rounded bg-[#f8f9ff]"
                    >
                      <span className="text-[#0b1c30] font-medium">{r.criterion}</span>
                      <span className="text-[#3525cd] font-bold tabular-nums">{r.weight}%</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* RIGHT PANEL (7 cols): Verbal Console + Fixed-Height Scrollable Transcript Window */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm flex flex-col overflow-hidden text-left">
            {/* Transcript Window Header Bar with Top / Bottom Scroll Controls */}
            <div className="px-5 py-3.5 border-b border-[#e2e8f0] bg-[#f8f9ff] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#3525cd]" />
                <div>
                  <h3 className="font-heading text-sm font-bold text-[#0b1c30]">
                    Live Verbal Transcript
                  </h3>
                  <p className="text-[11px] text-[#565e74]">
                    {transcript.length} recorded turns · Fixed scrollable window
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={scrollTranscriptToTop}
                  aria-label="Scroll transcript to top"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-[#eff4ff] text-[#0b1c30] text-[11px] font-semibold border border-[#e2e8f0] transition-colors shadow-xs"
                >
                  <ArrowUp className="w-3 h-3 text-[#3525cd]" />
                  <span>Top</span>
                </button>
                <button
                  type="button"
                  onClick={scrollTranscriptToBottom}
                  aria-label="Scroll transcript to bottom"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-[#eff4ff] text-[#0b1c30] text-[11px] font-semibold border border-[#e2e8f0] transition-colors shadow-xs"
                >
                  <ArrowDown className="w-3 h-3 text-[#3525cd]" />
                  <span>Bottom</span>
                </button>
              </div>
            </div>

            {/* Bounded Scrollable Transcript Feed (fixed height so it never fills the screen) */}
            <div
              ref={transcriptViewportRef}
              data-testid="interview-transcript-window"
              className="h-[360px] sm:h-[400px] overflow-y-auto custom-scrollbar px-5 py-4 space-y-3.5 bg-[#fcfdff]"
            >
              {phase === 'planning' && transcript.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center gap-3 text-[#565e74]">
                  <RefreshCw className="w-6 h-6 text-[#4f46e5] animate-spin" />
                  <p className="text-xs max-w-sm leading-relaxed">
                    Reviewing your resume, {interviewSetup.targetRole} track, and {interviewSetup.targetCompany} job description to organize your interview topic order...
                  </p>
                </div>
              ) : (
                <>
                  {transcript.map((item) => {
                    const isAi = item.speaker === 'ai';
                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className={`flex flex-col ${isAi ? 'items-start' : 'items-end'}`}
                      >
                        <div className="flex items-center gap-2 text-[11px] text-[#777587] mb-1 px-1">
                          <span className="font-semibold text-[#0b1c30]">
                            {isAi ? item.speakerName : `${item.speakerName} (You)`}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>
                            {item.kind === 'greeting'
                              ? 'Greeting & Topic Plan'
                              : item.kind === 'follow-up'
                              ? 'Real-time Follow-up'
                              : item.kind === 'question'
                              ? `Topic ${item.topicOrder || ''}`
                              : item.kind === 'summary'
                              ? 'Closing'
                              : 'Verbal Response'}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">{item.timestamp}</span>
                        </div>

                        <div
                          className={`max-w-[90%] rounded-xl px-4 py-3 text-xs sm:text-[13px] leading-relaxed shadow-xs border ${
                            isAi
                              ? 'bg-white border-[#e2e8f0] text-[#0b1c30]'
                              : 'bg-[#4f46e5] border-[#3525cd] text-white'
                          }`}
                        >
                          {item.topicTitle && isAi && (
                            <div className="text-[11px] font-semibold text-[#3525cd] mb-1">
                              {item.topicTitle}
                            </div>
                          )}
                          <p>{item.text}</p>
                        </div>
                      </motion.div>
                    );
                  })}

                  {/* Live real-time speech stream bubble while user is speaking */}
                  {isListening && (
                    <div className="flex flex-col items-end">
                      <div className="flex items-center gap-1.5 text-[11px] text-red-600 font-semibold mb-1 px-1">
                        <Radio className="w-3 h-3 animate-pulse" />
                        <span>Capturing live voice...</span>
                      </div>
                      <div className="max-w-[90%] rounded-xl px-4 py-3 text-xs sm:text-[13px] leading-relaxed bg-[#eff4ff] border border-[#4f46e5]/40 text-[#0b1c30]">
                        {liveSpeechDraft || 'Speak naturally into your microphone...'}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Transcript Footer Status Strip */}
            <div className="px-5 py-3 border-t border-[#e2e8f0] bg-[#f8f9ff] flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#565e74]">
              <span>
                Use the <strong className="text-[#0b1c30]">Speak</strong> button right under the AI interviewer voice card to reply.
              </span>
              <span className="font-mono text-[#3525cd] font-semibold">
                {transcript.filter((t) => t.speaker === 'candidate' && t.kind === 'response').length} spoken replies recorded
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* End Interview Confirmation Modal */}
      <AnimatePresence>
        {endModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.18 }}
              className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#e2e8f0] relative text-left"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#e2e8f0] mb-4">
                <div className="flex items-center gap-2 text-[#93000a]">
                  <AlertTriangle className="w-5 h-5" />
                  <h3 className="font-heading text-base font-bold text-[#0b1c30]">End Interview Session?</h3>
                </div>
                <button
                  type="button"
                  disabled={isFinishingReport}
                  onClick={() => setEndModalOpen(false)}
                  className="p-1 text-[#565e74] hover:text-[#0b1c30] rounded-lg disabled:opacity-50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-[#464555] leading-relaxed mb-4">
                Ending the interview analyzes your actual AI &amp; candidate conversation transcript and saves a real-time evaluation report to your account.
              </p>

              <div className="p-3 bg-[#eff4ff] rounded-lg border border-[#c7c4d8]/40 text-xs text-[#0b1c30] mb-5">
                <span>
                  Topics covered: <strong>{Math.max(answers.length, completedTopicsCount)} of {totalTopics}</strong> · Recorded turns: <strong>{transcript.length}</strong>
                </span>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={isFinishingReport}
                  onClick={() => setEndModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-[#565e74] hover:bg-[#eff4ff] border border-[#e2e8f0] transition-colors disabled:opacity-50"
                >
                  Continue Interview
                </button>
                <button
                  type="button"
                  disabled={isFinishingReport}
                  onClick={handleConfirmEndInterview}
                  className="px-5 py-2 rounded-lg text-xs font-semibold bg-[#ba1a1a] hover:bg-red-800 text-white shadow-sm flex items-center gap-1.5 transition-colors active:scale-95 disabled:opacity-70"
                >
                  {isFinishingReport ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Generating &amp; Saving Report...</span>
                    </>
                  ) : (
                    <>
                      <FileCheck className="w-4 h-4" />
                      <span>Confirm &amp; Generate Report</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
