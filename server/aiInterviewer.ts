import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

export type PersonaName = 'Sarah' | 'Dr. Elena Vance' | 'Marcus Reed' | 'David Chen';
export type PrebuiltVoiceName = 'Kore' | 'Zephyr' | 'Charon' | 'Puck' | 'Fenrir';

export interface VoicePersonaConfig {
  persona: PersonaName;
  voiceName: PrebuiltVoiceName;
  roleTitle: string;
  toneLabel: string;
  speechStyle: string;
}

export const VOICE_PERSONAS: Record<PersonaName, VoicePersonaConfig> = {
  Sarah: {
    persona: 'Sarah',
    voiceName: 'Kore',
    roleTitle: 'Principal Systems Architect & Bar Raiser',
    toneLabel: 'Kore · Warm Executive',
    speechStyle:
      'Authentic Principal Systems Architect speaking live in a 1-on-1 engineering interview; warm, conversational human cadence with natural micro-pauses, empathetic listening tone, never robotic or announcer-like.',
  },
  'Dr. Elena Vance': {
    persona: 'Dr. Elena Vance',
    voiceName: 'Zephyr',
    roleTitle: 'AI Infrastructure Lead',
    toneLabel: 'Zephyr · Crisp Analytical',
    speechStyle:
      'Real Staff Infrastructure Lead conducting a thoughtful technical interview; crisp, unhurried conversational inflection, genuinely curious and composed human voice.',
  },
  'Marcus Reed': {
    persona: 'Marcus Reed',
    voiceName: 'Charon',
    roleTitle: 'Engineering Director',
    toneLabel: 'Charon · Grounded Executive',
    speechStyle:
      'Seasoned Engineering Director speaking naturally in a live panel; calm baritone warmth, steady conversational rhythm, authentic executive composure.',
  },
  'David Chen': {
    persona: 'David Chen',
    voiceName: 'Puck',
    roleTitle: 'Staff Frontend Lead',
    toneLabel: 'Puck · Collaborative Lead',
    speechStyle:
      'Collaborative Staff Engineer having a natural peer-level architecture chat; engaging, clear, friendly human pacing and expressive emphasis.',
  },
};

export interface PlannedTopicItem {
  id: string;
  order: number;
  title: string;
  category: string;
  focusSource: 'resume' | 'jd' | 'role-calibration';
  rationale: string;
}

export interface PlannedInterviewQuestion {
  id: string;
  topicId: string;
  order: number;
  category: string;
  difficulty: 'L4' | 'L5' | 'L6' | 'L7';
  questionText: string;
  contextOrConstraint?: string;
  evaluationRubric: {
    criterion: string;
    weight: number;
    description: string;
  }[];
}

export interface InterviewPlanPayload {
  greetingOverview: string;
  topicOrder: PlannedTopicItem[];
  questions: PlannedInterviewQuestion[];
  source: 'gemini' | 'calibrated-fallback';
}

export interface PlanInput {
  candidateName?: string;
  targetRole: string;
  targetCompany: string;
  interviewType: string;
  difficulty: string;
  questionCount: number;
  aiPersona: string;
  resumeSummary?: {
    headline?: string;
    skills?: string[];
    experiences?: { role: string; company: string; bulletPoints?: string[] }[];
    matchedSkills?: string[];
    missingSkills?: string[];
    suggestedFocusAreas?: string[];
  };
  jobDescriptionText?: string;
}

let cachedAiClient: GoogleGenAI | null | undefined;

const TEXT_MODEL_CHAIN = ['gemini-4-hydrogen', 'gemini-3.1-flash-lite'] as const;
const TTS_MODEL_CHAIN = ['gemini-3.8-flash-tts', 'gemini-3.8-flash-lite-tts'] as const;

const modelCooldownUntil = new Map<string, number>();
const inFlightPlanRequests = new Map<string, Promise<InterviewPlanPayload>>();
const recentPlanCache = new Map<string, { plan: InterviewPlanPayload; expiresAt: number }>();
const ttsAudioCache = new Map<string, { audioBase64: string; mimeType: string; voiceName: PrebuiltVoiceName }>();

export function isQuotaOrRateLimitError(err: unknown): boolean {
  const msg = String((err as any)?.message || err || '').toLowerCase();
  const status = (err as any)?.status || (err as any)?.code;
  return (
    status === 429 ||
    msg.includes('429') ||
    msg.includes('resource_exhausted') ||
    msg.includes('quota exceeded') ||
    msg.includes('rate limit')
  );
}

export function parseRetryDelayMs(err: unknown): number {
  const raw = String((err as any)?.message || err || '');
  const match = raw.match(/retryDelay["']?\s*:\s*["']?(\d+)s/i) || raw.match(/retry in\s+(\d+)s/i);
  if (match && match[1]) {
    const secs = Number(match[1]);
    if (Number.isFinite(secs) && secs > 0) {
      return Math.min(secs * 1000, 60 * 60 * 1000); // cap at 1 hour in-memory
    }
  }
  return 15 * 60 * 1000;
}

export function isModelInCooldown(model: string): boolean {
  const until = modelCooldownUntil.get(model);
  if (!until) return false;
  if (Date.now() >= until) {
    modelCooldownUntil.delete(model);
    return false;
  }
  return true;
}

export function markModelCooldown(model: string, err: unknown): void {
  const wasCoolingDown = isModelInCooldown(model);
  const delayMs = isQuotaOrRateLimitError(err) ? parseRetryDelayMs(err) : 60 * 1000;
  modelCooldownUntil.set(model, Date.now() + delayMs);
  if (!wasCoolingDown) {
    const mins = Math.max(1, Math.round(delayMs / 60000));
    console.log(`[AI Model Cooldown] ${model} reached quota/rate limit; using fallback for ~${mins}m.`);
  }
}

export function resetModelCooldowns(): void {
  modelCooldownUntil.clear();
  inFlightPlanRequests.clear();
  recentPlanCache.clear();
  ttsAudioCache.clear();
}

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || !apiKey.trim()) {
    return null;
  }
  if (!cachedAiClient) {
    cachedAiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return cachedAiClient;
}

async function callJsonTextModelWithFallback(params: {
  ai: GoogleGenAI;
  prompt: string;
  responseSchema: any;
  timeoutMs: number;
}): Promise<string | null> {
  for (const model of TEXT_MODEL_CHAIN) {
    if (isModelInCooldown(model)) continue;

    try {
      const config: Record<string, any> = {
        responseMimeType: 'application/json',
        responseSchema: params.responseSchema,
      };
      if (model === 'gemini-4-hydrogen') {
        config.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
      }

      const response = await Promise.race([
        params.ai.models.generateContent({
          model,
          contents: params.prompt,
          config,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`${model} request timeout`)), params.timeoutMs)
        ),
      ]);
      const text = (response.text || '').trim();
      if (text) return text;
    } catch (err) {
      if (isQuotaOrRateLimitError(err)) {
        markModelCooldown(model, err);
      } else {
        console.log(`[AI Interviewer] ${model} switched to fallback (${(err as Error)?.message || 'transient error'}).`);
      }
    }
  }
  return null;
}

export function resolveVoiceConfig(personaName?: string, voiceOverride?: string): VoicePersonaConfig {
  const base = VOICE_PERSONAS[(personaName as PersonaName) || 'Sarah'] || VOICE_PERSONAS.Sarah;
  const validVoices: PrebuiltVoiceName[] = ['Kore', 'Zephyr', 'Charon', 'Puck', 'Fenrir'];
  if (voiceOverride && validVoices.includes(voiceOverride as PrebuiltVoiceName)) {
    return {
      ...base,
      voiceName: voiceOverride as PrebuiltVoiceName,
    };
  }
  return base;
}

function mapDifficultyLevel(difficulty: string): 'L4' | 'L5' | 'L6' | 'L7' {
  if (difficulty === 'entry') return 'L4';
  if (difficulty === 'mid') return 'L5';
  if (difficulty === 'principal') return 'L7';
  return 'L6';
}

function extractJdHighlights(jdText?: string): string[] {
  if (!jdText || !jdText.trim()) {
    return [
      'distributed state synchronization and fault-tolerant caching',
      'high-reliability architecture under latency and network jitter',
      'cross-functional technical leadership and tradeoff reasoning',
    ];
  }
  const lines = jdText
    .split('\n')
    .map((l) => l.replace(/^[•\-*]\s*/, '').trim())
    .filter((l) => l.length > 22 && !l.toLowerCase().startsWith('about the role'));
  return lines.slice(0, 4);
}

export function buildDeterministicInterviewPlan(input: PlanInput): InterviewPlanPayload {
  const firstName = (input.candidateName || 'there').trim().split(/\s+/)[0] || 'there';
  const personaCfg = resolveVoiceConfig(input.aiPersona);
  const level = mapDifficultyLevel(input.difficulty);
  const count = Math.max(3, Math.min(5, input.questionCount || 4));

  const exp = input.resumeSummary?.experiences?.[0];
  const recentWork = exp
    ? `${exp.role} work at ${exp.company}`
    : input.resumeSummary?.headline || 'recent engineering architecture';
  const resumeHighlight =
    exp?.bulletPoints?.[0] ||
    `scalable ${input.targetRole} systems using ${(input.resumeSummary?.skills || ['TypeScript', 'React']).slice(0, 3).join(', ')}`;
  const criticalGap =
    input.resumeSummary?.missingSkills?.[0] || 'edge-case fault tolerance and WAN jitter recovery';
  const matchedSkill =
    input.resumeSummary?.matchedSkills?.[0] ||
    input.resumeSummary?.skills?.[0] ||
    'Architecture & State Management';
  const jdHighlights = extractJdHighlights(input.jobDescriptionText);

  const blueprintTemplates: Array<{
    title: string;
    category: string;
    focusSource: 'resume' | 'jd' | 'role-calibration';
    rationale: string;
    questionText: string;
    contextOrConstraint: string;
    rubric: { criterion: string; weight: number; description: string }[];
  }> = [
    {
      title: 'Resume Deep-Dive & Production Impact',
      category: 'Resume Experience',
      focusSource: 'resume',
      rationale: `Grounded in your ${recentWork} and core strength in ${matchedSkill}.`,
      questionText: `Looking at your background in ${recentWork}, walk me through the hardest architectural bottleneck you solved—specifically around "${resumeHighlight.slice(0, 120)}"—and what measurable impact it had.`,
      contextOrConstraint: `Focus on concrete metrics, alternative approaches you rejected, and production reliability tradeoffs for ${input.targetCompany}.`,
      rubric: [
        { criterion: 'Architectural Ownership & Clarity', weight: 40, description: 'Explains personal technical contribution and system boundaries clearly' },
        { criterion: 'Quantitative Impact & Tradeoffs', weight: 35, description: 'Cites latency, reliability, or adoption metrics and why alternatives were rejected' },
        { criterion: 'Operational Failure Handling', weight: 25, description: 'Discusses monitoring, rollbacks, and edge-case mitigation' },
      ],
    },
    {
      title: `${input.targetCompany} JD Alignment: ${criticalGap}`,
      category: 'JD Core Architecture',
      focusSource: 'jd',
      rationale: `Directly tests a high-priority requirement from the ${input.targetRole} job description: ${jdHighlights[0] || criticalGap}.`,
      questionText: `For this ${input.targetRole} role at ${input.targetCompany}, how would you design a client-to-server synchronization pipeline that stays consistent and avoids duplicate mutations when network latency spikes or drops intermittently?`,
      contextOrConstraint: `Assume strict financial/transactional correctness under 500ms–2000ms jitter and offline reconnect bursts.`,
      rubric: [
        { criterion: 'Idempotency & Deduplication Design', weight: 40, description: 'Defines stable idempotency keys and retry state transitions' },
        { criterion: 'State Reconciliation & Caching', weight: 35, description: 'Handles optimistic updates, conflict resolution, and cache invalidation' },
        { criterion: 'Performance & Backpressure', weight: 25, description: 'Controls retry storms with jittered backoff and bounded queues' },
      ],
    },
    {
      title: 'Scalability, Bottlenecks & P99 Latency',
      category: 'System Scaling',
      focusSource: 'jd',
      rationale: `Evaluates senior ${level} calibration against the JD's performance and observability bar.`,
      questionText: `Suppose your production application experiences a sudden 10x traffic surge paired with a slow downstream API. How do you protect user-facing responsiveness, diagnose where time is lost, and keep P99 performance within budget?`,
      contextOrConstraint: `Consider telemetry signals, graceful degradation, and circuit-breaking without corrupting user state.`,
      rubric: [
        { criterion: 'Degradation & Isolation Strategy', weight: 40, description: 'Applies circuit breakers, stale-while-revalidate, or feature shedding cleanly' },
        { criterion: 'Observability & Root Cause', weight: 35, description: 'Tracks structured traces, Core Web Vitals, and queue saturation' },
        { criterion: 'Resource & Memory Discipline', weight: 25, description: 'Prevents unbounded retries, memory leaks, or cascading failures' },
      ],
    },
    {
      title: 'Cross-Team Consensus & Leadership',
      category: 'Leadership & Judgment',
      focusSource: 'role-calibration',
      rationale: `Calibrated for ${input.targetRole} (${level}) cross-functional ownership and decision-making.`,
      questionText: `Tell me about a time you strongly disagreed with a product or engineering peer on a major technical tradeoff right before a critical launch. How did you drive alignment and what happened afterward?`,
      contextOrConstraint: `Use structured Situation, Task, Action, Result framing highlighting data-driven persuasion.`,
      rubric: [
        { criterion: 'Structured STAR Framing', weight: 35, description: 'Crisp context, personal action, and concrete outcome' },
        { criterion: 'Stakeholder Empathy & Evidence', weight: 40, description: 'Uses benchmarks, prototypes, or risk analysis rather than rank' },
        { criterion: 'Retrospective Maturity', weight: 25, description: 'Demonstrates learning and team trust preservation' },
      ],
    },
    {
      title: 'Security, Reliability & Edge-Case Defense',
      category: 'Reliability Engineering',
      focusSource: 'role-calibration',
      rationale: `Covers defensive engineering practices expected of ${input.targetCompany} ${input.targetRole} candidates.`,
      questionText: `How do you structure automated verification, safe rollouts, and boundary validation so a critical user workflow cannot silently fail or expose sensitive state in production?`,
      contextOrConstraint: `Address canary checks, schema validation, and rollback safety nets.`,
      rubric: [
        { criterion: 'Defense-in-Depth Strategy', weight: 40, description: 'Covers input validation, auth boundaries, and blast-radius isolation' },
        { criterion: 'Testing & Rollout Discipline', weight: 35, description: 'Balances unit/integration/E2E gates with staged feature flags' },
        { criterion: 'Incident Recovery Speed', weight: 25, description: 'Defines clear rollback triggers and post-incident safeguards' },
      ],
    },
  ];

  const selected = blueprintTemplates.slice(0, count);
  const topicOrder: PlannedTopicItem[] = selected.map((item, idx) => ({
    id: `topic_${idx + 1}`,
    order: idx + 1,
    title: item.title,
    category: item.category,
    focusSource: item.focusSource,
    rationale: item.rationale,
  }));

  const questions: PlannedInterviewQuestion[] = selected.map((item, idx) => ({
    id: `q_${idx + 1}`,
    topicId: `topic_${idx + 1}`,
    order: idx + 1,
    category: item.category,
    difficulty: level,
    questionText: item.questionText,
    contextOrConstraint: item.contextOrConstraint,
    evaluationRubric: item.rubric,
  }));

  const topicPreview = topicOrder.map((t) => `${t.order}. ${t.title}`).join(', ');
  const greetingOverview = `Hi ${firstName}, welcome to your live ${input.targetRole} interview for ${input.targetCompany}. I'm ${input.aiPersona}, ${personaCfg.roleTitle}. I've reviewed your resume—including your ${recentWork}—alongside the ${input.targetCompany} job description. To give you a realistic ${level} loop, here is our planned topic order: ${topicPreview}. Expect conversational follow-up questions tailored in real time to your spoken answers. Whenever you're ready, let me know you're ready to start and we'll jump right into topic one.`;

  return {
    greetingOverview,
    topicOrder,
    questions,
    source: 'calibrated-fallback',
  };
}

function buildPlanCacheKey(input: PlanInput): string {
  return JSON.stringify([
    (input.candidateName || '').trim().toLowerCase(),
    input.targetRole.trim().toLowerCase(),
    input.targetCompany.trim().toLowerCase(),
    input.interviewType,
    input.difficulty,
    input.questionCount,
    input.aiPersona,
    (input.resumeSummary?.headline || '').slice(0, 80),
    (input.jobDescriptionText || '').slice(0, 160),
  ]);
}

export async function generateInterviewPlan(input: PlanInput): Promise<InterviewPlanPayload> {
  const ai = getGeminiClient();
  if (!ai) {
    return buildDeterministicInterviewPlan(input);
  }

  const cacheKey = buildPlanCacheKey(input);
  const cached = recentPlanCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.plan;
  }

  const existingInFlight = inFlightPlanRequests.get(cacheKey);
  if (existingInFlight) {
    return existingInFlight;
  }

  const runPromise = (async (): Promise<InterviewPlanPayload> => {
    try {
      const firstName = (input.candidateName || 'Candidate').trim().split(/\s+/)[0];
      const personaCfg = resolveVoiceConfig(input.aiPersona);
      const level = mapDifficultyLevel(input.difficulty);
      const count = Math.max(3, Math.min(5, input.questionCount || 4));

      const prompt = `You are ${input.aiPersona}, ${personaCfg.roleTitle}, conducting a real-time spoken mock interview for "${input.targetRole}" at "${input.targetCompany}" (calibration level: ${level}, round focus: ${input.interviewType}).

Review all candidate context below carefully:
- Candidate Name: ${input.candidateName || 'Alex Morgan'} (address first name "${firstName}")
- Resume Headline: ${input.resumeSummary?.headline || 'Senior Software Engineer'}
- Resume Skills: ${(input.resumeSummary?.skills || []).join(', ')}
- Matched Strengths: ${(input.resumeSummary?.matchedSkills || []).join(', ')}
- Skill Gaps to Probe: ${(input.resumeSummary?.missingSkills || []).join(', ')}
- Recent Resume Roles: ${JSON.stringify(input.resumeSummary?.experiences || [])}
- Target Job Description:
${(input.jobDescriptionText || '').slice(0, 2200)}

Produce a structured JSON interview plan with exactly ${count} ordered topics and ${count} matching initial questions:
1. "greetingOverview": Natural spoken opening by ${input.aiPersona} welcoming ${firstName}, mentioning 1-2 specific details reviewed from their resume & the ${input.targetCompany} JD, clearly stating the planned topic order (${count} topics in sequence), and ending by asking if the candidate is ready to begin. Keep it concise enough to be spoken naturally in ~25-35 seconds (under 115 words), no markdown formatting or bullet symbols.
2. "topicOrder": Array of ${count} topics in logical interview progression (e.g. Resume Deep-Dive -> JD Core Technical Architecture -> Scalability/Edge Cases -> Tradeoffs & Leadership).
3. "questions": Array of ${count} interview questions aligned 1-to-1 with "topicOrder", phrased naturally for a verbal conversation.`;

      const rawJson = await callJsonTextModelWithFallback({
        ai,
        prompt,
        timeoutMs: 7000,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            greetingOverview: { type: Type.STRING },
            topicOrder: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  order: { type: Type.INTEGER },
                  title: { type: Type.STRING },
                  category: { type: Type.STRING },
                  focusSource: { type: Type.STRING },
                  rationale: { type: Type.STRING },
                },
                required: ['id', 'order', 'title', 'category', 'focusSource', 'rationale'],
              },
            },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  topicId: { type: Type.STRING },
                  order: { type: Type.INTEGER },
                  category: { type: Type.STRING },
                  difficulty: { type: Type.STRING },
                  questionText: { type: Type.STRING },
                  contextOrConstraint: { type: Type.STRING },
                  evaluationRubric: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        criterion: { type: Type.STRING },
                        weight: { type: Type.INTEGER },
                        description: { type: Type.STRING },
                      },
                      required: ['criterion', 'weight', 'description'],
                    },
                  },
                },
                required: ['id', 'topicId', 'order', 'category', 'difficulty', 'questionText', 'evaluationRubric'],
              },
            },
          },
          required: ['greetingOverview', 'topicOrder', 'questions'],
        },
      });

      const parsed = JSON.parse(rawJson || '{}');
      if (
        parsed.greetingOverview &&
        Array.isArray(parsed.topicOrder) &&
        parsed.topicOrder.length > 0 &&
        Array.isArray(parsed.questions) &&
        parsed.questions.length > 0
      ) {
        const normalizedTopics: PlannedTopicItem[] = parsed.topicOrder.slice(0, count).map((t: any, idx: number) => ({
          id: t.id || `topic_${idx + 1}`,
          order: idx + 1,
          title: String(t.title || `Topic ${idx + 1}`),
          category: String(t.category || 'Technical'),
          focusSource:
            t.focusSource === 'resume' || t.focusSource === 'jd' || t.focusSource === 'role-calibration'
              ? t.focusSource
              : idx === 0
              ? 'resume'
              : 'jd',
          rationale: String(t.rationale || 'Calibrated to job description and resume.'),
        }));

        const normalizedQuestions: PlannedInterviewQuestion[] = parsed.questions
          .slice(0, normalizedTopics.length)
          .map((q: any, idx: number) => ({
            id: q.id || `q_${idx + 1}`,
            topicId: normalizedTopics[idx]?.id || `topic_${idx + 1}`,
            order: idx + 1,
            category: String(q.category || normalizedTopics[idx]?.category || 'Technical'),
            difficulty: (['L4', 'L5', 'L6', 'L7'].includes(q.difficulty) ? q.difficulty : level) as
              | 'L4'
              | 'L5'
              | 'L6'
              | 'L7',
            questionText: String(q.questionText || ''),
            contextOrConstraint: q.contextOrConstraint ? String(q.contextOrConstraint) : undefined,
            evaluationRubric:
              Array.isArray(q.evaluationRubric) && q.evaluationRubric.length > 0
                ? q.evaluationRubric.map((r: any) => ({
                    criterion: String(r.criterion || 'Technical Clarity'),
                    weight: Number(r.weight || 35),
                    description: String(r.description || 'Demonstrates strong engineering reasoning'),
                  }))
                : [
                    { criterion: 'Technical Accuracy & Depth', weight: 50, description: 'Clear system reasoning' },
                    { criterion: 'Tradeoff Analysis', weight: 50, description: 'Explains constraints cleanly' },
                  ],
          }));

        const result: InterviewPlanPayload = {
          greetingOverview: String(parsed.greetingOverview).trim(),
          topicOrder: normalizedTopics,
          questions: normalizedQuestions,
          source: 'gemini',
        };
        if (recentPlanCache.size > 24) {
          const oldest = recentPlanCache.keys().next().value;
          if (oldest) recentPlanCache.delete(oldest);
        }
        recentPlanCache.set(cacheKey, { plan: result, expiresAt: Date.now() + 60_000 });
        return result;
      }
    } catch {
      // Fallback safely to calibrated plan
    }

    const fallbackPlan = buildDeterministicInterviewPlan(input);
    recentPlanCache.set(cacheKey, { plan: fallbackPlan, expiresAt: Date.now() + 20_000 });
    return fallbackPlan;
  })();

  inFlightPlanRequests.set(cacheKey, runPromise);
  try {
    return await runPromise;
  } finally {
    inFlightPlanRequests.delete(cacheKey);
  }
}

export interface RespondTurnInput {
  candidateName?: string;
  targetRole: string;
  targetCompany: string;
  aiPersona: string;
  currentTopic: PlannedTopicItem;
  currentQuestion: PlannedInterviewQuestion;
  candidateSpokenText: string;
  followUpCountForTopic: number;
  nextTopic?: PlannedTopicItem | null;
  nextQuestion?: PlannedInterviewQuestion | null;
  recentTranscript?: { speaker: string; text: string }[];
}

export interface RespondTurnOutput {
  action: 'follow_up' | 'next_topic' | 'complete';
  spokenResponse: string;
  followUpQuestion?: string;
  triggerReason?: string;
  source: 'gemini' | 'calibrated-fallback';
}

export function buildDeterministicTurnResponse(input: RespondTurnInput): RespondTurnOutput {
  const spoken = input.candidateSpokenText.trim();
  const words = spoken.split(/\s+/).filter(Boolean);
  const lower = spoken.toLowerCase();

  // Extract a concrete technical keyword from what the candidate actually said to personalize the real-time follow-up
  const notableTerms = [
    'cache',
    'redis',
    'idempotency',
    'latency',
    'retry',
    'queue',
    'websocket',
    'database',
    'react',
    'state',
    'timeout',
    'consensus',
    'failover',
    'metrics',
    'monitoring',
    'team',
    'tradeoff',
    'rollback',
    'shard',
    'partition',
  ];
  const matchedTerm = notableTerms.find((t) => lower.includes(t));

  // Trigger at least 1 crisp adaptive follow-up per topic in real time based on candidate answer
  if (input.followUpCountForTopic < 1) {
    let followUpQ = '';
    let triggerReason = '';

    if (words.length < 18) {
      triggerReason = 'Response was concise — probing concrete implementation details and failure edge cases';
      followUpQ = matchedTerm
        ? `Thanks for sharing that overview. You touched on ${matchedTerm}—could you walk me through the exact failure mode you'd handle if ${matchedTerm} degrades under heavy concurrent load?`
        : `Got it. Let's go one layer deeper on ${input.currentTopic.title}: what specific bottleneck or edge case would fail first in production, and how would you mitigate it?`;
    } else if (matchedTerm) {
      triggerReason = `Real-time deep dive on candidate's mention of "${matchedTerm}"`;
      followUpQ = `That's a solid point about ${matchedTerm}. If a network partition hits right in the middle of that ${matchedTerm} operation at ${input.targetCompany} scale, how do you prevent inconsistent state or cascading retries?`;
    } else {
      triggerReason = `Adaptive bar-raiser probe calibrated to ${input.currentTopic.category}`;
      followUpQ = `Appreciate how you structured that answer. One quick follow-up before we move on: if latency tripled unexpectedly on that critical path, what tradeoff would you adjust first and why?`;
    }

    return {
      action: 'follow_up',
      spokenResponse: followUpQ,
      followUpQuestion: followUpQ,
      triggerReason,
      source: 'calibrated-fallback',
    };
  }

  if (input.nextTopic && input.nextQuestion) {
    const transition = `Thanks for walking through those tradeoffs clearly—that gives me a strong signal on ${input.currentTopic.category}. Let's move to topic ${input.nextTopic.order} in our plan, ${input.nextTopic.title}. ${input.nextQuestion.questionText}`;
    return {
      action: 'next_topic',
      spokenResponse: transition,
      source: 'calibrated-fallback',
    };
  }

  const firstName = (input.candidateName || 'there').trim().split(/\s+/)[0] || 'there';
  return {
    action: 'complete',
    spokenResponse: `Thank you so much, ${firstName}. You covered every topic in our ${input.targetCompany} ${input.targetRole} plan thoughtfully. I'm compiling your evaluation scorecard and targeted learning recommendations now.`,
    source: 'calibrated-fallback',
  };
}

export async function generateAdaptiveTurnResponse(input: RespondTurnInput): Promise<RespondTurnOutput> {
  const ai = getGeminiClient();
  if (!ai) {
    return buildDeterministicTurnResponse(input);
  }

  try {
    const mustAdvance = input.followUpCountForTopic >= 1;
    const hasNext = Boolean(input.nextTopic && input.nextQuestion);

    const prompt = `You are ${input.aiPersona}, interviewing ${input.candidateName || 'the candidate'} for "${input.targetRole}" at "${input.targetCompany}".
This is a purely VERBAL interview. Respond concisely in natural spoken human dialogue (2 to 4 sentences max, no markdown, no bullets).

Current Topic (#${input.currentTopic.order}): ${input.currentTopic.title} (${input.currentTopic.category})
Question asked: ${input.currentQuestion.questionText}
Candidate's latest spoken answer: "${input.candidateSpokenText}"
Follow-ups already asked on this topic: ${input.followUpCountForTopic}
Recent conversation:
${(input.recentTranscript || []).slice(-4).map((m) => `${m.speaker}: ${m.text}`).join('\n')}

Rules:
- If Follow-ups already asked == 0, set action="follow_up" and ask ONE sharp, specific follow-up question referencing concrete details from the candidate's spoken answer above.
- If Follow-ups already asked >= 1:
  ${
    hasNext
      ? `Set action="next_topic". Briefly acknowledge one strength or point from the candidate's follow-up response, then naturally transition into Topic #${input.nextTopic!.order} ("${input.nextTopic!.title}") and ask this exact question: "${input.nextQuestion!.questionText}"`
      : `Set action="complete". Briefly acknowledge the candidate's response, wrap up the interview warmly, and let them know their evaluation scorecard is being prepared.`
  }
- Keep spokenResponse natural, warm, and human-like.`;

    const rawJson = await callJsonTextModelWithFallback({
      ai,
      prompt,
      timeoutMs: 6500,
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          action: { type: Type.STRING },
          spokenResponse: { type: Type.STRING },
          followUpQuestion: { type: Type.STRING },
          triggerReason: { type: Type.STRING },
        },
        required: ['action', 'spokenResponse'],
      },
    });

    const parsed = JSON.parse(rawJson || '{}');
    let resolvedAction: 'follow_up' | 'next_topic' | 'complete' = mustAdvance
      ? hasNext
        ? 'next_topic'
        : 'complete'
      : 'follow_up';

    if (
      !mustAdvance &&
      (parsed.action === 'follow_up' || parsed.action === 'next_topic' || parsed.action === 'complete')
    ) {
      resolvedAction = parsed.action === 'complete' && hasNext ? 'next_topic' : parsed.action;
    }

    if (parsed.spokenResponse) {
      return {
        action: resolvedAction,
        spokenResponse: String(parsed.spokenResponse).trim(),
        followUpQuestion:
          resolvedAction === 'follow_up'
            ? String(parsed.followUpQuestion || parsed.spokenResponse).trim()
            : undefined,
        triggerReason: parsed.triggerReason
          ? String(parsed.triggerReason).trim()
          : 'Real-time adaptive response probe',
        source: 'gemini',
      };
    }
  } catch {
    // Fallback smoothly to deterministic adaptive response
  }

  return buildDeterministicTurnResponse(input);
}

function prepareNaturalSpeechText(text: string, model: string): string {
  const cleaned = (text || '')
    .replace(/[*_`#]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\bL([4-7])\b/g, 'level $1')
    .replace(/\bP99\b/gi, 'p ninety nine')
    .replace(/\bJD\b/g, 'job description')
    .trim();
  if (model === 'gemini-3.8-flash-tts') {
    // Insert subtle breath before transitions for natural human cadence
    return cleaned
      .replace(/\. (Let's|So |Now |Whenever you're ready|Before we move)/g, '. <breath> $1')
      .trim();
  }
  return cleaned;
}

export async function synthesizeSpeechAudio(params: {
  text: string;
  persona?: string;
  voiceOverride?: string;
}): Promise<{
  audioBase64: string | null;
  mimeType: string;
  voiceName: PrebuiltVoiceName;
  provider: 'gemini-neural-tts' | 'browser-fallback';
  quotaLimited?: boolean;
}> {
  const voiceCfg = resolveVoiceConfig(params.persona, params.voiceOverride);
  const ai = getGeminiClient();
  const cleanText = (params.text || '').replace(/[*_`#]/g, '').trim();

  if (!ai || !cleanText) {
    return {
      audioBase64: null,
      mimeType: 'audio/wav',
      voiceName: voiceCfg.voiceName,
      provider: 'browser-fallback',
    };
  }

  const cacheKey = `${voiceCfg.voiceName}:${cleanText}`;
  const cachedAudio = ttsAudioCache.get(cacheKey);
  if (cachedAudio) {
    return {
      ...cachedAudio,
      provider: 'gemini-neural-tts',
    };
  }

  let sawQuota = false;

  for (const ttsModel of TTS_MODEL_CHAIN) {
    if (isModelInCooldown(ttsModel)) {
      sawQuota = true;
      continue;
    }

    try {
      const spokenScript = prepareNaturalSpeechText(cleanText, ttsModel);
      const response = await Promise.race([
        ai.models.generateContent({
          model: ttsModel,
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: spokenScript,
                  speechMetadata: {
                    style: voiceCfg.speechStyle,
                  },
                } as any,
              ],
            },
          ],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: voiceCfg.voiceName },
              },
            },
          },
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`${ttsModel} TTS timeout`)), 5500)
        ),
      ]);

      const audioBase64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (audioBase64) {
        if (ttsAudioCache.size >= 40) {
          const oldest = ttsAudioCache.keys().next().value;
          if (oldest) ttsAudioCache.delete(oldest);
        }
        ttsAudioCache.set(cacheKey, {
          audioBase64,
          mimeType: 'audio/wav',
          voiceName: voiceCfg.voiceName,
        });
        return {
          audioBase64,
          mimeType: 'audio/wav',
          voiceName: voiceCfg.voiceName,
          provider: 'gemini-neural-tts',
        };
      }
    } catch (err) {
      if (isQuotaOrRateLimitError(err)) {
        sawQuota = true;
        markModelCooldown(ttsModel, err);
      } else {
        console.log(`[AI Voice Agent] ${ttsModel} switched to natural browser voice (${(err as Error)?.message || 'unavailable'}).`);
      }
    }
  }

  return {
    audioBase64: null,
    mimeType: 'audio/wav',
    voiceName: voiceCfg.voiceName,
    provider: 'browser-fallback',
    quotaLimited: sawQuota,
  };
}

export async function transcribeSpokenAudio(params: {
  audioBase64: string;
  mimeType: string;
}): Promise<{ text: string; source: 'gemini-transcribe' | 'empty' }> {
  const ai = getGeminiClient();
  if (!ai || !params.audioBase64 || isModelInCooldown('gemini-3.5-transcribe')) {
    return { text: '', source: 'empty' };
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-transcribe',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: params.mimeType || 'audio/webm',
              data: params.audioBase64,
            },
          },
          {
            text: 'Transcribe the candidate spoken interview answer accurately into clean English prose without adding commentary.',
          },
        ],
      },
    });

    return {
      text: (response.text || '').trim(),
      source: 'gemini-transcribe',
    };
  } catch (err) {
    if (isQuotaOrRateLimitError(err)) {
      markModelCooldown('gemini-3.5-transcribe', err);
    }
    return { text: '', source: 'empty' };
  }
}

export interface EvaluateTranscriptTurn {
  id: string;
  speaker: 'ai' | 'candidate';
  speakerName: string;
  kind: 'greeting' | 'question' | 'follow-up' | 'response' | 'summary';
  topicOrder?: number;
  topicTitle?: string;
  text: string;
  timestamp: string;
}

export interface EvaluateInterviewInput {
  candidateName?: string;
  targetRole: string;
  targetCompany: string;
  difficulty: string;
  interviewType: string;
  aiPersona: string;
  durationSeconds: number;
  questions: PlannedInterviewQuestion[];
  answers: Array<{
    questionId: string;
    answerText: string;
    durationSeconds?: number;
    wordCount?: number;
    adaptiveFollowUp?: {
      triggerReason?: string;
      followUpQuestion?: string;
      followUpAnswer?: string;
    };
  }>;
  transcript: EvaluateTranscriptTurn[];
}

export interface EvaluatedQuestionFeedback {
  questionId: string;
  questionText: string;
  category: string;
  candidateResponse: string;
  followUpQuestion?: string;
  followUpResponse?: string;
  score: number;
  criterionScores: {
    criterion: string;
    score: number;
    feedback: string;
  }[];
  strengths: string[];
  missingConcepts: string[];
  suggestedImprovements: string[];
  modelExemplarAnswer: string;
}

export interface EvaluatedReportBasis {
  evaluatedSpeaker: 'candidate-only';
  aiTurnsExcluded: number;
  candidateTurnsAnalyzed: number;
  topicsAnswered: number;
  totalTopics: number;
  totalCandidateWords: number;
  rubricWeights: {
    technicalCorrectness: number;
    tradeoffAnalysis: number;
    communicationStructure: number;
    problemDecomposition: number;
  };
  scoringMethodLabel: string;
}

export interface EvaluatedReportPayload {
  overallScore: number;
  targetRole: string;
  targetCompany: string;
  calibratedBenchmark: string;
  durationFormatted: string;
  durationSeconds: number;
  interviewerPersona: string;
  percentileRank: number;
  categoryScores: {
    technicalCorrectness: number;
    communicationStructure: number;
    problemDecomposition: number;
    tradeoffAnalysis: number;
  };
  overallSummary: string;
  questionFeedbacks: EvaluatedQuestionFeedback[];
  recommendedDrills: string[];
  keyWeakness: string;
  source: 'gemini' | 'calibrated-fallback';
  evaluationBasis: EvaluatedReportBasis;
}

function clampScore(value: number, min = 25, max = 98): number {
  if (!Number.isFinite(value)) return 60;
  return Math.max(min, Math.min(max, Math.round(value)));
}

function formatDurationReadable(totalSeconds: number): string {
  const safe = Math.max(1, Math.round(totalSeconds || 0));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

function extractPerQuestionTranscriptData(input: EvaluateInterviewInput) {
  const transcript = Array.isArray(input.transcript) ? input.transcript : [];
  const answers = Array.isArray(input.answers) ? input.answers : [];
  const questions = Array.isArray(input.questions) ? input.questions : [];

  return questions.map((q, idx) => {
    const topicNum = q.order || idx + 1;
    const savedAns = answers.find((a) => a.questionId === q.id);

    // Strictly isolate ONLY candidate spoken responses belonging to this topic
    const candidateTurns = transcript.filter(
      (t) =>
        t.speaker === 'candidate' &&
        t.kind === 'response' &&
        t.topicOrder === topicNum &&
        typeof t.text === 'string' &&
        t.text.trim().length > 0
    );
    const aiFollowUpTurn = transcript.find(
      (t) => t.speaker === 'ai' && t.kind === 'follow-up' && t.topicOrder === topicNum
    );

    const primaryResponse =
      savedAns?.answerText?.trim() ||
      candidateTurns[0]?.text?.trim() ||
      '';
    const followUpQuestion =
      savedAns?.adaptiveFollowUp?.followUpQuestion?.trim() ||
      aiFollowUpTurn?.text?.trim() ||
      undefined;
    const followUpResponse =
      savedAns?.adaptiveFollowUp?.followUpAnswer?.trim() ||
      (candidateTurns.length > 1 ? candidateTurns.slice(1).map((t) => t.text).join(' ').trim() : undefined);

    return {
      question: q,
      primaryResponse,
      followUpQuestion,
      followUpResponse,
    };
  });
}

const TECHNICAL_SIGNAL_TERMS = [
  'architecture', 'latency', 'p99', 'cache', 'redis', 'idempotency', 'idempotent',
  'retry', 'backoff', 'queue', 'circuit', 'partition', 'sharding', 'consistency',
  'tradeoff', 'metric', 'monitoring', 'observability', 'rollback', 'canary', 'scale',
  'throughput', 'dead-letter', 'concurrency', 'transaction', 'database', 'index',
  'state', 'reconciliation', 'websocket', 'streaming', 'fallback', 'availability',
  'situation', 'action', 'result', 'impact', 'alignment', 'stakeholder', 'benchmark',
  'timeout', 'failover', 'replication', 'indexing', 'async', 'schema', 'validation',
];

const FILLER_WORDS = new Set([
  'um', 'uh', 'like', 'yeah', 'yep', 'ok', 'okay', 'so', 'well', 'actually', 'basically', 'literally',
]);

const STRUCTURE_TERMS = [
  'first', 'second', 'third', 'then', 'because', 'therefore', 'specifically',
  'situation', 'task', 'action', 'result', 'impact', 'measured', 'reduced', 'improved',
];

const TRADEOFF_TERMS = [
  'tradeoff', 'versus', 'instead', 'latency', 'consistency', 'backoff', 'fallback',
  'rollback', 'canary', 'cost', 'bottleneck', 'risk', 'partition', 'dead-letter', 'circuit',
];

function extractSubstantiveWords(text: string): string[] {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9%\-\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 0 && !FILLER_WORDS.has(w));
}

export function buildDeterministicEvaluationFromTranscript(input: EvaluateInterviewInput): EvaluatedReportPayload {
  const level = mapDifficultyLevel(input.difficulty);
  const perQuestion = extractPerQuestionTranscriptData(input);
  const durationFormatted = formatDurationReadable(input.durationSeconds);
  const candidateFirstName = (input.candidateName || 'Candidate').trim().split(/\s+/)[0] || 'Candidate';

  const allTranscript = Array.isArray(input.transcript) ? input.transcript : [];
  const aiTurnsExcluded = allTranscript.filter((t) => t.speaker === 'ai').length;
  const candidateTopicTurns = allTranscript.filter(
    (t) =>
      t.speaker === 'candidate' &&
      t.kind === 'response' &&
      typeof t.topicOrder === 'number' &&
      t.text.trim().length > 0
  );

  // Fallback if questions list was unexpectedly empty
  const itemsToScore =
    perQuestion.length > 0
      ? perQuestion
      : [
          {
            question: {
              id: 'q_1',
              topicId: 'topic_1',
              order: 1,
              category: input.interviewType || 'Technical',
              difficulty: level,
              questionText: `Verbal interview discussion for ${input.targetRole} at ${input.targetCompany}`,
              evaluationRubric: [
                { criterion: 'Technical Clarity & Depth', weight: 40, description: 'Clarity of engineering approach' },
                { criterion: 'Tradeoff & Failure Analysis', weight: 35, description: 'Evaluates failure modes' },
                { criterion: 'Communication Structure', weight: 25, description: 'Concise verbal delivery' },
              ],
            },
            primaryResponse: candidateTopicTurns.map((t) => t.text).join(' ').trim(),
            followUpQuestion: allTranscript.find((t) => t.speaker === 'ai' && t.kind === 'follow-up')?.text,
            followUpResponse: undefined,
          },
        ];

  let totalTech = 0;
  let totalComm = 0;
  let totalDecomp = 0;
  let totalTradeoff = 0;
  let answeredCount = 0;
  let totalCandidateWords = 0;

  const questionFeedbacks: EvaluatedQuestionFeedback[] = itemsToScore.map((item) => {
    // STRICTLY score only candidate spoken responses — zero AI text is included
    const combinedSpoken = [item.primaryResponse, item.followUpResponse].filter(Boolean).join(' ').trim();
    const rawWords = combinedSpoken.split(/\s+/).filter(Boolean);
    const substantiveWords = extractSubstantiveWords(combinedSpoken);
    const lower = combinedSpoken.toLowerCase();

    const matchedTerms = TECHNICAL_SIGNAL_TERMS.filter((term) => lower.includes(term));
    const matchedStructure = STRUCTURE_TERMS.filter((term) => lower.includes(term));
    const matchedTradeoffs = TRADEOFF_TERMS.filter((term) => lower.includes(term));
    const hasQuantifiedMetric = /\d+%|\d+\s*(ms|s|k|x|rps|qps|mb|gb)/i.test(combinedSpoken);

    if (rawWords.length > 0) {
      answeredCount += 1;
      totalCandidateWords += rawWords.length;
    }

    const depthPoints = Math.min(26, Math.round(substantiveWords.length * 0.72));
    const signalPoints = Math.min(20, matchedTerms.length * 4.5);
    const metricBonus = hasQuantifiedMetric ? 5 : 0;
    const structureBonus = matchedStructure.length >= 1 ? 4 : 0;
    const followUpSubstantiveCount = item.followUpResponse ? extractSubstantiveWords(item.followUpResponse).length : 0;
    const followUpBonus = followUpSubstantiveCount >= 6 ? 9 : 0;

    const unansweredScore = 30;
    const baseScore =
      rawWords.length === 0
        ? unansweredScore
        : clampScore(38 + depthPoints + signalPoints + metricBonus + structureBonus + followUpBonus, 36, 96);

    const techScore =
      rawWords.length === 0
        ? unansweredScore
        : clampScore(baseScore + (matchedTerms.length >= 2 ? 4 : -3));
    const commScore =
      rawWords.length === 0
        ? unansweredScore
        : clampScore(baseScore + (substantiveWords.length >= 16 || matchedStructure.length >= 1 ? 3 : -5));
    const decompScore =
      rawWords.length === 0
        ? unansweredScore
        : clampScore(baseScore + (followUpBonus > 0 ? 4 : -2));
    const tradeoffScore =
      rawWords.length === 0
        ? unansweredScore
        : clampScore(baseScore + (matchedTradeoffs.length >= 2 ? 5 : matchedTradeoffs.length === 1 ? 1 : -4));

    totalTech += techScore;
    totalComm += commScore;
    totalDecomp += decompScore;
    totalTradeoff += tradeoffScore;

    const rubric = item.question.evaluationRubric?.length
      ? item.question.evaluationRubric
      : [
          { criterion: 'Technical Accuracy & Depth', weight: 40, description: 'Engineering depth' },
          { criterion: 'Tradeoff & Failure Analysis', weight: 35, description: 'Edge cases and reliability' },
          { criterion: 'Structured Delivery', weight: 25, description: 'Clear verbal reasoning' },
        ];

    const criterionScores = rubric.map((r, rIdx) => {
      const variance = rIdx === 0 ? techScore : rIdx === 1 ? tradeoffScore : commScore;
      return {
        criterion: r.criterion,
        score: variance,
        feedback:
          rawWords.length === 0
            ? `Scored ${unansweredScore}/100: Candidate did not speak a response for this topic before ending the session (AI prompts are excluded).`
            : matchedTerms.length > 0
            ? `Based solely on your ${rawWords.length}-word spoken answer: referenced ${matchedTerms.slice(0, 3).join(', ')} while addressing ${r.criterion.toLowerCase()}.`
            : `Based solely on your ${rawWords.length}-word spoken outline: expanding with concrete ${r.criterion.toLowerCase()} mechanics and quantified metrics would elevate the ${level} signal.`,
      };
    });

    const strengths =
      rawWords.length === 0
        ? ['Topic was queued in the session plan, but no candidate speech was recorded here.']
        : [
            matchedTerms.length > 0
              ? `Candidate directly articulated domain concepts: ${matchedTerms.slice(0, 4).join(', ')}.`
              : `Candidate delivered a ${rawWords.length}-word spoken explanation for ${item.question.category}.`,
            ...(hasQuantifiedMetric
              ? ['Included concrete quantitative impact or latency/scale numbers in spoken response.']
              : []),
            ...(item.followUpResponse
              ? [`Answered ${input.aiPersona}'s real-time follow-up probe with ${followUpSubstantiveCount} substantive words.`]
              : []),
          ];

    const missingConcepts =
      rawWords.length === 0
        ? [`No candidate spoken answer recorded for "${item.question.category}".`]
        : [
            ...(substantiveWords.length < 22
              ? ['Response was brief; expand with step-by-step system mechanics and measurable production constraints.']
              : []),
            ...(!item.followUpResponse && item.followUpQuestion
              ? ['Session ended before the candidate answered the real-time follow-up probe.']
              : []),
            ...(!hasQuantifiedMetric && !lower.includes('metric') && !lower.includes('latency') && !lower.includes('monitor')
              ? ['Candidate did not specify quantitative SLIs, latency targets, or observability triggers.']
              : []),
          ];

    const suggestedImprovements =
      rawWords.length === 0
        ? [`Deliver a complete spoken walkthrough for ${item.question.category} targeting ${level} depth.`]
        : [
            `Lead your spoken answer with system invariants, concrete bottlenecks, and measured outcomes for ${input.targetCompany}.`,
            `Explicitly compare rejected alternatives and define rollback/monitoring triggers.`,
          ];

    return {
      questionId: item.question.id,
      questionText: item.question.questionText,
      category: item.question.category,
      candidateResponse: item.primaryResponse || 'No candidate spoken response recorded.',
      followUpQuestion: item.followUpQuestion,
      followUpResponse: item.followUpResponse,
      score: baseScore,
      criterionScores,
      strengths,
      missingConcepts,
      suggestedImprovements,
      modelExemplarAnswer: `For ${input.targetRole} at ${input.targetCompany} (${level}), start by stating system invariants and SLO bounds, explain your chosen mechanism (e.g., idempotency tokens, bounded backoff, or decoupled state stores), explicitly weigh latency vs. consistency tradeoffs, and close with concrete observability metrics and rollback safeguards.`,
    };
  });

  const n = questionFeedbacks.length || 1;
  const technicalCorrectness = clampScore(totalTech / n);
  const communicationStructure = clampScore(totalComm / n);
  const problemDecomposition = clampScore(totalDecomp / n);
  const tradeoffAnalysis = clampScore(totalTradeoff / n);
  const overallScore = clampScore(
    technicalCorrectness * 0.35 +
      tradeoffAnalysis * 0.25 +
      communicationStructure * 0.2 +
      problemDecomposition * 0.2
  );
  const percentileRank = clampScore(overallScore + 2, 15, 99);

  const lowestCategory = [
    { label: 'Technical Depth & System Mechanics', score: technicalCorrectness },
    { label: 'Tradeoff & Failure-Mode Analysis', score: tradeoffAnalysis },
    { label: 'Structured Verbal Communication', score: communicationStructure },
    { label: 'Problem Decomposition & Scoping', score: problemDecomposition },
  ].sort((a, b) => a.score - b.score)[0];

  const recommendedDrills = [
    `${lowestCategory.label} for ${input.targetRole} (${input.targetCompany})`,
    ...questionFeedbacks
      .filter((fb) => fb.score < 85)
      .slice(0, 2)
      .map((fb) => `Deep-Dive Practice: ${fb.category}`),
  ];
  if (recommendedDrills.length < 2) {
    recommendedDrills.push(`${input.targetCompany} ${level} Real-Time Follow-Up Handling & Edge Cases`);
  }

  const candidateTurnsAnalyzed = Math.max(
    candidateTopicTurns.length,
    perQuestion.reduce((acc, p) => acc + (p.primaryResponse ? 1 : 0) + (p.followUpResponse ? 1 : 0), 0)
  );

  const overallSummary =
    answeredCount === 0
      ? `${candidateFirstName} ended the ${input.targetRole} session for ${input.targetCompany} before answering any interview questions. Because only candidate spoken responses are evaluated (all ${aiTurnsExcluded} AI interviewer prompts are excluded), no topic credit was awarded.`
      : `Evaluated strictly from ${candidateFirstName}'s ${candidateTurnsAnalyzed} spoken responses (${totalCandidateWords} candidate words across ${answeredCount} of ${n} topics; ${aiTurnsExcluded} AI interviewer turns excluded). Earned ${overallScore}/100 overall—strongest performance in ${
          technicalCorrectness >= communicationStructure ? 'technical depth' : 'structured verbal communication'
        }, with highest-leverage improvement in ${lowestCategory.label.toLowerCase()}.`;

  return {
    overallScore,
    targetRole: input.targetRole,
    targetCompany: input.targetCompany,
    calibratedBenchmark: `${input.targetCompany} ${level} Verbal Bar`,
    durationFormatted,
    durationSeconds: Math.max(1, Math.round(input.durationSeconds || 0)),
    interviewerPersona: input.aiPersona,
    percentileRank,
    categoryScores: {
      technicalCorrectness,
      communicationStructure,
      problemDecomposition,
      tradeoffAnalysis,
    },
    overallSummary,
    questionFeedbacks,
    recommendedDrills,
    keyWeakness: lowestCategory.label,
    source: 'calibrated-fallback',
    evaluationBasis: {
      evaluatedSpeaker: 'candidate-only',
      aiTurnsExcluded,
      candidateTurnsAnalyzed,
      topicsAnswered: answeredCount,
      totalTopics: n,
      totalCandidateWords,
      rubricWeights: {
        technicalCorrectness: 35,
        tradeoffAnalysis: 25,
        communicationStructure: 20,
        problemDecomposition: 20,
      },
      scoringMethodLabel: 'Calibrated Candidate-Only Rubric Engine',
    },
  };
}

export async function generateTranscriptEvaluationReport(
  input: EvaluateInterviewInput
): Promise<EvaluatedReportPayload> {
  const deterministicBaseline = buildDeterministicEvaluationFromTranscript(input);
  const ai = getGeminiClient();
  const hasCandidateTopicSpeech = deterministicBaseline.evaluationBasis.topicsAnswered > 0;

  if (!ai || !hasCandidateTopicSpeech) {
    return deterministicBaseline;
  }

  try {
    const level = mapDifficultyLevel(input.difficulty);
    const perQuestion = extractPerQuestionTranscriptData(input);
    const candidateOnlyTurns = (input.transcript || [])
      .filter((t) => t.speaker === 'candidate' && t.kind === 'response' && typeof t.topicOrder === 'number')
      .map((t) => `[${t.timestamp}] Topic ${t.topicOrder} Candidate Answer: ${t.text}`)
      .join('\n');

    const prompt = `You are a Principal Hiring Committee Evaluator grading a mock interview for "${input.targetRole}" at "${input.targetCompany}" (${level}).

STRICT EVALUATION RULE — CANDIDATE-ONLY SCORING:
- Grade STRICTLY and ONLY from the candidate's spoken responses and overall performance below.
- DO NOT count, reward, or average in anything the AI interviewer said (questions and follow-ups are provided solely as context labels for what was asked).
- If a topic shows "[No candidate response recorded]", score that topic low (25-35) and state that no candidate answer was given.
- Overall Performance Metrics Observed: ${deterministicBaseline.evaluationBasis.topicsAnswered}/${deterministicBaseline.evaluationBasis.totalTopics} topics answered, ${deterministicBaseline.evaluationBasis.candidateTurnsAnalyzed} spoken candidate turns, ${deterministicBaseline.evaluationBasis.totalCandidateWords} candidate words over ${deterministicBaseline.durationFormatted}.

Topic Prompts & Candidate-Only Spoken Responses:
${JSON.stringify(
  perQuestion.map((p) => ({
    questionId: p.question.id,
    category: p.question.category,
    promptAskedContextOnlyDoNotScore: p.question.questionText,
    candidatePrimarySpokenAnswer: p.primaryResponse || '[No candidate response recorded]',
    aiFollowUpContextOnlyDoNotScore: p.followUpQuestion || null,
    candidateFollowUpSpokenAnswer: p.followUpResponse || null,
  }))
)}

Candidate-Only Chronological Spoken Log:
${candidateOnlyTurns.slice(0, 5000)}

Produce a grounded, honest JSON evaluation object based strictly on what the candidate actually said above:
1. "overallScore" (integer 25-98) and "categoryScores" (technicalCorrectness [35% weight], tradeoffAnalysis [25% weight], communicationStructure [20% weight], problemDecomposition [20% weight], each 25-98).
2. "percentileRank" (integer 15-99).
3. "overallSummary": 2-3 specific sentences citing actual points from the candidate's spoken responses and overall completion (${deterministicBaseline.evaluationBasis.topicsAnswered}/${deterministicBaseline.evaluationBasis.totalTopics} topics answered).
4. "keyWeakness": concise 3-7 word summary of the primary skill gap in the candidate's spoken answers.
5. "recommendedDrills": 2-4 specific study/practice drills addressing the candidate's actual gaps.
6. "questionFeedbacks": array matching the ${perQuestion.length} questions above with "questionId", "score" (25-98), "criterionScores" (2-3 items with criterion, score, feedback quoting/referencing the candidate's spoken words), "strengths" (1-3 items), "missingConcepts" (1-3 items), "suggestedImprovements" (1-2 items), and "modelExemplarAnswer" (concise staff-level ideal answer).`;

    const rawJson = await callJsonTextModelWithFallback({
      ai,
      prompt,
      timeoutMs: 6500,
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          overallScore: { type: Type.INTEGER },
          percentileRank: { type: Type.INTEGER },
          overallSummary: { type: Type.STRING },
          keyWeakness: { type: Type.STRING },
          recommendedDrills: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          categoryScores: {
            type: Type.OBJECT,
            properties: {
              technicalCorrectness: { type: Type.INTEGER },
              communicationStructure: { type: Type.INTEGER },
              problemDecomposition: { type: Type.INTEGER },
              tradeoffAnalysis: { type: Type.INTEGER },
            },
            required: [
              'technicalCorrectness',
              'communicationStructure',
              'problemDecomposition',
              'tradeoffAnalysis',
            ],
          },
          questionFeedbacks: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                questionId: { type: Type.STRING },
                score: { type: Type.INTEGER },
                criterionScores: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      criterion: { type: Type.STRING },
                      score: { type: Type.INTEGER },
                      feedback: { type: Type.STRING },
                    },
                    required: ['criterion', 'score', 'feedback'],
                  },
                },
                strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                missingConcepts: { type: Type.ARRAY, items: { type: Type.STRING } },
                suggestedImprovements: { type: Type.ARRAY, items: { type: Type.STRING } },
                modelExemplarAnswer: { type: Type.STRING },
              },
              required: [
                'questionId',
                'score',
                'criterionScores',
                'strengths',
                'missingConcepts',
                'suggestedImprovements',
                'modelExemplarAnswer',
              ],
            },
          },
        },
        required: [
          'overallScore',
          'categoryScores',
          'overallSummary',
          'questionFeedbacks',
          'recommendedDrills',
        ],
      },
    });

    const parsed = JSON.parse(rawJson || '{}');
    if (parsed && parsed.overallSummary && Array.isArray(parsed.questionFeedbacks)) {
      const mergedFeedbacks: EvaluatedQuestionFeedback[] = deterministicBaseline.questionFeedbacks.map(
        (baseFb, idx) => {
          const aiFb =
            parsed.questionFeedbacks.find((f: any) => f.questionId === baseFb.questionId) ||
            parsed.questionFeedbacks[idx];
          if (!aiFb) return baseFb;
          return {
            ...baseFb,
            score: clampScore(Number(aiFb.score ?? baseFb.score)),
            criterionScores:
              Array.isArray(aiFb.criterionScores) && aiFb.criterionScores.length > 0
                ? aiFb.criterionScores.map((c: any) => ({
                    criterion: String(c.criterion || 'Rubric Criterion'),
                    score: clampScore(Number(c.score ?? baseFb.score)),
                    feedback: String(c.feedback || ''),
                  }))
                : baseFb.criterionScores,
            strengths:
              Array.isArray(aiFb.strengths) && aiFb.strengths.length > 0
                ? aiFb.strengths.map(String)
                : baseFb.strengths,
            missingConcepts:
              Array.isArray(aiFb.missingConcepts)
                ? aiFb.missingConcepts.map(String)
                : baseFb.missingConcepts,
            suggestedImprovements:
              Array.isArray(aiFb.suggestedImprovements) && aiFb.suggestedImprovements.length > 0
                ? aiFb.suggestedImprovements.map(String)
                : baseFb.suggestedImprovements,
            modelExemplarAnswer: String(aiFb.modelExemplarAnswer || baseFb.modelExemplarAnswer),
          };
        }
      );

      return {
        ...deterministicBaseline,
        overallScore: clampScore(Number(parsed.overallScore ?? deterministicBaseline.overallScore)),
        percentileRank: clampScore(Number(parsed.percentileRank ?? deterministicBaseline.percentileRank), 20, 99),
        categoryScores: {
          technicalCorrectness: clampScore(
            Number(parsed.categoryScores?.technicalCorrectness ?? deterministicBaseline.categoryScores.technicalCorrectness)
          ),
          communicationStructure: clampScore(
            Number(parsed.categoryScores?.communicationStructure ?? deterministicBaseline.categoryScores.communicationStructure)
          ),
          problemDecomposition: clampScore(
            Number(parsed.categoryScores?.problemDecomposition ?? deterministicBaseline.categoryScores.problemDecomposition)
          ),
          tradeoffAnalysis: clampScore(
            Number(parsed.categoryScores?.tradeoffAnalysis ?? deterministicBaseline.categoryScores.tradeoffAnalysis)
          ),
        },
        overallSummary: String(parsed.overallSummary).trim(),
        keyWeakness: String(parsed.keyWeakness || deterministicBaseline.keyWeakness).trim(),
        recommendedDrills:
          Array.isArray(parsed.recommendedDrills) && parsed.recommendedDrills.length > 0
            ? parsed.recommendedDrills.map(String)
            : deterministicBaseline.recommendedDrills,
        questionFeedbacks: mergedFeedbacks,
        source: 'gemini',
        evaluationBasis: {
          ...deterministicBaseline.evaluationBasis,
          scoringMethodLabel: 'AI Candidate-Only Transcript Rubric Analysis',
        },
      };
    }
  } catch {
    // Fallback cleanly to deterministic transcript evaluation
  }

  return deterministicBaseline;
}
