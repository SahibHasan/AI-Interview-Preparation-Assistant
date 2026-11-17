import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { Communicate } from '@travisvn/edge-tts';
import { KokoroTTS } from 'kokoro-js';
import { buildRoleInterviewSectionsAndRules } from './resumeParser';
import type { AssessmentRule, InterviewSectionPlan } from '../src/types';

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
  sectionName?: string;
  category: string;
  focusSource: 'resume' | 'jd' | 'role-calibration';
  rationale: string;
  assessmentCriteria?: string[];
}

export interface PlannedInterviewQuestion {
  id: string;
  topicId: string;
  order: number;
  sectionName?: string;
  category: string;
  difficulty: 'L4' | 'L5' | 'L6' | 'L7';
  questionText: string;
  contextOrConstraint?: string;
  assessmentRule?: string;
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
  interviewSections?: InterviewSectionPlan[];
  assessmentRules?: AssessmentRule[];
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
    rawText?: string;
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

function buildQuestionForSection(params: {
  section: InterviewSectionPlan;
  input: PlanInput;
  recentWork: string;
  resumeHighlight: string;
  matchedSkill: string;
  criticalGap: string;
  jdHighlights: string[];
  level: 'L4' | 'L5' | 'L6' | 'L7';
}): {
  title: string;
  category: string;
  focusSource: 'resume' | 'jd' | 'role-calibration';
  rationale: string;
  questionText: string;
  contextOrConstraint: string;
  assessmentRule: string;
  rubric: { criterion: string; weight: number; description: string }[];
} {
  const sLower = params.section.sectionName.toLowerCase();
  const { input, recentWork, resumeHighlight, matchedSkill, criticalGap, jdHighlights, level } = params;

  if (sLower.includes('resume')) {
    const hasResumeDetail = Boolean(
      (input.resumeSummary?.experiences && input.resumeSummary.experiences.length > 0) ||
        (input.resumeSummary?.rawText && input.resumeSummary.rawText.trim().length > 25)
    );
    const cleanHighlight =
      resumeHighlight.length <= 165
        ? resumeHighlight.replace(/[.,;:\s]+$/, '')
        : resumeHighlight.slice(0, 165).replace(/\s+\S*$/, '').replace(/[.,;:\s]+$/, '');
    return {
      title: params.section.sectionName,
      category: params.section.category,
      focusSource: hasResumeDetail ? 'resume' : 'role-calibration',
      rationale: params.section.rationale,
      questionText: hasResumeDetail
        ? `Looking at your background in ${recentWork}, walk me through the hardest technical problem or bottleneck you owned—specifically around "${cleanHighlight}"—and the measurable impact you delivered.`
        : `Walk me through the most challenging ${input.targetRole} project or production bottleneck you've owned recently—specifically how you structured the architecture, navigated tradeoffs, and measured impact.`,
      contextOrConstraint: `Focus on your individual architecture decisions, alternatives you rejected, and concrete outcomes for ${input.targetCompany}.`,
      assessmentRule: params.section.assessmentCriteria.join(' • '),
      rubric: [
        { criterion: 'Personal Technical Ownership', weight: 40, description: 'Clearly isolates individual design choices and system boundaries' },
        { criterion: 'Measurable Impact & Tradeoffs', weight: 35, description: 'Cites metrics and explains why alternative approaches were rejected' },
        { criterion: 'Production Failure Handling', weight: 25, description: 'Discusses monitoring, edge cases, and rollback safety' },
      ],
    };
  }

  if (sLower.includes('dsa') || sLower.includes('algorithm')) {
    return {
      title: params.section.sectionName,
      category: params.section.category,
      focusSource: params.section.focusSource,
      rationale: params.section.rationale,
      questionText: `Let's switch to DSA and algorithmic problem solving. Suppose ${input.targetCompany} receives a high-velocity stream of API events and you need to support O(1) lookup, top-K frequent items over a sliding 5-minute window, and bounded memory. How would you choose and combine the data structures, and what are the time and space complexities?`,
      contextOrConstraint: `Compare HashMap + Doubly Linked List / Min-Heap / Bucket approaches and walk through boundary cases verbally.`,
      assessmentRule: params.section.assessmentCriteria.join(' • '),
      rubric: [
        { criterion: 'Optimal Data Structure Selection', weight: 40, description: 'Picks right combination of structures (HashMap, Heap, Queue) cleanly' },
        { criterion: 'Time & Space Big-O Tradeoffs', weight: 35, description: 'Derives accurate worst-case and amortized time/space bounds' },
        { criterion: 'Boundary & Memory Edge Cases', weight: 25, description: 'Handles evictions, ties, empty streams, and concurrency cleanly' },
      ],
    };
  }

  if (sLower.includes('oop') || sLower.includes('software design')) {
    return {
      title: params.section.sectionName,
      category: params.section.category,
      focusSource: params.section.focusSource,
      rationale: params.section.rationale,
      questionText: `Moving to Object-Oriented Design and clean architecture: if you were modeling a pluggable notification and payment retry engine at ${input.targetCompany} where new channels or retry policies get added every quarter, how would you apply OOP principles, SOLID, and design patterns to keep classes decoupled and testable?`,
      contextOrConstraint: `Explain interfaces vs abstract classes, composition vs inheritance, and Strategy or Observer pattern tradeoffs.`,
      assessmentRule: params.section.assessmentCriteria.join(' • '),
      rubric: [
        { criterion: 'SOLID Principles & Abstractions', weight: 40, description: 'Applies Dependency Inversion, Open/Closed, and clean interfaces' },
        { criterion: 'Composition vs Inheritance Tradeoffs', weight: 35, description: 'Avoids brittle deep inheritance hierarchies in favor of composable contracts' },
        { criterion: 'Extensibility & Testability', weight: 25, description: 'Demonstrates dependency injection and isolated unit test boundaries' },
      ],
    };
  }

  if (sLower.includes('sql') || sLower.includes('dbms') || sLower.includes('data modeling')) {
    return {
      title: params.section.sectionName,
      category: params.section.category,
      focusSource: params.section.focusSource,
      rationale: params.section.rationale,
      questionText: `Now let's assess SQL and Database Engineering. Imagine an orders and ledger table with 100 million rows where queries filtering by user_id and created_at status are slowing down, and concurrent updates risk double-spending. How do you design the schema, composite B-Tree indexes, and ACID transaction isolation to fix both latency and correctness?`,
      contextOrConstraint: `Discuss leftmost index prefix rules, N+1 query elimination, optimistic vs pessimistic locking, and deadlock prevention.`,
      assessmentRule: params.section.assessmentCriteria.join(' • '),
      rubric: [
        { criterion: 'Indexing & Query Execution Plan', weight: 40, description: 'Chooses selective composite index ordering and diagnoses table scans' },
        { criterion: 'ACID Transactions & Concurrency Locks', weight: 35, description: 'Handles isolation levels, SELECT FOR UPDATE / optimistic versioning' },
        { criterion: 'Normalization & Scale Tradeoffs', weight: 25, description: 'Balances 3NF integrity against read replicas or controlled denormalization' },
      ],
    };
  }

  if (sLower.includes('react') || sLower.includes('web vitals') || sLower.includes('frontend')) {
    return {
      title: params.section.sectionName,
      category: params.section.category,
      focusSource: params.section.focusSource,
      rationale: params.section.rationale,
      questionText: `For this ${input.targetRole} role at ${input.targetCompany}, how would you architect client-side state synchronization and optimistic UI caching so real-time dashboards stay sub-120ms P99 and never trigger duplicate mutations during spotty mobile connectivity?`,
      contextOrConstraint: `Address Core Web Vitals (INP/LCP/CLS), idempotency keys, and render batching.`,
      assessmentRule: params.section.assessmentCriteria.join(' • '),
      rubric: [
        { criterion: 'Idempotency & Cache Reconciliation', weight: 40, description: 'Prevents duplicate mutations and handles stale cache invalidation' },
        { criterion: 'Rendering & Web Vitals Discipline', weight: 35, description: 'Protects main thread with batching, memoization, and layout stability' },
        { criterion: 'Degraded Network Recovery', weight: 25, description: 'Uses exponential backoff and clean offline queues' },
      ],
    };
  }

  if (sLower.includes('kubernetes') || sLower.includes('terraform') || sLower.includes('ci/cd') || sLower.includes('sre') || sLower.includes('linux')) {
    return {
      title: params.section.sectionName,
      category: params.section.category,
      focusSource: params.section.focusSource,
      rationale: params.section.rationale,
      questionText: `In a ${input.targetRole} role at ${input.targetCompany}, imagine a zero-downtime Kubernetes deployment causes P99 latency to spike 4x and pods begin OOMKilling under burst load. How do you diagnose root cause, isolate blast radius, and design CI/CD & Terraform safeguards to prevent recurrence?`,
      contextOrConstraint: `Cover readiness probes, HPA/pod resource limits, canary rollback triggers, and Terraform state safety.`,
      assessmentRule: params.section.assessmentCriteria.join(' • '),
      rubric: [
        { criterion: 'Production Triage & Telemetry', weight: 40, description: 'Pinpoints metrics, logs, and resource constraints systematically' },
        { criterion: 'Deployment & Rollback Safety', weight: 35, description: 'Designs canary gates, readiness checks, and instant rollbacks' },
        { criterion: 'Infrastructure Automation', weight: 25, description: 'Explains IaC drift protection and least-privilege controls' },
      ],
    };
  }

  if (sLower.includes('mobile') || sLower.includes('offline sync')) {
    return {
      title: params.section.sectionName,
      category: params.section.category,
      focusSource: params.section.focusSource,
      rationale: params.section.rationale,
      questionText: `For a ${input.targetRole} loop at ${input.targetCompany}, how would you architect offline-first local storage (SQLite) with background sync and smooth 60fps UI rendering when a user submits multiple actions on a flaky cellular connection?`,
      contextOrConstraint: `Address main-thread frame budgets, idempotency tokens, conflict resolution, and lifecycle cleanup.`,
      assessmentRule: params.section.assessmentCriteria.join(' • '),
      rubric: [
        { criterion: 'Offline Queue & Sync Integrity', weight: 40, description: 'Handles retries, ordering, and duplicate-safe reconciliation' },
        { criterion: 'UI Thread & Memory Discipline', weight: 35, description: 'Protects main thread and prevents retain-cycle leaks' },
        { criterion: 'App Store Rollout Safety', weight: 25, description: 'Uses schema migrations and remote kill switches cleanly' },
      ],
    };
  }

  if (sLower.includes('test pyramid') || sLower.includes('automation')) {
    return {
      title: params.section.sectionName,
      category: params.section.category,
      focusSource: params.section.focusSource,
      rationale: params.section.rationale,
      questionText: `As a ${input.targetRole} at ${input.targetCompany}, suppose your E2E regression suite takes 55 minutes and fails 12% of the time due to flaky async UI states. How do you restructure the test pyramid, design deterministic fixtures, and integrate fast quality gates into CI/CD?`,
      contextOrConstraint: `Compare unit/contract/API vs E2E coverage, parallel sharding, and SQL test data isolation.`,
      assessmentRule: params.section.assessmentCriteria.join(' • '),
      rubric: [
        { criterion: 'Deterministic Test Architecture', weight: 40, description: 'Eliminates static sleeps, shared mutable state, and flaky locators' },
        { criterion: 'Test Pyramid & Risk Coverage', weight: 35, description: 'Pushes checks to fast API/contract layers while keeping critical E2E' },
        { criterion: 'CI Parallelism & Triage', weight: 25, description: 'Cuts feedback loop time with sharding and artifact telemetry' },
      ],
    };
  }

  if (sLower.includes('owasp') || sLower.includes('appsec') || sLower.includes('threat modeling') || sLower.includes('kms')) {
    return {
      title: params.section.sectionName,
      category: params.section.category,
      focusSource: params.section.focusSource,
      rationale: params.section.rationale,
      questionText: `From a ${input.targetRole} perspective at ${input.targetCompany}, if you are reviewing a new multi-tenant OAuth2 + API service before launch, what critical threat vectors (token replay, SSRF, broken tenant isolation, SQLi) do you audit first and what defense-in-depth controls do you enforce?`,
      contextOrConstraint: `Discuss least-privilege IAM, short-lived tokens, tenant boundary enforcement, and containment playbooks.`,
      assessmentRule: params.section.assessmentCriteria.join(' • '),
      rubric: [
        { criterion: 'Threat Modeling & OWASP Depth', weight: 40, description: 'Identifies realistic exploit chains and tenant-isolation invariants' },
        { criterion: 'Defense-in-Depth Architecture', weight: 35, description: 'Applies secure defaults across auth, database queries, and secrets' },
        { criterion: 'Detection & Containment Speed', weight: 25, description: 'Designs tamper-evident audit logs and fast token revocation' },
      ],
    };
  }

  if (sLower.includes('people leadership') || sLower.includes('engineering management') || sLower.includes('tech debt governance')) {
    return {
      title: params.section.sectionName,
      category: params.section.category,
      focusSource: 'role-calibration',
      rationale: params.section.rationale,
      questionText: `As an ${input.targetRole} at ${input.targetCompany}, tell me how you would balance an urgent Q3 product commitment against rising platform tech debt and two senior engineers disagreeing on architectural direction.`,
      contextOrConstraint: `Include concrete coaching signals, roadmap negotiation with Product, and measurable engineering health KPIs.`,
      assessmentRule: params.section.assessmentCriteria.join(' • '),
      rubric: [
        { criterion: 'Strategic Prioritization', weight: 40, description: 'Negotiates scope and tech-debt paydown with business clarity' },
        { criterion: 'People Coaching & Resolution', weight: 35, description: 'Aligns engineers constructively while empowering ownership' },
        { criterion: 'Operational & Delivery Metrics', weight: 25, description: 'Tracks DORA/reliability/velocity outcomes objectively' },
      ],
    };
  }

  if (sLower.includes('career trajectory') || sLower.includes('values') || sLower.includes('workstyle') || sLower.includes('role expectations') || sLower.includes('failure recovery') || sLower.includes('mentorship') || sLower.includes('conflict') || sLower.includes('consensus') || sLower.includes('leadership') || sLower.includes('culture') || sLower.includes('ambiguity')) {
    const behavioralPrompt = sLower.includes('career trajectory')
      ? `Walk me through your career journey so far—why are you targeting this ${input.targetRole} role at ${input.targetCompany} right now, and what kind of team environment brings out your best work?`
      : sLower.includes('failure recovery')
      ? `Tell me about a high-stakes production outage or critical delivery miss you were directly involved in. What steps did you take first, how did you communicate with stakeholders, and what systemic guardrails did you put in place afterward?`
      : sLower.includes('ambiguity')
      ? `Describe a project where requirements were unclear or shifted midway before a deadline. How did you scope what mattered most, align stakeholders, and deliver a reliable result?`
      : sLower.includes('mentorship') || sLower.includes('growth mindset')
      ? `Share a concrete example of how you helped elevate a teammate or raised the engineering bar on your team, as well as an area you are actively strengthening right now.`
      : `Tell me about a time you had a significant technical or product disagreement with a peer or lead right before a major launch. How did you structure your case, drive consensus, and measure the outcome?`;

    return {
      title: params.section.sectionName,
      category: params.section.category,
      focusSource: 'role-calibration',
      rationale: params.section.rationale,
      questionText: behavioralPrompt,
      contextOrConstraint: `Use Situation, Task, Action, Result (STAR) framing with specific personal actions and measurable outcomes.`,
      assessmentRule: params.section.assessmentCriteria.join(' • '),
      rubric: [
        { criterion: 'Structured STAR Delivery', weight: 35, description: 'Clear context, personal action, and measurable business outcome' },
        { criterion: 'Ownership & Evidence-Driven Influence', weight: 40, description: 'Relies on objective data, accountability, and stakeholder empathy' },
        { criterion: 'Retrospective Learning', weight: 25, description: 'Reflects candidly on tradeoffs and long-term improvements' },
      ],
    };
  }

  if (sLower.includes('high-level distributed') || sLower.includes('system design') || sLower.includes('data modeling, storage')) {
    return {
      title: params.section.sectionName,
      category: params.section.category,
      focusSource: 'jd',
      rationale: params.section.rationale,
      questionText: `Let's design a core distributed system for ${input.targetCompany} (${input.targetRole} track). Imagine architecting a multi-tenant notification & ledger webhook platform handling 50,000 events/sec with strict at-least-once delivery, per-tenant rate limiting, and zero duplicate side effects. How would you design the APIs, storage partitioning, queueing, and failure recovery?`,
      contextOrConstraint: `Cover capacity estimation, database schema & sharding, Redis/Kafka backpressure, and idempotency keys.`,
      assessmentRule: params.section.assessmentCriteria.join(' • '),
      rubric: [
        { criterion: 'Component Topology & API Contracts', weight: 35, description: 'Clear separation of ingestion, queueing, workers, and storage' },
        { criterion: 'Partitioning, Caching & Consistency', weight: 35, description: 'Handles hot partitions, idempotent writes, and replication lag' },
        { criterion: 'Fault Tolerance & Backpressure', weight: 30, description: 'Isolates slow tenants with DLQs, circuit breakers, and SLIs' },
      ],
    };
  }

  if (sLower.includes('product')) {
    return {
      title: params.section.sectionName,
      category: params.section.category,
      focusSource: 'jd',
      rationale: params.section.rationale,
      questionText: `For ${input.targetCompany}, suppose activation dropped by 8% after a major onboarding redesign. Walk me through how you decompose the funnel, slice cohorts using SQL/analytics, and decide whether to roll back or iterate.`,
      contextOrConstraint: `Identify primary North Star metrics, guardrail metrics, and A/B test pitfalls.`,
      assessmentRule: params.section.assessmentCriteria.join(' • '),
      rubric: [
        { criterion: 'Metric & Funnel Decomposition', weight: 40, description: 'Isolates instrumentation bugs vs true behavioral cohort drops' },
        { criterion: 'Experimentation & Guardrails', weight: 35, description: 'Defines clear success and counter-metrics before acting' },
        { criterion: 'Cross-Team Execution', weight: 25, description: 'Coordinates engineering and design tradeoffs decisively' },
      ],
    };
  }

  return {
    title: params.section.sectionName,
    category: params.section.category,
    focusSource: 'jd',
    rationale: params.section.rationale || `Targets ${criticalGap} & ${jdHighlights[0] || matchedSkill} at ${level} bar.`,
    questionText: `Suppose ${input.targetCompany} experiences a sudden 10x traffic surge combined with intermittent downstream timeouts on a critical ${input.targetRole} workflow (${criticalGap}). How do you architect caching, backpressure, observability, and safe rollback mechanisms to protect P99 latency and data integrity?`,
    contextOrConstraint: `Target ${level} bar: discuss circuit breakers, idempotent retries, distributed tracing, and graceful degradation.`,
    assessmentRule: params.section.assessmentCriteria.join(' • '),
    rubric: [
      { criterion: 'Fault Isolation & Backpressure', weight: 40, description: 'Applies circuit breakers, bounded queues, and jittered backoff cleanly' },
      { criterion: 'Consistency & Idempotency', weight: 35, description: 'Prevents corrupt state or duplicate writes under partial failure' },
      { criterion: 'Observability & Rollback Speed', weight: 25, description: 'Defines concrete SLIs, canary alerts, and kill-switch triggers' },
    ],
  };
}

export function buildDeterministicInterviewPlan(input: PlanInput): InterviewPlanPayload {
  const firstName = (input.candidateName || 'there').trim().split(/\s+/)[0] || 'there';
  const personaCfg = resolveVoiceConfig(input.aiPersona);
  const level = mapDifficultyLevel(input.difficulty);
  const count = Math.max(3, Math.min(5, input.questionCount || 4));

  const exp = input.resumeSummary?.experiences?.[0];
  const hasUploadedResume = Boolean(
    exp ||
      (input.resumeSummary?.rawText && input.resumeSummary.rawText.trim().length > 25) ||
      (input.resumeSummary?.skills && input.resumeSummary.skills.length > 0)
  );
  const recentWork = exp
    ? `${exp.role} work at ${exp.company}`
    : hasUploadedResume
    ? `${input.resumeSummary?.headline || input.targetRole} background`
    : `${input.targetRole} track`;
  const resumeHighlight =
    exp?.bulletPoints?.[0] ||
    `scalable ${input.targetRole} systems using ${(input.resumeSummary?.skills && input.resumeSummary.skills.length > 0 ? input.resumeSummary.skills : ['TypeScript', 'SQL', 'OOP']).slice(0, 3).join(', ')}`;
  const criticalGap =
    input.resumeSummary?.missingSkills?.[0] || 'edge-case fault tolerance and scaling optimization';
  const matchedSkill =
    input.resumeSummary?.matchedSkills?.[0] ||
    input.resumeSummary?.skills?.[0] ||
    'Core Software Engineering';
  const jdHighlights = extractJdHighlights(input.jobDescriptionText);

  const { sections, assessmentRules } = buildRoleInterviewSectionsAndRules({
    targetRole: input.targetRole,
    targetCompany: input.targetCompany,
    interviewType: input.interviewType,
    difficulty: input.difficulty,
    questionCount: count,
    resumeSkills: input.resumeSummary?.skills,
    matchedSkills: input.resumeSummary?.matchedSkills,
    missingSkills: input.resumeSummary?.missingSkills,
    jobDescriptionText: input.jobDescriptionText,
    experiences: input.resumeSummary?.experiences,
  });

  const selectedTemplates = sections.map((sec) =>
    buildQuestionForSection({
      section: sec,
      input,
      recentWork,
      resumeHighlight,
      matchedSkill,
      criticalGap,
      jdHighlights,
      level,
    })
  );

  const topicOrder: PlannedTopicItem[] = selectedTemplates.map((item, idx) => ({
    id: `topic_${idx + 1}`,
    order: idx + 1,
    title: item.title,
    sectionName: sections[idx]?.sectionName || item.title,
    category: item.category,
    focusSource: item.focusSource,
    rationale: item.rationale,
    assessmentCriteria: sections[idx]?.assessmentCriteria || [],
  }));

  const questions: PlannedInterviewQuestion[] = selectedTemplates.map((item, idx) => ({
    id: `q_${idx + 1}`,
    topicId: `topic_${idx + 1}`,
    order: idx + 1,
    sectionName: sections[idx]?.sectionName || item.title,
    category: item.category,
    difficulty: level,
    questionText: item.questionText,
    contextOrConstraint: item.contextOrConstraint,
    assessmentRule: item.assessmentRule,
    evaluationRubric: item.rubric,
  }));

  const interviewTypeLabel =
    input.interviewType === 'behavioral'
      ? 'Behavioral & Leadership'
      : input.interviewType === 'system-design'
      ? 'Distributed System Design'
      : input.interviewType === 'hr-cultural'
      ? 'HR & Cultural Values'
      : 'Technical & Core CS';
  const rubricSummaryPhrase =
    input.interviewType === 'behavioral' || input.interviewType === 'hr-cultural'
      ? 'STAR clarity, ownership, measurable outcomes, and collaboration'
      : 'technical depth, tradeoffs, problem decomposition, and clarity';

  const contextReviewSentence = hasUploadedResume
    ? `I've reviewed your uploaded resume—including your ${recentWork}—alongside the ${input.targetCompany} job description.`
    : `I've calibrated this session for your ${input.targetRole} track alongside the ${input.targetCompany} job bar.`;

  const topicPreview = topicOrder.map((t) => `${t.order}. ${t.title}`).join(', ');
  const greetingOverview = `Hi ${firstName}, welcome to your live ${interviewTypeLabel} interview for ${input.targetRole} at ${input.targetCompany}. I'm ${input.aiPersona}, ${personaCfg.roleTitle}. ${contextReviewSentence} To evaluate you fairly across every required pillar for this role, I divided our ${level} loop into ${topicOrder.length} structured sections: ${topicPreview}. I'll ask conversational follow-ups based on your spoken answers and grade strictly on ${rubricSummaryPhrase}. Whenever you're ready to begin section one, just say you're ready.`;

  return {
    greetingOverview,
    topicOrder,
    questions,
    interviewSections: sections,
    assessmentRules,
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
    (input.resumeSummary?.skills || []).slice(0, 8).join(','),
    (input.resumeSummary?.rawText || '').slice(0, 120),
    (input.jobDescriptionText || '').slice(0, 160),
  ]);
}

export async function generateInterviewPlan(input: PlanInput): Promise<InterviewPlanPayload> {
  const { sections: plannedSections, assessmentRules } = buildRoleInterviewSectionsAndRules({
    targetRole: input.targetRole,
    targetCompany: input.targetCompany,
    interviewType: input.interviewType,
    difficulty: input.difficulty,
    questionCount: input.questionCount || 4,
    resumeSkills: input.resumeSummary?.skills,
    matchedSkills: input.resumeSummary?.matchedSkills,
    missingSkills: input.resumeSummary?.missingSkills,
    jobDescriptionText: input.jobDescriptionText,
    experiences: input.resumeSummary?.experiences,
  });

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
      const sectionOutline = plannedSections
        .map((s) => `${s.order}. ${s.sectionName} (${s.weightPercentage}% weight): ${s.topicsCovered.join(', ')} | Assess: ${s.assessmentCriteria.join('; ')}`)
        .join('\n');

      const prompt = `You are ${input.aiPersona}, ${personaCfg.roleTitle}, conducting a real-time spoken mock interview for "${input.targetRole}" at "${input.targetCompany}" (calibration level: ${level}, round focus: ${input.interviewType}).

Review all candidate context below carefully:
- Candidate Name: ${input.candidateName || 'Candidate'} (address first name "${firstName}")
- Resume Headline: ${input.resumeSummary?.headline || 'Software Engineer'}
- Resume Skills: ${(input.resumeSummary?.skills || []).join(', ')}
- Matched Strengths: ${(input.resumeSummary?.matchedSkills || []).join(', ')}
- Skill Gaps to Probe: ${(input.resumeSummary?.missingSkills || []).join(', ')}
- Recent Resume Roles / Projects: ${JSON.stringify(input.resumeSummary?.experiences || [])}
${input.resumeSummary?.rawText ? `- Uploaded Resume Excerpt:\n${input.resumeSummary.rawText.slice(0, 1400)}` : ''}
- Target Job Description:
${(input.jobDescriptionText || '').slice(0, 2000)}

Required Role-Divided Interview Sections (${count} sections in sequence):
${sectionOutline}

Produce a structured JSON interview plan with exactly ${count} ordered topics matching the sections above and ${count} matching initial questions:
1. "greetingOverview": Natural spoken opening by ${input.aiPersona} welcoming ${firstName}, mentioning 1-2 specific details reviewed from their uploaded resume & the ${input.targetCompany} JD, clearly stating the ${count} planned interview sections in order, briefly noting how candidate answers will be assessed (technical depth, tradeoffs, problem decomposition, clarity), and ending by asking if the candidate is ready to begin. Keep it concise enough to be spoken naturally in ~25-35 seconds (under 120 words), no markdown formatting or bullet symbols.
2. "topicOrder": Array of ${count} topics matching the ${count} divided sections in exact sequence.
3. "questions": Array of ${count} interview questions aligned 1-to-1 with "topicOrder", grounded in the uploaded resume for the resume section and tailored to DSA/OOPs/SQL/Architecture/STAR as specified by each section.`;

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
          title: String(t.title || plannedSections[idx]?.sectionName || `Topic ${idx + 1}`),
          sectionName: plannedSections[idx]?.sectionName || String(t.title || `Section ${idx + 1}`),
          category: String(t.category || plannedSections[idx]?.category || 'Technical'),
          focusSource:
            t.focusSource === 'resume' || t.focusSource === 'jd' || t.focusSource === 'role-calibration'
              ? t.focusSource
              : plannedSections[idx]?.focusSource || (idx === 0 ? 'resume' : 'jd'),
          rationale: String(t.rationale || plannedSections[idx]?.rationale || 'Calibrated to job description and resume.'),
          assessmentCriteria: plannedSections[idx]?.assessmentCriteria || [],
        }));

        const normalizedQuestions: PlannedInterviewQuestion[] = parsed.questions
          .slice(0, normalizedTopics.length)
          .map((q: any, idx: number) => ({
            id: q.id || `q_${idx + 1}`,
            topicId: normalizedTopics[idx]?.id || `topic_${idx + 1}`,
            order: idx + 1,
            sectionName: normalizedTopics[idx]?.sectionName || normalizedTopics[idx]?.title,
            category: String(q.category || normalizedTopics[idx]?.category || 'Technical'),
            difficulty: (['L4', 'L5', 'L6', 'L7'].includes(q.difficulty) ? q.difficulty : level) as
              | 'L4'
              | 'L5'
              | 'L6'
              | 'L7',
            questionText: String(q.questionText || ''),
            contextOrConstraint: q.contextOrConstraint ? String(q.contextOrConstraint) : undefined,
            assessmentRule: (plannedSections[idx]?.assessmentCriteria || []).join(' • ') || undefined,
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
          interviewSections: plannedSections,
          assessmentRules,
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
  interviewType?: string;
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
  const type = (input.interviewType || 'technical').toLowerCase();
  const isPeopleRound = type === 'behavioral' || type === 'hr-cultural';

  // Extract a concrete keyword from what the candidate actually said to personalize the real-time follow-up
  const notableTerms = isPeopleRound
    ? [
        'team',
        'stakeholder',
        'deadline',
        'conflict',
        'launch',
        'outage',
        'incident',
        'mentor',
        'feedback',
        'product',
        'priority',
        'tradeoff',
        'alignment',
        'ownership',
        'customer',
      ]
    : [
        'cache',
        'redis',
        'idempotency',
        'latency',
        'retry',
        'queue',
        'websocket',
        'database',
        'sql',
        'index',
        'b-tree',
        'join',
        'acid',
        'deadlock',
        'hashmap',
        'heap',
        'tree',
        'graph',
        'complexity',
        'solid',
        'interface',
        'polymorphism',
        'encapsulation',
        'inheritance',
        'react',
        'state',
        'timeout',
        'consensus',
        'failover',
        'metrics',
        'monitoring',
        'kubernetes',
        'terraform',
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

    if (isPeopleRound) {
      if (words.length < 18) {
        triggerReason = 'Response was brief — probing concrete STAR actions and measurable outcome';
        followUpQ = matchedTerm
          ? `Thanks for sharing that. Looking specifically at the ${matchedTerm} part you mentioned, what action did you personally own, and how did you measure the final result?`
          : `Thanks for sharing that overview. To help me evaluate ${input.currentTopic.title}, what specific step did you personally take, and what changed as a measurable result?`;
      } else if (matchedTerm) {
        triggerReason = `Real-time STAR follow-up on candidate's mention of "${matchedTerm}"`;
        followUpQ = `I appreciate the context on ${matchedTerm}. Looking back at that situation at ${input.targetCompany} bar, what was the hardest tradeoff you navigated with stakeholders, and what would you approach differently next time?`;
      } else {
        triggerReason = `Adaptive behavioral follow-up calibrated to ${input.currentTopic.category}`;
        followUpQ = `That gives good context. Before we move on, what concrete signal or metric showed your approach worked, and what did you take away from the experience?`;
      }
    } else if (words.length < 18) {
      triggerReason = 'Response was concise — probing concrete implementation details and failure edge cases';
      followUpQ = matchedTerm
        ? `Thanks for sharing that overview. You touched on ${matchedTerm}—could you walk me through the exact failure mode you'd handle if ${matchedTerm} degrades under heavy concurrent load?`
        : `Got it. Let's go one layer deeper on ${input.currentTopic.title}: what specific bottleneck or edge case would fail first in production, and how would you mitigate it?`;
    } else if (matchedTerm) {
      triggerReason = `Real-time deep dive on candidate's mention of "${matchedTerm}"`;
      followUpQ = `That's a solid point about ${matchedTerm}. If a sudden failure or contention spike hits right in the middle of that ${matchedTerm} path at ${input.targetCompany} scale, how do you protect correctness and latency?`;
    } else {
      triggerReason = `Adaptive bar-raiser probe calibrated to ${input.currentTopic.category}`;
      followUpQ = `Appreciate how you structured that answer. One quick follow-up before we move on: if scale grew 10x unexpectedly on that critical path, what bottleneck or tradeoff would you revisit first and why?`;
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
    const transition = `Thanks for walking through that clearly—that gives me a strong signal on ${input.currentTopic.category}. Let's move to topic ${input.nextTopic.order} in our plan, ${input.nextTopic.title}. ${input.nextQuestion.questionText}`;
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

    const prompt = `You are ${input.aiPersona}, interviewing ${input.candidateName || 'the candidate'} for "${input.targetRole}" at "${input.targetCompany}" (round type: ${input.interviewType || 'technical'}).
This is a purely VERBAL interview. Respond concisely in natural spoken human dialogue (2 to 4 sentences max, no markdown, no bullets).

Current Topic (#${input.currentTopic.order}): ${input.currentTopic.title} (${input.currentTopic.category})
Question asked: ${input.currentQuestion.questionText}
Candidate's latest spoken answer: "${input.candidateSpokenText}"
Follow-ups already asked on this topic: ${input.followUpCountForTopic}
Recent conversation:
${(input.recentTranscript || []).slice(-4).map((m) => `${m.speaker}: ${m.text}`).join('\n')}

Rules:
- Stay strictly aligned to the "${input.interviewType || 'technical'}" round and "${input.targetRole}" role.
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
  'sql', 'b-tree', 'acid', 'isolation', 'deadlock', 'normalization', 'denormalization', 'join',
  'hashmap', 'heap', 'binary', 'graph', 'traversal', 'recursion', 'dynamic', 'amortized', 'big-o',
  'polymorphism', 'encapsulation', 'inheritance', 'abstraction', 'solid', 'composition', 'interface',
  'dependency', 'singleton', 'strategy', 'observer', 'factory',
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
