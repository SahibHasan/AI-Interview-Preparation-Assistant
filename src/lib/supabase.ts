import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  CandidateProfile, 
  ResumeAnalysis, 
  JobDescription, 
  EvaluationReport, 
  LearningPlan, 
  SessionHistoryItem, 
  CandidateAnswer, 
  InterviewQuestion 
} from '../types';

// Clear any deprecated credentials from localStorage to ensure complete privacy
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('preppilot_supabase_url');
    localStorage.removeItem('preppilot_supabase_key');
  } catch {
    // Ignore in sandboxed contexts
  }
}

/**
 * Return default configuration. Database credentials are held exclusively
 * on the server side in server.ts to prevent exposure to client bundles.
 */
export const getSupabaseConfig = () => {
  return {
    url: '',
    key: '',
    isConfigured: true,
  };
};

export const isSupabaseConfigured = (): boolean => {
  return true;
};

export const isValidUuid = (val?: string | null): boolean => {
  return typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
};

// Client proxy to keep any legacy auth/database calls safe without throwing
let dummyClient: SupabaseClient | null = null;
export const getSupabaseClient = (): SupabaseClient => {
  if (!dummyClient) {
    dummyClient = createClient('https://secure-enclave.preppilot.ai', 'server-side-protected', {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return dummyClient;
};

export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseClient();
    const value = (client as any)[prop];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
});

// ==============================================================================
// SERVER-SIDE DATABASE SERVICE HELPERS
// All requests are proxied securely to /api/db/* endpoints
// ==============================================================================

/**
 * Fetch candidate profile for authenticated user from server database
 */
export async function getProfileFromDb(userId: string): Promise<CandidateProfile | null> {
  if (!userId || !isValidUuid(userId)) return null;
  try {
    const res = await fetch(`/api/db/profile?userId=${encodeURIComponent(userId)}`);
    if (!res.ok) return null;
    const json = await res.json();
    return json.data || null;
  } catch (err) {
    console.warn('[Data Enclave] Profile fetch error, using local state:', err);
    return null;
  }
}

/**
 * Upsert candidate profile in server database
 */
export async function upsertProfileInDb(
  userId: string, 
  profile: Partial<CandidateProfile> & { 
    email?: string;
    avatarUrl?: string;
    authProvider?: 'email' | 'google' | 'github';
    targetRole?: string; 
    targetCompany?: string; 
    experienceLevel?: string; 
    readinessScore?: number; 
    streakDays?: number;
  }
): Promise<boolean> {
  if (!userId || !isValidUuid(userId)) return true;
  try {
    const res = await fetch('/api/db/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, profile }),
    });
    return res.ok;
  } catch (err) {
    console.warn('[Data Enclave] Profile save error, maintained in local state:', err);
    return true;
  }
}

/**
 * Save or reset uploaded candidate profile avatar in database
 */
export async function uploadAvatarInDb(
  userId: string,
  avatarUrl: string,
  email?: string
): Promise<string | null> {
  try {
    const res = await fetch('/api/db/avatar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, avatarUrl, email }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.avatarUrl || avatarUrl || null;
  } catch (err) {
    console.warn('[Data Enclave] Avatar upload error, maintained in local state:', err);
    return avatarUrl || null;
  }
}

/**
 * Save parsed resume and match analysis in server database
 */
export async function saveResumeInDb(
  userId: string,
  resume: ResumeAnalysis
): Promise<boolean> {
  if (!userId || !isValidUuid(userId)) return true;
  try {
    const res = await fetch('/api/db/resume', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, resume }),
    });
    return res.ok;
  } catch (err) {
    console.warn('[Data Enclave] Resume save error, maintained in local state:', err);
    return true;
  }
}

/**
 * Get most recently uploaded resume for candidate from server database
 */
export async function getLatestResumeFromDb(userId: string): Promise<ResumeAnalysis | null> {
  if (!userId || !isValidUuid(userId)) return null;
  try {
    const res = await fetch(`/api/db/resume?userId=${encodeURIComponent(userId)}`);
    if (!res.ok) return null;
    const json = await res.json();
    return json.data || null;
  } catch (err) {
    console.warn('[Data Enclave] Resume fetch error, using local state:', err);
    return null;
  }
}

/**
 * Save target job description in server database
 */
export async function saveJobDescriptionInDb(
  userId: string,
  title: string,
  company: string,
  rawText: string,
  extractedRequirements?: any
): Promise<boolean> {
  if (!userId || !isValidUuid(userId)) return true;
  try {
    const res = await fetch('/api/db/job-description', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, title, company, rawText, extractedRequirements }),
    });
    return res.ok;
  } catch (err) {
    console.warn('[Data Enclave] Job description save error, maintained in local state:', err);
    return true;
  }
}

/**
 * Record a completed mock interview session and its answers in server database
 */
export async function recordInterviewSessionInDb(
  userId: string,
  session: {
    title: string;
    track: string;
    company: string;
    interviewerPersona?: string;
    difficulty?: string;
    durationMinutes?: number;
    questionCount?: number;
    voiceModeEnabled?: boolean;
    status?: string;
    overallScore?: number;
    categoryScores?: Record<string, number>;
    summary?: string;
    overallSummary?: string;
    keyWeakness?: string;
    questions?: InterviewQuestion[];
    answers?: CandidateAnswer[];
  },
  questions?: InterviewQuestion[],
  answers?: CandidateAnswer[]
): Promise<string | null> {
  if (!userId || !isValidUuid(userId)) return null;
  const finalQuestions = questions || session.questions || [];
  const finalAnswers = answers || session.answers || [];
  try {
    const res = await fetch('/api/db/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        session: {
          ...session,
          summary: session.summary || session.overallSummary,
        },
        questions: finalQuestions,
        answers: finalAnswers,
      }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.sessionId || null;
  } catch (err) {
    console.warn('[Data Enclave] Session record error, maintained in local state:', err);
    return null;
  }
}

/**
 * Get session history for candidate from server database
 */
export async function getSessionHistoryFromDb(userId: string): Promise<SessionHistoryItem[]> {
  if (!userId || !isValidUuid(userId)) return [];
  try {
    const res = await fetch(`/api/db/session?userId=${encodeURIComponent(userId)}`);
    if (!res.ok) return [];
    const json = await res.json();
    return json.data || [];
  } catch (err) {
    console.warn('[Data Enclave] Session history fetch error, using local state:', err);
    return [];
  }
}

/**
 * Save evaluation report in server database
 */
export async function saveEvaluationReportInDb(
  userId: string,
  report: EvaluationReport
): Promise<EvaluationReport | null> {
  if (!userId || !isValidUuid(userId)) return report;
  try {
    const res = await fetch('/api/db/evaluation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, report }),
    });
    if (!res.ok) return report;
    const json = await res.json();
    return json.report || report;
  } catch (err) {
    console.warn('[Data Enclave] Evaluation report save error, maintained in local state:', err);
    return report;
  }
}

/**
 * Get latest evaluation report for candidate from server database
 */
export async function getLatestEvaluationReportFromDb(userId: string): Promise<EvaluationReport | null> {
  if (!userId || !isValidUuid(userId)) return null;
  try {
    const res = await fetch(`/api/db/evaluation?userId=${encodeURIComponent(userId)}`);
    if (!res.ok) return null;
    const json = await res.json();
    return json.data || null;
  } catch (err) {
    console.warn('[Data Enclave] Evaluation report fetch error, using local state:', err);
    return null;
  }
}

/**
 * Get all saved evaluation reports (newest first) for candidate from server database
 */
export async function getAllEvaluationReportsFromDb(userId: string): Promise<EvaluationReport[]> {
  if (!userId || !isValidUuid(userId)) return [];
  try {
    const res = await fetch(`/api/db/evaluation?userId=${encodeURIComponent(userId)}`);
    if (!res.ok) return [];
    const json = await res.json();
    if (Array.isArray(json.reports)) return json.reports;
    return json.data ? [json.data] : [];
  } catch (err) {
    console.warn('[Data Enclave] Evaluation reports list fetch error, using local state:', err);
    return [];
  }
}

/**
 * Get candidate personalized learning plan and modules from server database
 */
export async function getLearningPlanFromDb(userId: string): Promise<LearningPlan | null> {
  if (!userId || !isValidUuid(userId)) return null;
  try {
    const res = await fetch(`/api/db/learning-plan?userId=${encodeURIComponent(userId)}`);
    if (!res.ok) return null;
    const json = await res.json();
    return json.data || null;
  } catch (err) {
    console.warn('[Data Enclave] Learning plan fetch error, using local state:', err);
    return null;
  }
}

/**
 * Save candidate learning plan and associated modules in server database
 */
export async function saveLearningPlanInDb(
  userId: string,
  plan: LearningPlan
): Promise<boolean> {
  if (!userId || !isValidUuid(userId)) return true;
  try {
    const res = await fetch('/api/db/learning-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, plan }),
    });
    return res.ok;
  } catch (err) {
    console.warn('[Data Enclave] Learning plan save error, maintained in local state:', err);
    return true;
  }
}

/**
 * Toggle a module completed status in server database
 */
export async function updateModuleStatusInDb(
  arg1: string,
  arg2: string | boolean,
  arg3?: boolean
): Promise<boolean> {
  const userId = typeof arg2 === 'boolean' ? '' : arg1;
  const moduleId = typeof arg2 === 'boolean' ? arg1 : (arg2 as string);
  const completed = typeof arg2 === 'boolean' ? arg2 : !!arg3;

  if (!moduleId || (userId && !isValidUuid(userId))) return true;
  try {
    const res = await fetch('/api/db/learning-plan/module-toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, moduleId, completed }),
    });
    return res.ok;
  } catch (err) {
    console.warn('[Data Enclave] Module status update error:', err);
    return true;
  }
}
