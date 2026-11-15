import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { Communicate } from '@travisvn/edge-tts';
import { KokoroTTS } from 'kokoro-js';

export type PersonaName = 'Sarah' | 'Dr. Elena Vance' | 'Marcus Reed' | 'David Chen';
export type PrebuiltVoiceName = 'Kore' | 'Zephyr' | 'Charon' | 'Puck' | 'Fenrir';

export interface VoicePersonaConfig {
  persona: PersonaName;
  voiceName: PrebuiltVoiceName;
  kokoroVoiceId: 'af_heart' | 'af_bella' | 'am_michael' | 'am_puck' | 'am_adam';
  kokoroSpeed: number;
  edgeVoiceName: string;
  edgeRate: string;
  edgePitch: string;
  roleTitle: string;
  toneLabel: string;
  speechStyle: string;
}

export const EDGE_VOICE_PROFILES: Record<
  PrebuiltVoiceName,
  {
    kokoroVoiceId: 'af_heart' | 'af_bella' | 'am_michael' | 'am_puck' | 'am_adam';
    kokoroSpeed: number;
    edgeVoiceName: string;
    edgeRate: string;
    edgePitch: string;
  }
> = {
  Kore: {
    kokoroVoiceId: 'af_heart',
    kokoroSpeed: 0.99,
    edgeVoiceName: 'en-US-AvaMultilingualNeural',
    edgeRate: '-4%',
    edgePitch: '+0Hz',
  },
  Zephyr: {
    kokoroVoiceId: 'af_bella',
    kokoroSpeed: 1.0,
    edgeVoiceName: 'en-US-EmmaMultilingualNeural',
    edgeRate: '-3%',
    edgePitch: '+0Hz',
  },
  Charon: {
    kokoroVoiceId: 'am_michael',
    kokoroSpeed: 0.98,
    edgeVoiceName: 'en-US-AndrewMultilingualNeural',
    edgeRate: '-4%',
    edgePitch: '-2Hz',
  },
  Puck: {
    kokoroVoiceId: 'am_puck',
    kokoroSpeed: 1.01,
    edgeVoiceName: 'en-US-BrianMultilingualNeural',
    edgeRate: '-3%',
    edgePitch: '+0Hz',
  },
  Fenrir: {
    kokoroVoiceId: 'am_adam',
    kokoroSpeed: 0.99,
    edgeVoiceName: 'en-US-SteffanNeural',
    edgeRate: '-4%',
    edgePitch: '-2Hz',
  },
};

export const VOICE_PERSONAS: Record<PersonaName, VoicePersonaConfig> = {
  Sarah: {
    persona: 'Sarah',
    voiceName: 'Kore',
    ...EDGE_VOICE_PROFILES.Kore,
    roleTitle: 'Principal Systems Architect & Bar Raiser',
    toneLabel: 'Kore · Warm Executive (Ava Neural)',
    speechStyle:
      'Authentic Principal Systems Architect speaking live in a 1-on-1 engineering interview; warm, conversational human cadence with natural micro-pauses, empathetic listening tone, never robotic or announcer-like.',
  },
  'Dr. Elena Vance': {
    persona: 'Dr. Elena Vance',
    voiceName: 'Zephyr',
    ...EDGE_VOICE_PROFILES.Zephyr,
    roleTitle: 'AI Infrastructure Lead',
    toneLabel: 'Zephyr · Crisp Analytical (Emma Neural)',
    speechStyle:
      'Real Staff Infrastructure Lead conducting a thoughtful technical interview; crisp, unhurried conversational inflection, genuinely curious and composed human voice.',
  },
  'Marcus Reed': {
    persona: 'Marcus Reed',
    voiceName: 'Charon',
    ...EDGE_VOICE_PROFILES.Charon,
    roleTitle: 'Engineering Director',
    toneLabel: 'Charon · Grounded Executive (Andrew Neural)',
    speechStyle:
      'Seasoned Engineering Director speaking naturally in a live panel; calm baritone warmth, steady conversational rhythm, authentic executive composure.',
  },
  'David Chen': {
    persona: 'David Chen',
    voiceName: 'Puck',
    ...EDGE_VOICE_PROFILES.Puck,
    roleTitle: 'Staff Frontend Lead',
    toneLabel: 'Puck · Collaborative Lead (Brian Neural)',
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
    const chosen = voiceOverride as PrebuiltVoiceName;
    return {
      ...base,
      voiceName: chosen,
      ...EDGE_VOICE_PROFILES[chosen],
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

export function prepareNaturalSpeechText(text: string, model: string): string {
  const cleaned = (text || '')
    .replace(/[*_`#]/g, '')
    .replace(/<\/?[a-z]+>/gi, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\bL([4-7])\b/g, 'level $1')
    .replace(/\bP99\b/gi, 'p ninety nine')
    .replace(/\bP95\b/gi, 'p ninety five')
    .replace(/\bJD\b/g, 'job description')
    .replace(/\bSLOs?\b/g, 'service level objectives')
    .replace(/\bSLIs?\b/g, 'service level indicators')
    .trim();
  if (model === 'gemini-3.8-flash-tts') {
    // Insert subtle breath before transitions for Gemini 3.8 Flash TTS natural cadence
    return cleaned
      .replace(/\. (Let's|So |Now |Whenever you're ready|Before we move)/g, '. <breath> $1')
      .trim();
  }
  // For Microsoft Edge Neural voices, clean punctuation creates natural conversational breathing without tag words
  return cleaned;
}

let kokoroEnginePromise: Promise<KokoroTTS | null> | null = null;
let kokoroSynthQueue: Promise<unknown> = Promise.resolve();

async function getKokoroEngine(): Promise<KokoroTTS | null> {
  if (!kokoroEnginePromise) {
    kokoroEnginePromise = KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', {
      dtype: 'q4',
      device: 'cpu',
    }).catch((err) => {
      console.log('[AI Voice Agent] Kokoro-82M initialization deferred:', (err as Error)?.message || err);
      kokoroEnginePromise = null;
      return null;
    });
  }
  return kokoroEnginePromise;
}

export function warmNeuralVoiceEngine(): void {
  void getKokoroEngine().then((engine) => {
    if (engine) {
      console.log('[AI Voice Agent] Kokoro-82M human neural voice engine warm and ready.');
    }
  });
}

async function synthesizeKokoroNeuralAudio(params: {
  text: string;
  voiceCfg: VoicePersonaConfig;
  timeoutMs?: number;
}): Promise<string | null> {
  const timeoutMs = params.timeoutMs ?? 24000;
  const spokenScript = prepareNaturalSpeechText(params.text, 'kokoro-neural-tts');
  if (!spokenScript) return null;

  const runTask = async (): Promise<string | null> => {
    const engine = await getKokoroEngine();
    if (!engine) return null;

    const audio = await Promise.race([
      engine.generate(spokenScript, {
        voice: params.voiceCfg.kokoroVoiceId,
        speed: params.voiceCfg.kokoroSpeed,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Kokoro neural voice synthesis timeout')), timeoutMs)
      ),
    ]);

    const wavBuffer = Buffer.from(audio.toWav());
    if (wavBuffer.length < 256) return null;
    return wavBuffer.toString('base64');
  };

  // Serialize ONNX CPU synthesis cleanly so concurrent requests never contend
  const queued = kokoroSynthQueue.then(runTask, runTask);
  kokoroSynthQueue = queued.catch(() => null);

  try {
    return await queued;
  } catch (err) {
    console.log(
      `[AI Voice Agent] Kokoro-82M voice (${params.voiceCfg.kokoroVoiceId}) fallback (${(err as Error)?.message || 'unavailable'}).`
    );
    return null;
  }
}

async function synthesizeEdgeNeuralAudio(params: {
  text: string;
  voiceCfg: VoicePersonaConfig;
  timeoutMs?: number;
}): Promise<string | null> {
  const timeoutMs = params.timeoutMs ?? 3500;
  const spokenScript = prepareNaturalSpeechText(params.text, 'edge-neural-tts');
  if (!spokenScript) return null;

  try {
    const communicate = new Communicate(spokenScript, {
      voice: params.voiceCfg.edgeVoiceName,
      rate: params.voiceCfg.edgeRate,
      pitch: params.voiceCfg.edgePitch,
      connectionTimeout: timeoutMs,
    });

    const audioChunks: Buffer[] = [];
    await Promise.race([
      (async () => {
        for await (const chunk of communicate.stream()) {
          if (chunk.type === 'audio' && chunk.data) {
            audioChunks.push(chunk.data);
          }
        }
      })(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Edge neural voice stream timeout')), timeoutMs)
      ),
    ]);

    if (audioChunks.length === 0) return null;
    const combined = Buffer.concat(audioChunks);
    if (combined.length < 128) return null;
    return combined.toString('base64');
  } catch {
    return null;
  }
}

export async function synthesizeSpeechAudio(params: {
  text: string;
  persona?: string;
  voiceOverride?: string;
}): Promise<{
  audioBase64: string | null;
  mimeType: string;
  voiceName: PrebuiltVoiceName;
  neuralVoiceId?: string;
  provider: 'kokoro-neural-tts' | 'edge-neural-tts' | 'gemini-neural-tts' | 'browser-fallback';
  quotaLimited?: boolean;
}> {
  const voiceCfg = resolveVoiceConfig(params.persona, params.voiceOverride);
  const cleanText = (params.text || '').replace(/[*_`#]/g, '').trim();

  if (!cleanText) {
    return {
      audioBase64: null,
      mimeType: 'audio/wav',
      voiceName: voiceCfg.voiceName,
      neuralVoiceId: voiceCfg.kokoroVoiceId,
      provider: 'browser-fallback',
    };
  }

  const cacheKey = `${voiceCfg.voiceName}:${voiceCfg.kokoroVoiceId}:${cleanText}`;
  const cachedAudio = ttsAudioCache.get(cacheKey);
  if (cachedAudio) {
    return {
      ...cachedAudio,
      neuralVoiceId: cachedAudio.mimeType === 'audio/mpeg' ? voiceCfg.edgeVoiceName : voiceCfg.kokoroVoiceId,
      provider: cachedAudio.mimeType === 'audio/mpeg' ? 'edge-neural-tts' : 'kokoro-neural-tts',
    };
  }

  // Tier 1: Kokoro-82M Neural Voice Agent (in-process human prosody, 24kHz WAV, zero cloud API limits)
  const kokoroBase64 = await synthesizeKokoroNeuralAudio({
    text: cleanText,
    voiceCfg,
    timeoutMs: 24000,
  });

  if (kokoroBase64) {
    if (ttsAudioCache.size >= 40) {
      const oldest = ttsAudioCache.keys().next().value;
      if (oldest) ttsAudioCache.delete(oldest);
    }
    ttsAudioCache.set(cacheKey, {
      audioBase64: kokoroBase64,
      mimeType: 'audio/wav',
      voiceName: voiceCfg.voiceName,
    });
    return {
      audioBase64: kokoroBase64,
      mimeType: 'audio/wav',
      voiceName: voiceCfg.voiceName,
      neuralVoiceId: voiceCfg.kokoroVoiceId,
      provider: 'kokoro-neural-tts',
    };
  }

  // Tier 2: Microsoft Multilingual Human Neural Voice Agent
  const edgeBase64 = await synthesizeEdgeNeuralAudio({
    text: cleanText,
    voiceCfg,
    timeoutMs: 3500,
  });

  if (edgeBase64) {
    if (ttsAudioCache.size >= 40) {
      const oldest = ttsAudioCache.keys().next().value;
      if (oldest) ttsAudioCache.delete(oldest);
    }
    ttsAudioCache.set(cacheKey, {
      audioBase64: edgeBase64,
      mimeType: 'audio/mpeg',
      voiceName: voiceCfg.voiceName,
    });
    return {
      audioBase64: edgeBase64,
      mimeType: 'audio/mpeg',
      voiceName: voiceCfg.voiceName,
      neuralVoiceId: voiceCfg.edgeVoiceName,
      provider: 'edge-neural-tts',
    };
  }

  // Tier 2: Gemini Neural TTS (if configured and within quota)
  const ai = getGeminiClient();
  if (!ai) {
    return {
      audioBase64: null,
      mimeType: 'audio/wav',
      voiceName: voiceCfg.voiceName,
      neuralVoiceId: voiceCfg.edgeVoiceName,
      provider: 'browser-fallback',
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
          neuralVoiceId: voiceCfg.voiceName,
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
    neuralVoiceId: voiceCfg.edgeVoiceName,
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

function clampScore(value: number, min = 0, max = 98): number {
  if (!Number.isFinite(value)) return 0;
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
  'architecture', 'latency', 'p99', 'p95', 'cache', 'redis', 'idempotency', 'idempotent',
  'retry', 'backoff', 'queue', 'kafka', 'circuit', 'partition', 'sharding', 'consistency',
  'tradeoff', 'metric', 'monitoring', 'observability', 'telemetry', 'rollback', 'canary', 'scale',
  'throughput', 'dead-letter', 'dlq', 'concurrency', 'transaction', 'database', 'postgres', 'index',
  'state', 'reconciliation', 'websocket', 'streaming', 'fallback', 'availability', 'replication',
  'timeout', 'failover', 'indexing', 'async', 'schema', 'validation', 'lock', 'mutex', 'rate-limit',
  'load-balancer', 'cdn', 'hydration', 'memoization', 'bundler', 'accessibility', 'security', 'auth',
  'oauth', 'token', 'encryption', 'deployment', 'pipeline', 'testing', 'slo', 'sla', 'sli',
];

const BEHAVIORAL_SIGNAL_TERMS = [
  'situation', 'task', 'action', 'result', 'impact', 'alignment', 'stakeholder', 'cross-functional',
  'ownership', 'mentored', 'resolved', 'conflict', 'prioritized', 'deadline', 'postmortem',
  'incident', 'learned', 'retrospective', 'collaborated', 'led', 'delivered', 'reduced', 'improved',
];

const FILLER_WORDS = new Set([
  'um', 'uh', 'uhh', 'hmm', 'er', 'like', 'yeah', 'yep', 'ok', 'okay', 'so', 'well',
  'actually', 'basically', 'literally', 'just', 'maybe', 'stuff', 'things', 'whatever',
]);

const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'from', 'your', 'about', 'what', 'when', 'where',
  'which', 'would', 'could', 'should', 'have', 'been', 'will', 'into', 'they', 'their', 'them',
  'there', 'then', 'than', 'also', 'some', 'more', 'most', 'very', 'much', 'such', 'only',
  'were', 'being', 'time', 'times', 'looking', 'most', 'walk', 'through', 'tell', 'describe',
  'explain', 'design', 'approach', 'handle', 'using', 'system', 'interview', 'question', 'please',
  'ready', 'candidate', 'today', 'impactful', 'project', 'date', 'significant', 'major', 'evolve',
  'faced', 'face', 'give', 'example', 'make', 'sure', 'work', 'worked', 'around', 'specifically',
  'hardest', 'before', 'after', 'during', 'how', 'you', 'role', 'company', 'team', 'peer', 'disagreed',
  'experience', 'leadership', 'technical', 'stripe', 'google', 'backend', 'frontend', 'engineer',
]);

const STRUCTURE_TERMS = [
  'first', 'second', 'third', 'finally', 'because', 'therefore', 'specifically', 'additionally',
  'situation', 'task', 'action', 'result', 'impact', 'measured', 'for example', 'step', 'overall',
];

const TRADEOFF_TERMS = [
  'tradeoff', 'trade-off', 'trading', 'versus', 'instead', 'however', 'alternatively', 'overhead',
  'consistency', 'backoff', 'fallback', 'rollback', 'canary', 'cost', 'bottleneck', 'risk',
  'partition', 'dead-letter', 'circuit', 'timeout', 'failover', 'failure', 'outage', 'overload', 'contention',
];

const DECOMPOSITION_TERMS = [
  'scope', 'scoped', 'requirement', 'constraint', 'assumption', 'boundary', 'component', 'layer',
  'step', 'phase', 'interface', 'contract', 'schema', 'upstream', 'downstream', 'tier', 'pipeline',
  'storage', 'compute', 'client', 'server', 'queue', 'worker', 'edge', 'read', 'write', 'isolate', 'isolated', 'split',
];

const EVASIVE_PHRASES = [
  "i don't know", 'dont know', 'do not know', 'no idea', 'not sure', 'i have no clue',
  'no clue', 'skip this', 'skip question', 'next question', 'pass on this', "can't answer",
  'cannot answer', 'i forgot', 'blanking out', 'draw a blank', 'no experience with',
  'never done that', 'nothing to add', 'no comment',
];

function extractSubstantiveWords(text: string): string[] {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9%\-\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 0 && !FILLER_WORDS.has(w));
}

function extractPromptKeywords(question: any, candidateFirstName?: string): string[] {
  const firstNameLower = (candidateFirstName || '').trim().toLowerCase();
  const explicitConcepts: string[] = Array.isArray(question?.expectedKeyConcepts)
    ? question.expectedKeyConcepts.map((s: any) => String(s).toLowerCase().trim()).filter(Boolean)
    : [];
  const rawSource = [
    question?.questionText || '',
    question?.contextOrConstraint || '',
  ]
    .join(' ')
    .toLowerCase()
    .replace(/[^a-z0-9\-\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 5 && !STOPWORDS.has(w) && w !== firstNameLower);

  const combined = Array.from(new Set([...explicitConcepts, ...rawSource]));
  const domainMatches = combined.filter(
    (kw) =>
      TECHNICAL_SIGNAL_TERMS.some((t) => kw.includes(t)) ||
      TRADEOFF_TERMS.some((t) => kw.includes(t)) ||
      DECOMPOSITION_TERMS.some((t) => kw.includes(t)) ||
      BEHAVIORAL_SIGNAL_TERMS.some((t) => kw.includes(t))
  );
  const pool = domainMatches.length >= 2 ? domainMatches : combined;
  return pool.slice(0, 10);
}

type AnswerTier = 'unanswered' | 'evasive-non-answer' | 'superficial-off-topic' | 'substantive';

interface AssessedTopicSignals {
  tier: AnswerTier;
  rawWords: string[];
  substantiveWords: string[];
  matchedDomainTerms: string[];
  matchedPromptTerms: string[];
  missedPromptTerms: string[];
  matchedStructure: string[];
  matchedTradeoffs: string[];
  matchedDecomposition: string[];
  hasQuantifiedMetric: boolean;
  fillerRatio: number;
  techScore: number;
  tradeoffScore: number;
  commScore: number;
  decompScore: number;
  topicScore: number;
}

function assessTopicCandidateSpeech(
  question: any,
  primaryResponse: string,
  followUpResponse: string | undefined,
  interviewType: string,
  candidateFirstName?: string
): AssessedTopicSignals {
  const combinedSpoken = [primaryResponse, followUpResponse].filter(Boolean).join(' ').trim();
  const rawWords = combinedSpoken ? combinedSpoken.split(/\s+/).filter(Boolean) : [];
  const substantiveWords = extractSubstantiveWords(combinedSpoken);
  const lower = combinedSpoken.toLowerCase();

  const promptKeywords = extractPromptKeywords(question, candidateFirstName);
  const matchedPromptTerms = promptKeywords.filter((kw) => lower.includes(kw));
  const missedPromptTerms = promptKeywords.filter((kw) => !lower.includes(kw)).slice(0, 4);

  const domainPool =
    interviewType === 'behavioral' || interviewType === 'hr-cultural'
      ? [...BEHAVIORAL_SIGNAL_TERMS, ...TECHNICAL_SIGNAL_TERMS]
      : [...TECHNICAL_SIGNAL_TERMS, ...BEHAVIORAL_SIGNAL_TERMS];
  const matchedDomainTerms = Array.from(new Set(domainPool.filter((term) => lower.includes(term))));
  const matchedStructure = STRUCTURE_TERMS.filter((term) => lower.includes(term));
  const matchedTradeoffs = TRADEOFF_TERMS.filter((term) => lower.includes(term));
  const matchedDecomposition = DECOMPOSITION_TERMS.filter((term) => lower.includes(term));
  const hasQuantifiedMetric = /\d+%|\d+\s*(ms|s|sec|min|k|m|x|rps|qps|mb|gb|tb)|p99|p95|o\(/i.test(
    combinedSpoken
  );

  const fillerCount = Math.max(0, rawWords.length - substantiveWords.length);
  const fillerRatio = rawWords.length > 0 ? fillerCount / rawWords.length : 1;

  if (rawWords.length === 0) {
    return {
      tier: 'unanswered',
      rawWords,
      substantiveWords,
      matchedDomainTerms,
      matchedPromptTerms,
      missedPromptTerms,
      matchedStructure,
      matchedTradeoffs,
      matchedDecomposition,
      hasQuantifiedMetric,
      fillerRatio,
      techScore: 0,
      tradeoffScore: 0,
      commScore: 0,
      decompScore: 0,
      topicScore: 0,
    };
  }

  const normalizedTrimmed = lower.replace(/[^a-z0-9\s']/g, ' ').replace(/\s+/g, ' ').trim();
  const isExplicitEvasive =
    EVASIVE_PHRASES.some((p) => normalizedTrimmed.includes(p)) &&
    matchedDomainTerms.length === 0 &&
    matchedPromptTerms.length <= 1;
  const isTinyNonAnswer =
    substantiveWords.length <= 5 && matchedDomainTerms.length === 0 && matchedPromptTerms.length === 0;

  if (isExplicitEvasive || isTinyNonAnswer) {
    const acknowledged = rawWords.length >= 3 ? 6 : 2;
    const techScore = 0;
    const tradeoffScore = 0;
    const commScore = Math.min(12, acknowledged + (matchedStructure.length > 0 ? 4 : 0));
    const decompScore = 0;
    const topicScore = clampScore(
      techScore * 0.35 + tradeoffScore * 0.25 + commScore * 0.2 + decompScore * 0.2
    );
    return {
      tier: 'evasive-non-answer',
      rawWords,
      substantiveWords,
      matchedDomainTerms,
      matchedPromptTerms,
      missedPromptTerms,
      matchedStructure,
      matchedTradeoffs,
      matchedDecomposition,
      hasQuantifiedMetric,
      fillerRatio,
      techScore,
      tradeoffScore,
      commScore,
      decompScore,
      topicScore,
    };
  }

  // Superficial / off-topic answer: candidate spoke >5 words, yet zero domain terms and zero prompt keyword relevance
  const isOffTopicOrSuperficial =
    matchedDomainTerms.length === 0 && matchedPromptTerms.length === 0 && substantiveWords.length < 24;

  if (isOffTopicOrSuperficial) {
    const lengthSignal = Math.min(14, Math.round(substantiveWords.length * 0.7));
    const techScore = clampScore(4 + Math.round(lengthSignal * 0.5), 4, 18);
    const tradeoffScore = clampScore(matchedTradeoffs.length * 6, 0, 14);
    const commScore = clampScore(10 + lengthSignal + (matchedStructure.length > 0 ? 8 : 0) - Math.round(fillerRatio * 12), 6, 32);
    const decompScore = clampScore(4 + matchedDecomposition.length * 6, 2, 18);
    const topicScore = clampScore(
      techScore * 0.35 + tradeoffScore * 0.25 + commScore * 0.2 + decompScore * 0.2
    );
    return {
      tier: 'superficial-off-topic',
      rawWords,
      substantiveWords,
      matchedDomainTerms,
      matchedPromptTerms,
      missedPromptTerms,
      matchedStructure,
      matchedTradeoffs,
      matchedDecomposition,
      hasQuantifiedMetric,
      fillerRatio,
      techScore,
      tradeoffScore,
      commScore,
      decompScore,
      topicScore,
    };
  }

  // Substantive answer: compute ALL 4 dimensions INDEPENDENTLY so categories genuinely diverge!
  const followUpWords = followUpResponse ? extractSubstantiveWords(followUpResponse).length : 0;
  const sentences = combinedSpoken
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 4);
  const clauseSignals = (combinedSpoken.match(/[,;:]|\b(?:and|because|while|then|so)\b/gi) || []).length;
  const effectiveClauses = Math.max(sentences.length, clauseSignals >= 3 ? 3 : clauseSignals >= 1 ? 2 : 1);

  const relevanceRatio =
    promptKeywords.length > 0 ? Math.min(1, matchedPromptTerms.length / Math.min(3, promptKeywords.length)) : 0.5;

  // 1. Technical Depth & Accuracy (0-98)
  const techScore = clampScore(
    22 +
      Math.round(relevanceRatio * 18) +
      Math.min(36, matchedDomainTerms.length * 8) +
      Math.min(14, Math.round(substantiveWords.length * 0.35)) +
      (hasQuantifiedMetric ? 10 : 0),
    8,
    98
  );

  // 2. Tradeoff & Failure-Mode Analysis (0-98)
  const tradeoffScore = clampScore(
    12 +
      Math.min(48, matchedTradeoffs.length * 16) +
      (hasQuantifiedMetric ? 8 : 0) +
      (followUpWords >= 8 ? 14 : followUpWords >= 4 ? 7 : 0) +
      (matchedTradeoffs.length > 0 ? Math.round(relevanceRatio * 12) : 0),
    4,
    98
  );

  // 3. Communication Clarity & Structure / STAR (0-98)
  const sentenceClarityPts =
    effectiveClauses >= 3 ? 22 : effectiveClauses === 2 ? 15 : 8;
  const fillerPenalty = fillerRatio > 0.35 ? 18 : fillerRatio > 0.2 ? 9 : 0;
  const commScore = clampScore(
    22 +
      sentenceClarityPts +
      Math.min(26, matchedStructure.length * 10) +
      Math.min(20, Math.round(substantiveWords.length * 0.45)) -
      fillerPenalty,
    8,
    96
  );

  // 4. Problem Decomposition & Scoping (0-98)
  const decompScore = clampScore(
    16 +
      Math.min(40, matchedDecomposition.length * 11) +
      Math.round(relevanceRatio * 16) +
      (followUpWords >= 10 ? 14 : followUpWords >= 5 ? 8 : 0) +
      (substantiveWords.length >= 25 ? 10 : substantiveWords.length >= 15 ? 5 : 0),
    6,
    96
  );

  const topicScore = clampScore(
    techScore * 0.35 + tradeoffScore * 0.25 + commScore * 0.2 + decompScore * 0.2,
    0,
    98
  );

  return {
    tier: 'substantive',
    rawWords,
    substantiveWords,
    matchedDomainTerms,
    matchedPromptTerms,
    missedPromptTerms,
    matchedStructure,
    matchedTradeoffs,
    matchedDecomposition,
    hasQuantifiedMetric,
    fillerRatio,
    techScore,
    tradeoffScore,
    commScore,
    decompScore,
    topicScore,
  };
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
  let substantiveCount = 0;
  let totalCandidateWords = 0;
  const topicSignalsById = new Map<string, AssessedTopicSignals>();

  const questionFeedbacks: EvaluatedQuestionFeedback[] = itemsToScore.map((item) => {
    const signals = assessTopicCandidateSpeech(
      item.question,
      item.primaryResponse,
      item.followUpResponse,
      input.interviewType,
      candidateFirstName
    );
    topicSignalsById.set(item.question.id, signals);

    if (signals.rawWords.length > 0) {
      answeredCount += 1;
      totalCandidateWords += signals.rawWords.length;
    }
    if (signals.tier === 'substantive') {
      substantiveCount += 1;
    }

    totalTech += signals.techScore;
    totalComm += signals.commScore;
    totalDecomp += signals.decompScore;
    totalTradeoff += signals.tradeoffScore;

    const rubric = item.question.evaluationRubric?.length
      ? item.question.evaluationRubric
      : [
          { criterion: 'Technical Accuracy & Depth', weight: 40, description: 'Engineering depth' },
          { criterion: 'Tradeoff & Failure Analysis', weight: 35, description: 'Edge cases and reliability' },
          { criterion: 'Structured Delivery', weight: 25, description: 'Clear verbal reasoning' },
        ];

    const criterionScores = rubric.map((r, rIdx) => {
      const scoreVal =
        rIdx === 0 ? signals.techScore : rIdx === 1 ? signals.tradeoffScore : signals.commScore;
      let feedback = '';
      if (signals.tier === 'unanswered') {
        feedback = `Scored 0/100: Candidate gave no spoken response for "${item.question.category}".`;
      } else if (signals.tier === 'evasive-non-answer') {
        feedback = `Scored ${scoreVal}/100: Candidate reply ("${item.primaryResponse.slice(0, 60)}") did not answer the question or declined to address ${r.criterion.toLowerCase()}.`;
      } else if (signals.tier === 'superficial-off-topic') {
        feedback = `Scored ${scoreVal}/100: Brief ${signals.rawWords.length}-word reply lacked concrete ${r.criterion.toLowerCase()} concepts or prompt relevance.`;
      } else if (rIdx === 0) {
        feedback =
          signals.matchedDomainTerms.length > 0
            ? `Demonstrated ${signals.matchedDomainTerms.slice(0, 4).join(', ')} across ${signals.rawWords.length} spoken words${signals.hasQuantifiedMetric ? ' with quantified SLIs/metrics' : ''}.`
            : `Covered ${signals.matchedPromptTerms.slice(0, 3).join(', ') || item.question.category} at a high level; needs deeper concrete system mechanics.`;
      } else if (rIdx === 1) {
        feedback =
          signals.matchedTradeoffs.length > 0
            ? `Addressed reliability/tradeoff factors (${signals.matchedTradeoffs.slice(0, 3).join(', ')}).`
            : `Limited tradeoff or failure-mode discussion; explain what breaks under scale or partial failure.`;
      } else {
        feedback =
          signals.matchedStructure.length > 0
            ? `Organized delivery using clear logical transitions (${signals.matchedStructure.slice(0, 3).join(', ')}).`
            : `Delivery would be sharper using Problem -> Architecture -> Tradeoffs -> Metrics framing.`;
      }
      return {
        criterion: r.criterion,
        score: scoreVal,
        feedback,
      };
    });

    const strengths: string[] =
      signals.tier === 'unanswered'
        ? ['No candidate speech recorded for this topic before ending the session.']
        : signals.tier === 'evasive-non-answer'
        ? ['Acknowledged the prompt briefly, though without technical or experiential substance.']
        : signals.tier === 'superficial-off-topic'
        ? [`Spoke ${signals.rawWords.length} words, though key domain terminology was missing.`]
        : [
            signals.matchedDomainTerms.length > 0
              ? `Applied relevant concepts directly: ${signals.matchedDomainTerms.slice(0, 4).join(', ')}.`
              : `Addressed ${item.question.category} across ${signals.rawWords.length} spoken words.`,
            ...(signals.hasQuantifiedMetric
              ? ['Quantified impact or latency/throughput constraints using concrete numbers.']
              : []),
            ...(signals.matchedTradeoffs.length >= 2
              ? [`Evaluated multiple tradeoff dimensions (${signals.matchedTradeoffs.slice(0, 3).join(', ')}).`]
              : []),
            ...(item.followUpResponse && extractSubstantiveWords(item.followUpResponse).length >= 6
              ? [`Responded meaningfully to ${input.aiPersona}'s live follow-up probe.`]
              : []),
          ];

    const missingConcepts: string[] =
      signals.tier === 'unanswered'
        ? [`No spoken candidate answer recorded for "${item.question.category}".`]
        : signals.tier === 'evasive-non-answer'
        ? [
            `Failed to provide a substantive answer for ${item.question.category}.`,
            ...(signals.missedPromptTerms.length > 0
              ? [`Core prompt concepts unaddressed: ${signals.missedPromptTerms.join(', ')}.`]
              : []),
          ]
        : [
            ...(signals.missedPromptTerms.length > 0
              ? [`Prompt/domain keywords omitted: ${signals.missedPromptTerms.slice(0, 3).join(', ')}.`]
              : []),
            ...(signals.matchedTradeoffs.length === 0
              ? ['Did not compare architectural tradeoffs, bottlenecks, or failure/rollback paths.']
              : []),
            ...(!signals.hasQuantifiedMetric
              ? ['Missing quantitative SLIs, p95/p99 latency targets, scale estimates, or measurable outcomes.']
              : []),
            ...(!item.followUpResponse && item.followUpQuestion
              ? ['Did not complete a spoken answer to the real-time follow-up probe.']
              : []),
          ];

    const suggestedImprovements: string[] =
      signals.tier === 'unanswered'
        ? [
            `Attempt every planned topic—even stating initial clarifying assumptions and a high-level component breakdown earns partial signal.`,
            `Prepare a 60-second structured outline covering constraints, core design, and failure handling for ${item.question.category}.`,
          ]
        : signals.tier === 'evasive-non-answer'
        ? [
            `Instead of stopping at "${item.primaryResponse.slice(0, 40)}", break down what you do know: clarify assumptions, propose a baseline architecture/STAR story, and reason from first principles.`,
            `Review core concepts for ${item.question.category}: ${signals.missedPromptTerms.slice(0, 3).join(', ') || 'system mechanics, tradeoffs, and measurable metrics'}.`,
          ]
        : signals.tier === 'superficial-off-topic'
        ? [
            `Anchor your spoken answer directly to the prompt keywords (${signals.missedPromptTerms.slice(0, 3).join(', ') || item.question.category}) rather than speaking generally.`,
            `Use a 4-part verbal checklist: (1) Scope & constraints, (2) Step-by-step mechanism, (3) Tradeoffs & failure modes, (4) Concrete metrics.`,
          ]
        : [
            ...(signals.tradeoffScore < 60
              ? [
                  `Strengthen Tradeoff Analysis (${signals.tradeoffScore}/100): explicitly contrast two alternatives (e.g., latency vs. consistency or cost) and explain rollback/circuit-breaker safeguards.`,
                ]
              : []),
            ...(signals.commScore < 65
              ? [
                  `Tighten Verbal Structure (${signals.commScore}/100): signpost with "First / Second / As a result" and avoid filler words (${Math.round(signals.fillerRatio * 100)}% filler rate observed).`,
                ]
              : []),
            ...(signals.decompScore < 65
              ? [
                  `Improve Problem Decomposition (${signals.decompScore}/100): state scale/SLO constraints upfront before diving into component details.`,
                ]
              : []),
            ...(!signals.hasQuantifiedMetric
              ? [
                  `Quantify your outcome with real numbers (e.g., p99 latency bounds, throughput, error budget %, or time saved) tailored to ${input.targetCompany}.`,
                ]
              : []),
          ];

    if (suggestedImprovements.length === 0) {
      const dims = [
        {
          key: 'Tradeoff Analysis',
          score: signals.tradeoffScore,
          tip: `contrast one alternative architecture for ${item.question.category} and specify exact rollback thresholds`,
        },
        {
          key: 'Problem Decomposition',
          score: signals.decompScore,
          tip: `state explicit scale bounds and component contracts upfront before detailing ${item.question.category}`,
        },
        {
          key: 'Structure & STAR',
          score: signals.commScore,
          tip: `summarize the final measured outcome in a crisp 1-sentence closer for ${item.question.category}`,
        },
        {
          key: 'Technical Depth',
          score: signals.techScore,
          tip: `incorporate missed prompt concepts (${signals.missedPromptTerms.slice(0, 2).join(', ') || 'failure isolation & edge invariants'}) to reach L7/Principal depth`,
        },
      ].sort((a, b) => a.score - b.score);
      const targetDim = dims[0];
      const keywordAddendum =
        signals.missedPromptTerms.length > 0
          ? ` Also weave in ${signals.missedPromptTerms.slice(0, 2).join(', ')} for stronger signal.`
          : '';
      suggestedImprovements.push(
        `Elevate ${targetDim.key} (${targetDim.score}/100): ${targetDim.tip}.${keywordAddendum}`
      );
    }

    return {
      questionId: item.question.id,
      questionText: item.question.questionText,
      category: item.question.category,
      candidateResponse: item.primaryResponse || 'No candidate spoken response recorded.',
      followUpQuestion: item.followUpQuestion,
      followUpResponse: item.followUpResponse,
      score: signals.topicScore,
      criterionScores,
      strengths,
      missingConcepts,
      suggestedImprovements,
      modelExemplarAnswer: `For ${input.targetRole} at ${input.targetCompany} (${level}), open by stating explicit constraints and SLO targets for ${item.question.category}, lay out the core architecture/workflow (${signals.missedPromptTerms.slice(0, 2).join(', ') || 'key components'}), weigh latency vs. consistency/cost tradeoffs with failure rollback triggers, and cite measurable production metrics.`,
    };
  });

  const n = questionFeedbacks.length || 1;
  const technicalCorrectness = clampScore(totalTech / n, 0, 98);
  const communicationStructure = clampScore(totalComm / n, 0, 98);
  const problemDecomposition = clampScore(totalDecomp / n, 0, 98);
  const tradeoffAnalysis = clampScore(totalTradeoff / n, 0, 98);
  const overallScore = clampScore(
    technicalCorrectness * 0.35 +
      tradeoffAnalysis * 0.25 +
      communicationStructure * 0.2 +
      problemDecomposition * 0.2,
    0,
    98
  );
  const percentileRank =
    overallScore === 0 ? 1 : clampScore(Math.round(overallScore * 0.96), 1, 99);

  const rankedCategories = [
    { label: 'Technical Depth & System Mechanics', score: technicalCorrectness },
    { label: 'Tradeoff & Failure-Mode Analysis', score: tradeoffAnalysis },
    { label: 'Structured Verbal Communication', score: communicationStructure },
    { label: 'Problem Decomposition & Scoping', score: problemDecomposition },
  ].sort((a, b) => a.score - b.score);

  const lowestCategory = rankedCategories[0];
  const highestCategory = rankedCategories[rankedCategories.length - 1];

  const recommendedDrills: string[] = [];
  if (substantiveCount === 0) {
    recommendedDrills.push(
      `Foundational Readiness Drill: Practice answering ${input.targetRole} prompts aloud with structured 60-second outlines`,
      `Core Concept Review for ${input.targetCompany}: ${questionFeedbacks[0]?.category || input.interviewType}`
    );
  } else {
    recommendedDrills.push(
      `Priority Fix (${lowestCategory.score}/100): ${lowestCategory.label} for ${input.targetRole} (${input.targetCompany})`
    );
    questionFeedbacks
      .filter((fb) => fb.score < 78)
      .slice(0, 2)
      .forEach((fb) => {
        recommendedDrills.push(
          `Targeted Drill (${fb.score}/100): ${fb.category} — focus on ${fb.missingConcepts[0]?.slice(0, 75) || 'depth & tradeoffs'}`
        );
      });
  }
  if (recommendedDrills.length < 2) {
    recommendedDrills.push(`${input.targetCompany} ${level} Real-Time Follow-Up Handling & Edge Cases`);
  }

  const candidateTurnsAnalyzed = Math.max(
    candidateTopicTurns.length,
    perQuestion.reduce((acc, p) => acc + (p.primaryResponse ? 1 : 0) + (p.followUpResponse ? 1 : 0), 0)
  );

  let overallSummary = '';
  if (answeredCount === 0) {
    overallSummary = `${candidateFirstName} ended the ${input.targetRole} session for ${input.targetCompany} before answering any interview questions. Because only candidate spoken responses are evaluated (all ${aiTurnsExcluded} AI interviewer prompts are excluded), the earned score is 0/100 across all categories.`;
  } else if (substantiveCount === 0) {
    overallSummary = `Evaluated strictly from ${candidateFirstName}'s ${candidateTurnsAnalyzed} spoken responses (${totalCandidateWords} candidate words across ${answeredCount} of ${n} topics; ${aiTurnsExcluded} AI turns excluded). Responses were missing domain depth or did not address the questions directly, resulting in ${overallScore}/100 overall. Prioritize building concrete, concept-grounded answers before your next session.`;
  } else {
    overallSummary = `Evaluated strictly from ${candidateFirstName}'s ${candidateTurnsAnalyzed} spoken responses (${totalCandidateWords} candidate words across ${answeredCount} of ${n} topics; ${aiTurnsExcluded} AI interviewer turns excluded). Earned ${overallScore}/100 overall—strongest in ${highestCategory.label.toLowerCase()} (${highestCategory.score}/100), with highest-leverage improvement needed in ${lowestCategory.label.toLowerCase()} (${lowestCategory.score}/100).`;
  }

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
    keyWeakness:
      answeredCount === 0
        ? 'No Candidate Responses Recorded'
        : substantiveCount === 0
        ? 'Missing Substantive Domain Answers'
        : lowestCategory.label,
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

    const prompt = `You are a strict, fair Principal Hiring Committee Evaluator grading a verbal mock interview for "${input.targetRole}" at "${input.targetCompany}" (${level}).

STRICT CALIBRATION & CANDIDATE-ONLY RULES:
1. Grade STRICTLY and ONLY from the candidate's spoken responses below. DO NOT credit or score anything the AI interviewer said.
2. NEVER assign uniform/identical placeholder scores across categories (e.g., avoid giving 35/35/35/35 or 65/65/65/65). Score each rubric dimension independently based on real evidence in the candidate's words!
3. Strict 0-100 Calibration Scale:
   - 0: No candidate response recorded for that topic.
   - 1-15: "I don't know", "skip", "pass", evasive non-answer, or pure filler (<6 meaningful words with zero technical/behavioral substance).
   - 16-38: Off-topic, vague buzzwords, or superficial response lacking mechanics and examples.
   - 39-62: Partial understanding; covers basics but misses key mechanisms, tradeoffs, or structure.
   - 63-79: Solid competent answer; correct core concepts, clear reasoning, minor edge-case gaps.
   - 80-89: Strong ${level} answer; structured, handles failure modes/tradeoffs and follow-ups well.
   - 90-98: Exceptional bar-raising answer with quantified metrics, invariants, and deep tradeoffs.
4. Observed Candidate Metrics: ${deterministicBaseline.evaluationBasis.topicsAnswered}/${deterministicBaseline.evaluationBasis.totalTopics} topics answered, ${deterministicBaseline.evaluationBasis.candidateTurnsAnalyzed} spoken candidate turns, ${deterministicBaseline.evaluationBasis.totalCandidateWords} candidate words over ${deterministicBaseline.durationFormatted}.

Topic Prompts (Context Only) & Candidate-Only Spoken Responses:
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

Produce a detailed, discriminating JSON evaluation object:
1. "categoryScores": independent 0-98 scores for "technicalCorrectness" (35%), "tradeoffAnalysis" (25%), "communicationStructure" (20%), "problemDecomposition" (20%). Note: overallScore MUST equal the weighted average of these 4 categories (and unanswered topics count as 0!).
2. "overallScore" (integer 0-98) and "percentileRank" (integer 1-99).
3. "overallSummary": 3-4 concrete sentences citing what the candidate actually said (or failed to answer), highlighting strongest vs. weakest areas and exact next steps.
4. "keyWeakness": concise 3-7 word summary of the primary skill gap.
5. "recommendedDrills": 3-4 concrete, specific practice drills explaining what to improve and how.
6. "questionFeedbacks": array matching the ${perQuestion.length} questions with "questionId", "score" (0-98), "criterionScores" (2-3 items quoting candidate's words or noting exact omission), "strengths" (1-3 items), "missingConcepts" (1-3 items), "suggestedImprovements" (2-3 specific actionable recommendations explaining how to rewrite/improve the spoken answer), and "modelExemplarAnswer" (concise staff-level ideal spoken response).`;

    const rawJson = await callJsonTextModelWithFallback({
      ai,
      prompt,
      timeoutMs: 7500,
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
          const item = perQuestion[idx];
          const signals = item
            ? assessTopicCandidateSpeech(
                item.question,
                item.primaryResponse,
                item.followUpResponse,
                input.interviewType
              )
            : null;

          // Never let Gemini assign >0 to an unanswered topic or >15 to an explicit non-answer / "I don't know"
          if (signals?.tier === 'unanswered') {
            return baseFb;
          }

          const aiFb =
            parsed.questionFeedbacks.find((f: any) => f.questionId === baseFb.questionId) ||
            parsed.questionFeedbacks[idx];
          if (!aiFb) return baseFb;

          const topicCap =
            signals?.tier === 'evasive-non-answer'
              ? 15
              : signals?.tier === 'superficial-off-topic'
              ? 32
              : 98;

          return {
            ...baseFb,
            score: clampScore(Number(aiFb.score ?? baseFb.score), 0, topicCap),
            criterionScores:
              Array.isArray(aiFb.criterionScores) && aiFb.criterionScores.length > 0
                ? aiFb.criterionScores.map((c: any) => ({
                    criterion: String(c.criterion || 'Rubric Criterion'),
                    score: clampScore(Number(c.score ?? baseFb.score), 0, topicCap),
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

      // Compute weighted category cap based on deterministic non-answer / unanswered ratio
      const allNonSubstantive = deterministicBaseline.questionFeedbacks.every((fb) => fb.score <= 20);
      const catCap = allNonSubstantive ? 25 : 98;

      const tech = clampScore(
        Number(parsed.categoryScores?.technicalCorrectness ?? deterministicBaseline.categoryScores.technicalCorrectness),
        0,
        catCap
      );
      const comm = clampScore(
        Number(parsed.categoryScores?.communicationStructure ?? deterministicBaseline.categoryScores.communicationStructure),
        0,
        catCap
      );
      const decomp = clampScore(
        Number(parsed.categoryScores?.problemDecomposition ?? deterministicBaseline.categoryScores.problemDecomposition),
        0,
        catCap
      );
      const tradeoff = clampScore(
        Number(parsed.categoryScores?.tradeoffAnalysis ?? deterministicBaseline.categoryScores.tradeoffAnalysis),
        0,
        catCap
      );
      const weightedOverall = clampScore(
        tech * 0.35 + tradeoff * 0.25 + comm * 0.2 + decomp * 0.2,
        0,
        catCap
      );

      return {
        ...deterministicBaseline,
        overallScore: weightedOverall,
        percentileRank:
          weightedOverall === 0
            ? 1
            : clampScore(Number(parsed.percentileRank ?? Math.round(weightedOverall * 0.96)), 1, 99),
        categoryScores: {
          technicalCorrectness: tech,
          communicationStructure: comm,
          problemDecomposition: decomp,
          tradeoffAnalysis: tradeoff,
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
