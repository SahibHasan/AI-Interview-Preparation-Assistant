import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Middleware
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Server-side protected Supabase credentials
// NEVER sent to the client or exposed in browser APIs
const supabaseUrl = 
  process.env.SUPABASE_URL || 
  process.env.VITE_SUPABASE_URL || 
  '';

const supabaseKey = 
  process.env.SUPABASE_SERVICE_ROLE_KEY || 
  process.env.SUPABASE_KEY || 
  process.env.SUPABASE_ANON_KEY || 
  process.env.VITE_SUPABASE_ANON_KEY || 
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 
  '';

import crypto from 'crypto';
import { EnclaveDatabase, DEFAULT_AVATAR_URL } from './server/enclaveDb';
import { hashPassword } from './server/authCrypto';
import { isValidAvatarUrl } from './src/utils/avatar';
import {
  VOICE_PERSONAS,
  generateInterviewPlan,
  generateAdaptiveTurnResponse,
  synthesizeSpeechAudio,
  transcribeSpokenAudio,
  generateTranscriptEvaluationReport,
  warmNeuralVoiceEngine,
} from './server/aiInterviewer';
import {
  analyzeResumeAndJobDescription,
  buildRoleInterviewSectionsAndRules,
} from './server/resumeParser';

let serverSupabase: SupabaseClient | null = null;
let cloudReachable = false;

const isNetworkError = (err: any): boolean => {
  const msg = String(err?.message || err?.cause?.message || err || '').toLowerCase();
  const code = String(err?.code || err?.cause?.code || '').toLowerCase();
  return (
    msg.includes('fetch failed') ||
    msg.includes('enotfound') ||
    msg.includes('econnrefused') ||
    msg.includes('etimedout') ||
    msg.includes('eai_again') ||
    msg.includes('network') ||
    code === 'enotfound' ||
    code === 'econnrefused' ||
    code === 'etimedout' ||
    code === 'eai_again'
  );
};

const isUnavailableOrProxyError = (err: any): boolean => {
  if (!err) return false;
  if (isNetworkError(err)) return true;
  const msg = String(err?.message ?? '').trim().toLowerCase();
  const status = Number(err?.status || 0);
  if (!msg || msg === '<none>' || msg === 'unknown error') return true;
  if (status === 403 || status === 502 || status === 503 || status === 504) return true;
  if (msg.includes('unexpected token') || msg.includes('invalid json') || msg.includes('not valid json')) return true;
  return false;
};

const isRlsOrFkFallbackError = (err: any): boolean => {
  const code = String(err?.code || '');
  const msg = String(err?.message || '').toLowerCase();
  return (
    code === '42501' ||
    code === '23503' ||
    code === '42P01' ||
    code === '42703' ||
    code === 'PGRST204' ||
    code === 'PGRST205' ||
    msg.includes('row-level security') ||
    msg.includes('foreign key constraint') ||
    msg.includes('schema cache') ||
    msg.includes('does not exist')
  );
};

// Persistent server-side enclave database for user accounts, credentials, avatars, and candidate state
const enclaveDb = new EnclaveDatabase();

if (supabaseUrl && supabaseKey && !supabaseUrl.includes('your-project-id')) {
  try {
    serverSupabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    cloudReachable = true;
    console.log('[PrepPilot Server] Protected Supabase database client initialized.');
  } catch (err) {
    console.warn('[PrepPilot Server] Failed to initialize Supabase client:', err);
  }
} else {
  console.log('[PrepPilot Server] Supabase credentials not set or placeholder; running in secure local/mock mode.');
}

async function verifyCloudReachability(): Promise<void> {
  if (!serverSupabase || !supabaseUrl) {
    cloudReachable = false;
    return;
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/`, {
      method: 'GET',
      headers: { apikey: supabaseKey },
      signal: controller.signal,
    });
    clearTimeout(timer);
    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    cloudReachable = res.ok && (contentType.includes('json') || contentType.includes('openapi'));
    if (!cloudReachable) {
      console.log(`[PrepPilot Server] Cloud database unavailable (HTTP ${res.status}); using protected server-side fallback enclave.`);
    }
  } catch (err) {
    if (isNetworkError(err) || (err as any)?.name === 'AbortError') {
      cloudReachable = false;
      console.log('[PrepPilot Server] Cloud database host unreachable; using protected server-side fallback enclave.');
    }
  }
}

const isValidUuid = (val?: any): boolean => {
  return typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
};

// ==============================================================================
// SERVER-SIDE DATABASE & AUTH PROXY API ROUTES
// Protected server-side: No keys, tokens, or credentials are sent to the client
// ==============================================================================

// Health check endpoint (never exposes keys)
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'PrepPilot AI Enterprise Server',
    database: serverSupabase && cloudReachable ? 'connected' : 'local-enclave',
    timestamp: new Date().toISOString(),
  });
});

// Database status endpoint (boolean indicator only, no URLs or keys)
app.get('/api/db/status', (req: Request, res: Response) => {
  res.json({
    connected: !!(serverSupabase && cloudReachable),
    mode: serverSupabase && cloudReachable ? 'cloud-postgresql' : 'local-enclave',
  });
});

// Profile: GET
app.get('/api/db/profile', async (req: Request, res: Response) => {
  const userId = req.query.userId as string;
  if (!isValidUuid(userId)) {
    return res.json({ data: null });
  }
  if (!serverSupabase || !cloudReachable) {
    return res.json({ data: enclaveDb.getProfile(userId) });
  }

  try {
    const { data, error } = await serverSupabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error || !data) {
      if (error && isUnavailableOrProxyError(error)) {
        cloudReachable = false;
      }
      return res.json({ data: enclaveDb.getProfile(userId) });
    }

    const localProfile = enclaveDb.getProfile(userId);
    const localAcct = enclaveDb.findUserById(userId);
    const preferredAvatar =
      (localProfile?.avatarUrl && localProfile.avatarUrl !== DEFAULT_AVATAR_URL ? localProfile.avatarUrl : undefined) ||
      (localAcct?.avatarUrl && localAcct.avatarUrl !== DEFAULT_AVATAR_URL ? localAcct.avatarUrl : undefined) ||
      (data.avatar_url && data.avatar_url !== DEFAULT_AVATAR_URL ? data.avatar_url : undefined) ||
      localProfile?.avatarUrl ||
      localAcct?.avatarUrl ||
      data.avatar_url;

    res.json({
      data: {
        id: data.id,
        userId: data.id,
        email: data.email || localProfile?.email || localAcct?.email,
        fullName: data.full_name || localProfile?.fullName,
        avatarUrl: preferredAvatar,
        authProvider: data.auth_provider || localProfile?.authProvider || localAcct?.authProvider || 'email',
        headline: data.headline,
        location: data.location,
        yearsOfExperience: Number(data.years_of_experience),
        education: data.education || { degree: '', institution: '', graduationYear: 2020 },
        skills: data.skills || [],
        extractedExperiences: data.extracted_experiences || [],
        preferences: data.preferences || {
          aiInterviewerPersona: 'Sarah',
          interviewerStyle: 'bar-raiser',
          speechTranscriptionEnabled: true,
          voiceFeedbackEnabled: true,
          cameraEnabled: false,
        },
        targetRole: data.target_role,
        targetCompany: data.target_company,
        experienceLevel: data.experience_level,
        readinessScore: data.readiness_score,
        streakDays: data.streak_days,
      },
    });
  } catch (err: any) {
    if (isUnavailableOrProxyError(err)) {
      cloudReachable = false;
      return res.json({ data: enclaveDb.getProfile(userId) });
    }
    console.error('[API] Error fetching profile:', err?.message || err);
    res.status(500).json({ error: 'Failed to retrieve profile' });
  }
});

// Profile: POST / PUT (Upsert)
app.post('/api/db/profile', async (req: Request, res: Response) => {
  const { userId, profile } = req.body;
  if (!isValidUuid(userId)) {
    return res.json({ success: true, localOnly: true });
  }

  enclaveDb.upsertProfile(userId, profile || {});

  if (!serverSupabase || !cloudReachable) {
    return res.json({ success: true, localOnly: true });
  }

  try {
    const payload: any = {
      id: userId,
      updated_at: new Date().toISOString(),
    };

    if (profile.fullName) payload.full_name = profile.fullName;
    if (profile.email) payload.email = String(profile.email).trim().toLowerCase();
    if (profile.avatarUrl !== undefined) payload.avatar_url = profile.avatarUrl;
    if (profile.authProvider) payload.auth_provider = profile.authProvider;
    if (profile.headline) payload.headline = profile.headline;
    if (profile.location) payload.location = profile.location;
    if (profile.yearsOfExperience !== undefined) payload.years_of_experience = profile.yearsOfExperience;
    if (profile.education) payload.education = profile.education;
    if (profile.skills) payload.skills = profile.skills;
    if (profile.extractedExperiences) payload.extracted_experiences = profile.extractedExperiences;
    if (profile.preferences) payload.preferences = profile.preferences;
    if (profile.targetRole) payload.target_role = profile.targetRole;
    if (profile.targetCompany) payload.target_company = profile.targetCompany;
    if (profile.experienceLevel) payload.experience_level = profile.experienceLevel;
    if (profile.readinessScore !== undefined) payload.readiness_score = profile.readinessScore;
    if (profile.streakDays !== undefined) payload.streak_days = profile.streakDays;

    const { error } = await serverSupabase.from('profiles').upsert(payload);
    if (error) {
      if (isUnavailableOrProxyError(error)) {
        cloudReachable = false;
        return res.json({ success: true, localOnly: true });
      }
      if (isRlsOrFkFallbackError(error)) {
        return res.json({ success: true, localOnly: true });
      }
      console.warn('[API] Upsert profile warning:', error.message);
      return res.status(400).json({ error: error.message || 'Failed to save profile' });
    }

    if (profile.avatarUrl !== undefined) {
      await serverSupabase
        .from('user_accounts')
        .update({ avatar_url: profile.avatarUrl, updated_at: new Date().toISOString() })
        .eq('id', userId);
    }

    res.json({ success: true });
  } catch (err: any) {
    if (isUnavailableOrProxyError(err)) {
      cloudReachable = false;
      return res.json({ success: true, localOnly: true });
    }
    console.error('[API] Error saving profile:', err?.message || err);
    res.status(500).json({ error: 'Failed to save profile' });
  }
});

// Profile Avatar: POST (Save or Reset Custom Uploaded Profile Image)
app.post('/api/db/avatar', async (req: Request, res: Response) => {
  const { userId, avatarUrl, email } = req.body || {};
  const nextAvatar = avatarUrl === '' || avatarUrl === null ? DEFAULT_AVATAR_URL : avatarUrl;

  if (!isValidAvatarUrl(nextAvatar)) {
    return res.status(400).json({ error: 'Invalid image format or URL provided.' });
  }

  const savedAvatar = enclaveDb.updateAvatar(userId || '', nextAvatar, email);

  if (!serverSupabase || !cloudReachable || !isValidUuid(userId)) {
    return res.json({ success: true, avatarUrl: savedAvatar, localOnly: true });
  }

  try {
    const now = new Date().toISOString();
    const { error } = await serverSupabase
      .from('profiles')
      .update({ avatar_url: savedAvatar, updated_at: now })
      .eq('id', userId);

    if (error) {
      if (isUnavailableOrProxyError(error)) {
        cloudReachable = false;
        return res.json({ success: true, avatarUrl: savedAvatar, localOnly: true });
      }
      if (isRlsOrFkFallbackError(error)) {
        return res.json({ success: true, avatarUrl: savedAvatar, localOnly: true });
      }
      return res.status(400).json({ error: error.message || 'Failed to save profile avatar' });
    }

    try {
      await serverSupabase
        .from('user_accounts')
        .update({ avatar_url: savedAvatar, updated_at: now })
        .eq('id', userId);
    } catch {
      // Non-fatal if user_accounts table not yet migrated remotely
    }

    res.json({ success: true, avatarUrl: savedAvatar });
  } catch (err: any) {
    if (isUnavailableOrProxyError(err)) {
      cloudReachable = false;
      return res.json({ success: true, avatarUrl: savedAvatar, localOnly: true });
    }
    console.error('[API] Error updating avatar:', err?.message || err);
    res.status(500).json({ error: 'Failed to save profile avatar' });
  }
});

// Resume: GET Latest
app.get('/api/db/resume', async (req: Request, res: Response) => {
  const userId = req.query.userId as string;
  if (!isValidUuid(userId)) {
    return res.json({ data: null });
  }
  if (!serverSupabase || !cloudReachable) {
    return res.json({ data: enclaveDb.getResume(userId) });
  }

  try {
    const { data, error } = await serverSupabase
      .from('resumes')
      .select('*')
      .eq('user_id', userId)
      .order('uploaded_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      if (isUnavailableOrProxyError(error)) {
        cloudReachable = false;
        return res.json({ data: enclaveDb.getResume(userId) });
      }
      return res.json({ data: enclaveDb.getResume(userId) });
    }
    if (!data) {
      return res.json({ data: enclaveDb.getResume(userId) });
    }

    const matchAnalysis = data.match_analysis || {};
    const localResume = enclaveDb.getResume(userId);
    res.json({
      data: {
        id: data.id,
        fileName: data.file_name,
        fileSizeKb: Number(data.file_size_kb),
        atsScore: Number(data.ats_score),
        uploadedAt: data.uploaded_at,
        rawText: matchAnalysis.rawText || localResume?.rawText,
        wordCount: matchAnalysis.wordCount || localResume?.wordCount,
        atsBreakdown: matchAnalysis.atsBreakdown || localResume?.atsBreakdown,
        keywordAnalysis: matchAnalysis.keywordAnalysis || localResume?.keywordAnalysis,
        levelingFit: matchAnalysis.levelingFit || localResume?.levelingFit,
        compensationBand: matchAnalysis.compensationBand || localResume?.compensationBand,
        detectedRoleSections: matchAnalysis.detectedRoleSections || localResume?.detectedRoleSections,
        assessmentRules: matchAnalysis.assessmentRules || localResume?.assessmentRules,
        parsedProfile: data.parsed_profile || localResume?.parsedProfile || {},
        matchAnalysis: {
          overallMatchPercentage: matchAnalysis.overallMatchPercentage ?? 86,
          matchedSkills: matchAnalysis.matchedSkills || [],
          missingSkills: matchAnalysis.missingSkills || [],
          inferredStrengths: matchAnalysis.inferredStrengths || [],
          suggestedFocusAreas: matchAnalysis.suggestedFocusAreas || [],
        },
      },
    });
  } catch (err: any) {
    if (isUnavailableOrProxyError(err)) {
      cloudReachable = false;
      return res.json({ data: enclaveDb.getResume(userId) });
    }
    console.error('[API] Error fetching resume:', err?.message || err);
    res.status(500).json({ error: 'Failed to retrieve resume' });
  }
});

// Resume: POST (Save)
app.post('/api/db/resume', async (req: Request, res: Response) => {
  const { userId, resume } = req.body;
  if (!isValidUuid(userId)) {
    return res.json({ success: true, localOnly: true });
  }

  enclaveDb.setResume(userId, resume);

  if (!serverSupabase || !cloudReachable) {
    return res.json({ success: true, localOnly: true });
  }

  try {
    const matchAnalysisObj = resume.matchAnalysis || {};
    const { error } = await serverSupabase.from('resumes').insert({
      user_id: userId,
      file_name: resume.fileName || 'candidate_resume.pdf',
      file_size_kb: resume.fileSizeKb || 240,
      ats_score: resume.atsScore || 92,
      parsed_profile: resume.parsedProfile || {},
      match_analysis: {
        overallMatchPercentage: matchAnalysisObj.overallMatchPercentage ?? resume.overallMatchPercentage ?? 86,
        matchedSkills: matchAnalysisObj.matchedSkills || resume.matchedSkills || [],
        missingSkills: matchAnalysisObj.missingSkills || resume.missingSkills || [],
        inferredStrengths: matchAnalysisObj.inferredStrengths || resume.inferredStrengths || [],
        suggestedFocusAreas: matchAnalysisObj.suggestedFocusAreas || resume.suggestedFocusAreas || [],
        atsBreakdown: resume.atsBreakdown || undefined,
        keywordAnalysis: resume.keywordAnalysis || undefined,
        levelingFit: resume.levelingFit || undefined,
        compensationBand: resume.compensationBand || undefined,
        detectedRoleSections: resume.detectedRoleSections || undefined,
        assessmentRules: resume.assessmentRules || undefined,
        rawText: resume.rawText ? String(resume.rawText).slice(0, 12000) : undefined,
        wordCount: resume.wordCount || undefined,
      },
      uploaded_at: new Date().toISOString(),
    });

    if (error) {
      if (isUnavailableOrProxyError(error)) {
        cloudReachable = false;
        return res.json({ success: true, localOnly: true });
      }
      if (isRlsOrFkFallbackError(error)) {
        return res.json({ success: true, localOnly: true });
      }
      console.warn('[API] Insert resume warning:', error.message);
      return res.status(400).json({ error: error.message || 'Failed to save resume' });
    }

    res.json({ success: true });
  } catch (err: any) {
    if (isUnavailableOrProxyError(err)) {
      cloudReachable = false;
      return res.json({ success: true, localOnly: true });
    }
    console.error('[API] Error saving resume:', err?.message || err);
    res.status(500).json({ error: 'Failed to save resume' });
  }
});

// Job Description: POST
app.post('/api/db/job-description', async (req: Request, res: Response) => {
  const { userId, title, company, rawText, extractedRequirements } = req.body;
  if (!serverSupabase || !cloudReachable || !isValidUuid(userId)) {
    return res.json({ success: true, localOnly: true });
  }

  try {
    const { error } = await serverSupabase.from('job_descriptions').insert({
      user_id: userId,
      title: title || 'Target Role',
      company: company || 'Target Company',
      raw_text: rawText,
      extracted_requirements: extractedRequirements || {},
    });

    if (error) {
      if (isUnavailableOrProxyError(error)) {
        cloudReachable = false;
        return res.json({ success: true, localOnly: true });
      }
      if (isRlsOrFkFallbackError(error)) {
        return res.json({ success: true, localOnly: true });
      }
      console.warn('[API] Insert job description warning:', error.message);
      return res.status(400).json({ error: error.message || 'Failed to save job description' });
    }

    res.json({ success: true });
  } catch (err: any) {
    if (isUnavailableOrProxyError(err)) {
      cloudReachable = false;
      return res.json({ success: true, localOnly: true });
    }
    console.error('[API] Error saving job description:', err?.message || err);
    res.status(500).json({ error: 'Failed to save job description' });
  }
});

// Session: GET History
app.get('/api/db/session', async (req: Request, res: Response) => {
  const userId = req.query.userId as string;
  if (!isValidUuid(userId)) {
    return res.json({ data: [] });
  }
  if (!serverSupabase || !cloudReachable) {
    return res.json({ data: enclaveDb.getSessions(userId) });
  }

  try {
    const { data, error } = await serverSupabase
      .from('interview_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('started_at', { ascending: false });

    if (error) {
      if (isUnavailableOrProxyError(error)) {
        cloudReachable = false;
        return res.json({ data: enclaveDb.getSessions(userId) });
      }
      return res.json({ data: enclaveDb.getSessions(userId) });
    }
    if (!data) {
      return res.json({ data: enclaveDb.getSessions(userId) });
    }

    const items = data.map((row) => {
      const overallNum = Number(row.overall_score || 85);
      const computedStatus = row.status === 'completed'
        ? (overallNum >= 90 ? 'strong-pass' : overallNum >= 75 ? 'passed' : 'needs-review')
        : (row.status || 'passed');

      return {
        id: row.id,
        title: row.title,
        track: row.track,
        company: row.company,
        interviewerName: row.interviewer_persona || 'Sarah',
        date: new Date(row.started_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        duration: `${row.duration_minutes || 45} mins`,
        score: overallNum,
        overallScore: overallNum,
        categoryScores: row.category_scores || {
          technicalCorrectness: 85,
          communicationStructure: 85,
          problemDecomposition: 85,
          tradeoffAnalysis: 85,
        },
        keyWeakness: row.key_weakness || 'WAN Jitter Edge Retries',
        summary: row.overall_summary || 'Mock interview session completed.',
        status: computedStatus,
      };
    });

    res.json({ data: items });
  } catch (err: any) {
    if (isUnavailableOrProxyError(err)) {
      cloudReachable = false;
      return res.json({ data: enclaveDb.getSessions(userId) });
    }
    console.error('[API] Error fetching session history:', err?.message || err);
    res.status(500).json({ error: 'Failed to retrieve session history' });
  }
});

// Session: POST (Record Interview Session + Questions + Answers)
app.post('/api/db/session', async (req: Request, res: Response) => {
  const { userId, session, questions, answers } = req.body;
  if (!isValidUuid(userId)) {
    return res.json({ success: true, localOnly: true });
  }

  const finalScore = session?.overallScore ?? session?.score ?? 85;
  const finalInterviewer = session?.interviewerPersona || session?.interviewerName || 'Sarah';
  const localSessionId = crypto.randomUUID();
  const localEntry = {
    id: localSessionId,
    title: session?.title || 'Mock Interview Session',
    track: session?.track || 'technical',
    company: session?.company || 'Stripe',
    interviewerName: finalInterviewer,
    date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    duration: `${session?.durationMinutes || 45} mins`,
    score: finalScore,
    overallScore: finalScore,
    categoryScores: session?.categoryScores || {},
    keyWeakness: session?.keyWeakness || '',
    summary: session?.summary || session?.overallSummary || '',
    status: finalScore >= 85 ? 'strong-pass' : 'passed',
  };
  enclaveDb.prependSession(userId, localEntry);

  if (!serverSupabase || !cloudReachable) {
    return res.json({ success: true, sessionId: localSessionId, localOnly: true });
  }

  try {
    const { data: sessionData, error: sessionError } = await serverSupabase
      .from('interview_sessions')
      .insert({
        user_id: userId,
        title: session.title,
        track: session.track,
        company: session.company,
        interviewer_persona: finalInterviewer,
        difficulty: session.difficulty || 'senior-staff',
        duration_minutes: session.durationMinutes || 45,
        question_count: session.questionCount || (Array.isArray(questions) ? questions.length : 5),
        voice_mode_enabled: session.voiceModeEnabled ?? true,
        status: session.status || 'completed',
        overall_score: finalScore,
        category_scores: session.categoryScores || {},
        overall_summary: session.summary || session.overallSummary || '',
        key_weakness: session.keyWeakness || '',
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (sessionError || !sessionData) {
      if (isUnavailableOrProxyError(sessionError)) {
        cloudReachable = false;
        return res.json({ success: true, sessionId: localSessionId, localOnly: true });
      }
      if (isRlsOrFkFallbackError(sessionError)) {
        return res.json({ success: true, sessionId: localSessionId, localOnly: true });
      }
      console.warn('[API] Insert session warning:', sessionError?.message);
      return res.status(400).json({ error: sessionError?.message || 'Failed to record session' });
    }

    const sessionId = sessionData.id;

    if (Array.isArray(questions) && questions.length > 0) {
      const qRows = questions.map((q: any, idx: number) => ({
        session_id: sessionId,
        order_num: idx + 1,
        category: q.category || 'Technical',
        difficulty: q.difficulty || 'L6',
        question_text: q.questionText || '',
        context_constraint: q.contextConstraint || q.contextOrConstraint || null,
        evaluation_rubric: q.evaluationRubric || [],
        sample_expected_answer: q.sampleExpectedAnswer || null,
      }));
      await serverSupabase.from('interview_questions').insert(qRows);
    }

    if (Array.isArray(answers) && answers.length > 0) {
      const aRows = answers.map((a: any) => ({
        session_id: sessionId,
        question_id: a.questionId,
        answer_text: a.answerText,
        duration_seconds: a.durationSeconds || 0,
        word_count: a.answerText ? a.answerText.trim().split(/\s+/).length : 0,
        adaptive_follow_up: a.adaptiveFollowUp || a.followUp || null,
      }));
      await serverSupabase.from('candidate_answers').insert(aRows);
    }

    res.json({ success: true, sessionId });
  } catch (err: any) {
    if (isUnavailableOrProxyError(err)) {
      cloudReachable = false;
      return res.json({ success: true, sessionId: localSessionId, localOnly: true });
    }
    console.error('[API] Error saving interview session:', err?.message || err);
    res.status(500).json({ error: 'Failed to record session' });
  }
});

// Evaluation: GET Latest & Full Saved History
app.get('/api/db/evaluation', async (req: Request, res: Response) => {
  const userId = req.query.userId as string;
  const sessionId = (req.query.sessionId as string) || '';
  const reportId = (req.query.reportId as string) || '';

  if (!isValidUuid(userId)) {
    return res.json({ data: null, reports: [] });
  }

  const localReports = enclaveDb.getEvaluations(userId);
  const pickTarget = (list: any[]) => {
    if (reportId) return list.find((r) => r.id === reportId) || list[0] || null;
    if (sessionId) return list.find((r) => r.sessionId === sessionId || r.id === sessionId) || list[0] || null;
    return list[0] || null;
  };

  if (!serverSupabase || !cloudReachable) {
    return res.json({ data: pickTarget(localReports), reports: localReports });
  }

  try {
    const { data, error } = await serverSupabase
      .from('evaluation_reports')
      .select('*')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false })
      .limit(25);

    if (error) {
      if (isUnavailableOrProxyError(error)) {
        cloudReachable = false;
      }
      return res.json({ data: pickTarget(localReports), reports: localReports });
    }

    if (!data || data.length === 0) {
      return res.json({ data: pickTarget(localReports), reports: localReports });
    }

    const mappedCloud = data.map((row: any) => {
      const localMatch = localReports.find(
        (lr) => lr.id === row.id || (row.session_id && lr.sessionId === row.session_id)
      );
      return {
        id: row.id,
        sessionId: row.session_id || localMatch?.sessionId || row.id,
        completedAt: new Date(row.completed_at).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        overallScore: Number(row.overall_score),
        targetRole: row.target_role,
        targetCompany: row.target_company,
        calibratedBenchmark: row.calibrated_benchmark,
        durationFormatted: row.duration_formatted,
        durationSeconds: localMatch?.durationSeconds,
        interviewerPersona: localMatch?.interviewerPersona,
        percentileRank: Number(row.percentile_rank),
        categoryScores: row.category_scores,
        overallSummary: row.overall_summary,
        questionFeedbacks: row.question_feedbacks || [],
        recommendedDrills: row.recommended_drills || [],
        conversationTranscript: localMatch?.conversationTranscript || [],
        evaluationBasis: localMatch?.evaluationBasis,
        source: localMatch?.source,
      };
    });

    // Merge any recent local reports not yet returned from cloud
    const extraLocal = localReports.filter(
      (lr) => !mappedCloud.some((cr: any) => cr.id === lr.id || (lr.sessionId && cr.sessionId === lr.sessionId))
    );
    const mergedReports = [...extraLocal, ...mappedCloud];

    res.json({
      data: pickTarget(mergedReports),
      reports: mergedReports,
    });
  } catch (err: any) {
    if (isUnavailableOrProxyError(err)) {
      cloudReachable = false;
      return res.json({ data: pickTarget(localReports), reports: localReports });
    }
    console.error('[API] Error fetching evaluation report:', err?.message || err);
    res.status(500).json({ error: 'Failed to retrieve evaluation report' });
  }
});

// Evaluation: POST (Save Real-Time Report & Update Readiness)
app.post('/api/db/evaluation', async (req: Request, res: Response) => {
  const { userId, report } = req.body || {};
  if (!report || !isValidUuid(userId)) {
    return res.json({ success: true, report, localOnly: true });
  }

  const enrichedReport = {
    ...report,
    id: report.id || crypto.randomUUID(),
    completedAt: report.completedAt || new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
  };

  enclaveDb.saveEvaluation(userId, enrichedReport);

  if (!serverSupabase || !cloudReachable) {
    return res.json({ success: true, report: enrichedReport, localOnly: true });
  }

  try {
    const nowIso = new Date().toISOString();
    const { data: insertedRow, error } = await serverSupabase
      .from('evaluation_reports')
      .insert({
        user_id: userId,
        session_id: isValidUuid(enrichedReport.sessionId) ? enrichedReport.sessionId : null,
        completed_at: nowIso,
        overall_score: enrichedReport.overallScore,
        target_role: enrichedReport.targetRole,
        target_company: enrichedReport.targetCompany,
        calibrated_benchmark: enrichedReport.calibratedBenchmark,
        duration_formatted: enrichedReport.durationFormatted,
        percentile_rank: enrichedReport.percentileRank,
        category_scores: enrichedReport.categoryScores,
        overall_summary: enrichedReport.overallSummary,
        question_feedbacks: enrichedReport.questionFeedbacks || [],
        recommended_drills: enrichedReport.recommendedDrills || [],
      })
      .select('id')
      .single();

    if (error) {
      if (isUnavailableOrProxyError(error)) {
        cloudReachable = false;
        return res.json({ success: true, report: enrichedReport, localOnly: true });
      }
      if (isRlsOrFkFallbackError(error)) {
        return res.json({ success: true, report: enrichedReport, localOnly: true });
      }
      console.warn('[API] Insert evaluation warning:', error.message);
      return res.json({ success: true, report: enrichedReport, localOnly: true });
    }

    if (insertedRow?.id) {
      enrichedReport.id = insertedRow.id;
      enclaveDb.saveEvaluation(userId, enrichedReport);
    }

    // Update user profile readiness score in Supabase too
    try {
      await serverSupabase
        .from('profiles')
        .update({
          readiness_score: Math.round(enrichedReport.overallScore || 78),
          updated_at: nowIso,
        })
        .eq('id', userId);
    } catch {
      // Non-fatal
    }

    res.json({ success: true, report: enrichedReport });
  } catch (err: any) {
    if (isUnavailableOrProxyError(err)) {
      cloudReachable = false;
      return res.json({ success: true, report: enrichedReport, localOnly: true });
    }
    console.error('[API] Error saving evaluation report:', err?.message || err);
    res.status(500).json({ error: 'Failed to save evaluation report' });
  }
});

// Learning Plan: GET
app.get('/api/db/learning-plan', async (req: Request, res: Response) => {
  const userId = req.query.userId as string;
  if (!isValidUuid(userId)) {
    return res.json({ data: null });
  }
  if (!serverSupabase || !cloudReachable) {
    return res.json({ data: enclaveDb.getLearningPlan(userId) });
  }

  try {
    const { data: planData, error: planError } = await serverSupabase
      .from('learning_plans')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (planError) {
      if (isUnavailableOrProxyError(planError)) {
        cloudReachable = false;
        return res.json({ data: enclaveDb.getLearningPlan(userId) });
      }
      return res.json({ data: enclaveDb.getLearningPlan(userId) });
    }
    if (!planData) {
      return res.json({ data: enclaveDb.getLearningPlan(userId) });
    }

    const { data: modulesData } = await serverSupabase
      .from('learning_modules')
      .select('*')
      .eq('plan_id', planData.id)
      .order('order_num', { ascending: true });

    const modules = (modulesData || []).map((m) => ({
      id: m.id,
      title: m.title,
      domain: m.domain,
      priority: m.priority,
      estimatedHours: Number(m.estimated_hours),
      completed: !!m.completed,
      keyTopics: m.key_topics || [],
      reason: m.reason || '',
    }));

    res.json({
      data: {
        id: planData.id,
        userId: planData.user_id,
        targetRole: planData.target_role,
        targetCompany: planData.target_company,
        targetDate: planData.target_date,
        completionPercentage: Number(planData.completion_percentage),
        totalModules: Number(planData.total_modules),
        completedModules: Number(planData.completed_modules),
        modules,
      },
    });
  } catch (err: any) {
    if (isUnavailableOrProxyError(err)) {
      cloudReachable = false;
      return res.json({ data: enclaveDb.getLearningPlan(userId) });
    }
    console.error('[API] Error fetching learning plan:', err?.message || err);
    res.status(500).json({ error: 'Failed to retrieve learning plan' });
  }
});

// Learning Plan: POST
app.post('/api/db/learning-plan', async (req: Request, res: Response) => {
  const { userId, plan } = req.body;
  if (!isValidUuid(userId)) {
    return res.json({ success: true, localOnly: true });
  }

  enclaveDb.setLearningPlan(userId, plan);

  if (!serverSupabase || !cloudReachable) {
    return res.json({ success: true, localOnly: true });
  }

  try {
    const planPayload: any = {
      user_id: userId,
      target_role: plan.targetRole,
      target_company: plan.targetCompany,
      target_date: plan.targetDate,
      completion_percentage: plan.completionPercentage,
      total_modules: plan.totalModules,
      completed_modules: plan.completedModules,
      updated_at: new Date().toISOString(),
    };
    if (isValidUuid(plan.id)) {
      planPayload.id = plan.id;
    }

    const { data: planRecord, error: planError } = await serverSupabase
      .from('learning_plans')
      .upsert(planPayload)
      .select('id')
      .single();

    if (planError || !planRecord) {
      if (isUnavailableOrProxyError(planError)) {
        cloudReachable = false;
        return res.json({ success: true, localOnly: true });
      }
      if (isRlsOrFkFallbackError(planError)) {
        return res.json({ success: true, localOnly: true });
      }
      return res.status(400).json({ error: planError?.message || 'Failed to save learning plan' });
    }

    if (Array.isArray(plan.modules) && plan.modules.length > 0) {
      const moduleRows = plan.modules.map((m: any, idx: number) => {
        const row: any = {
          plan_id: planRecord.id,
          user_id: userId,
          title: m.title,
          domain: m.domain,
          priority: m.priority || 'high',
          estimated_hours: m.estimatedHours || 2,
          completed: !!m.completed,
          key_topics: m.keyTopics || [],
          reason: m.reason || '',
          order_num: idx,
        };
        if (isValidUuid(m.id)) {
          row.id = m.id;
        }
        return row;
      });
      await serverSupabase.from('learning_modules').upsert(moduleRows);
    }

    res.json({ success: true });
  } catch (err: any) {
    if (isUnavailableOrProxyError(err)) {
      cloudReachable = false;
      return res.json({ success: true, localOnly: true });
    }
    console.error('[API] Error saving learning plan:', err?.message || err);
    res.status(500).json({ error: 'Failed to save learning plan' });
  }
});

// Learning Plan: Toggle Module
app.post('/api/db/learning-plan/module-toggle', async (req: Request, res: Response) => {
  const { userId, moduleId, completed } = req.body;
  if (isValidUuid(userId)) {
    enclaveDb.toggleLearningModule(userId, moduleId, !!completed);
  }

  if (!serverSupabase || !cloudReachable || !isValidUuid(userId) || !isValidUuid(moduleId)) {
    return res.json({ success: true, localOnly: true });
  }

  try {
    const { error } = await serverSupabase
      .from('learning_modules')
      .update({ completed })
      .eq('id', moduleId)
      .eq('user_id', userId);

    if (error) {
      if (isUnavailableOrProxyError(error)) {
        cloudReachable = false;
        return res.json({ success: true, localOnly: true });
      }
      if (isRlsOrFkFallbackError(error)) {
        return res.json({ success: true, localOnly: true });
      }
      return res.status(400).json({ error: error.message || 'Failed to update module status' });
    }
    res.json({ success: true });
  } catch (err: any) {
    if (isUnavailableOrProxyError(err)) {
      cloudReachable = false;
      return res.json({ success: true, localOnly: true });
    }
    console.error('[API] Error toggling learning module:', err?.message || err);
    res.status(500).json({ error: 'Failed to update module status' });
  }
});

// Auth: Register (Server-Side)
app.post('/api/auth/register', async (req: Request, res: Response) => {
  const { email, password, name, targetRole, targetCompany, avatarUrl } = req.body || {};
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (!normalizedEmail) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const existingLocal = enclaveDb.findUserByEmail(normalizedEmail);
  if (existingLocal && existingLocal.passwordHash) {
    return res.status(409).json({ error: 'An account with this email already exists. Please sign in.' });
  }

  const fallbackRegister = () => {
    const result = enclaveDb.registerEmailUser({
      email: normalizedEmail,
      password: password || 'password123',
      name,
      targetRole,
      targetCompany,
      avatarUrl,
    });
    if (!result.ok) {
      return res.status(result.status).json({ error: result.error });
    }
    return res.json({
      success: true,
      mode: 'local',
      user: result.user,
    });
  };

  if (!serverSupabase || !cloudReachable) {
    return fallbackRegister();
  }

  try {
    const { data, error } = await serverSupabase.auth.signUp({
      email: normalizedEmail,
      password: password || 'CandidateSecurePass123!',
      options: {
        data: {
          full_name: name,
          avatar_url: avatarUrl || DEFAULT_AVATAR_URL,
          target_role: targetRole || 'Senior Frontend Engineer',
          target_company: targetCompany || 'Stripe',
        },
      },
    });

    if (error) {
      const errMsg = String(error.message || '').toLowerCase();
      if (
        isUnavailableOrProxyError(error) ||
        Number((error as any)?.status) === 429 ||
        errMsg.includes('rate limit')
      ) {
        return fallbackRegister();
      }
      return res.status(400).json({ error: error.message });
    }

    if (data.user) {
      const now = new Date().toISOString();
      const resolvedAvatar = avatarUrl || DEFAULT_AVATAR_URL;
      const passwordDigest = password ? hashPassword(password) : null;

      try {
        await serverSupabase.from('profiles').upsert({
          id: data.user.id,
          email: normalizedEmail,
          full_name: name || normalizedEmail.split('@')[0],
          avatar_url: resolvedAvatar,
          auth_provider: 'email',
          target_role: targetRole || 'Senior Frontend Engineer',
          target_company: targetCompany || 'Stripe',
          readiness_score: 78,
          streak_days: 1,
          last_login_at: now,
        });
      } catch {
        // Non-fatal if remote profiles schema is not yet migrated
      }

      try {
        await serverSupabase.from('user_accounts').upsert({
          id: data.user.id,
          email: normalizedEmail,
          password_hash: passwordDigest,
          auth_provider: 'email',
          full_name: name || normalizedEmail.split('@')[0],
          avatar_url: resolvedAvatar,
          target_role: targetRole || 'Senior Frontend Engineer',
          target_company: targetCompany || 'Stripe',
          email_verified: true,
          last_login_at: now,
          updated_at: now,
        });
      } catch {
        // Non-fatal if remote user_accounts table is not yet migrated
      }

      enclaveDb.syncExternalUser({
        id: data.user.id,
        email: normalizedEmail,
        password: password || 'CandidateSecurePass123!',
        name,
        avatarUrl: resolvedAvatar,
        authProvider: 'email',
        targetRole,
        targetCompany,
      });
    }

    const syncedUser = enclaveDb.findUserByEmail(normalizedEmail);
    res.json({
      success: true,
      user: data.user ? {
        id: data.user.id,
        email: data.user.email || normalizedEmail,
        name: syncedUser?.fullName || name,
        avatarUrl: syncedUser?.avatarUrl || avatarUrl || DEFAULT_AVATAR_URL,
        authProvider: 'email',
        targetRole: syncedUser?.targetRole || targetRole,
        targetCompany: syncedUser?.targetCompany || targetCompany,
      } : null,
      session: data.session,
    });
  } catch (err: any) {
    if (isUnavailableOrProxyError(err)) {
      cloudReachable = false;
      return fallbackRegister();
    }
    console.error('[API] Auth register error:', err?.message || err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Auth: Login (Server-Side Email & Password)
app.post('/api/auth/login', async (req: Request, res: Response) => {
  const { email, password } = req.body || {};
  const normalized = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (!normalized) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const fallbackLogin = () => {
    const result = enclaveDb.authenticateEmailUser({ email: normalized, password });
    if (!result.ok) {
      return res.status(result.status).json({ error: result.error });
    }
    return res.json({
      success: true,
      mode: 'local',
      user: result.user,
    });
  };

  if (!serverSupabase || !cloudReachable) {
    return fallbackLogin();
  }

  try {
    const { data, error } = await serverSupabase.auth.signInWithPassword({
      email: normalized,
      password,
    });

    if (error) {
      if (isUnavailableOrProxyError(error)) {
        cloudReachable = false;
        return fallbackLogin();
      }
      // If account exists in persistent enclaveDb (e.g. registered during rate-limit or awaiting email confirm), authenticate via scrypt
      if (enclaveDb.findUserByEmail(normalized) || String(error.message || '').toLowerCase().includes('not confirmed')) {
        return fallbackLogin();
      }
      return fallbackLogin();
    }

    const localAccount = enclaveDb.findUserByEmail(normalized);
    let savedAvatar = DEFAULT_AVATAR_URL;
    if (data.user) {
      let profData: any = null;
      try {
        const resProf = await serverSupabase
          .from('profiles')
          .select('avatar_url, full_name, target_role, target_company, auth_provider')
          .eq('id', data.user.id)
          .maybeSingle();
        profData = resProf.data;
      } catch {
        profData = null;
      }

      const remoteCustom =
        profData?.avatar_url && profData.avatar_url !== DEFAULT_AVATAR_URL ? profData.avatar_url : undefined;
      const localCustom =
        localAccount?.avatarUrl && localAccount.avatarUrl !== DEFAULT_AVATAR_URL
          ? localAccount.avatarUrl
          : undefined;
      savedAvatar = localCustom || remoteCustom || profData?.avatar_url || localAccount?.avatarUrl || data.user.user_metadata?.avatar_url || DEFAULT_AVATAR_URL;

      try {
        await serverSupabase
          .from('user_accounts')
          .upsert({
            id: data.user.id,
            email: normalized,
            auth_provider: profData?.auth_provider || localAccount?.authProvider || 'email',
            full_name: profData?.full_name || localAccount?.fullName || data.user.user_metadata?.full_name || normalized.split('@')[0],
            avatar_url: savedAvatar,
            target_role: profData?.target_role || localAccount?.targetRole || 'Senior Frontend Engineer',
            target_company: profData?.target_company || localAccount?.targetCompany || 'Stripe',
            last_login_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
      } catch {
        // Non-fatal if user_accounts table not yet migrated remotely
      }

      enclaveDb.syncExternalUser({
        id: data.user.id,
        email: normalized,
        password,
        name: profData?.full_name || localAccount?.fullName || data.user.user_metadata?.full_name,
        avatarUrl: savedAvatar,
        authProvider: (profData?.auth_provider as any) || localAccount?.authProvider || 'email',
        targetRole: profData?.target_role || localAccount?.targetRole,
        targetCompany: profData?.target_company || localAccount?.targetCompany,
      });
    }

    res.json({
      success: true,
      user: data.user ? {
        ...data.user,
        name: localAccount?.fullName || data.user.user_metadata?.full_name,
        avatarUrl: savedAvatar,
        authProvider: localAccount?.authProvider || 'email',
      } : null,
      session: data.session,
    });
  } catch (err: any) {
    if (isUnavailableOrProxyError(err)) {
      cloudReachable = false;
      return fallbackLogin();
    }
    console.error('[API] Auth login error:', err?.message || err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Auth: OAuth (Google / Gmail & GitHub Server-Side Account Linkage)
app.post('/api/auth/oauth', async (req: Request, res: Response) => {
  const { provider, email, name, avatarUrl } = req.body || {};
  if (provider !== 'google' && provider !== 'github') {
    return res.status(400).json({ error: 'Unsupported OAuth provider. Use Google or GitHub.' });
  }

  const user = enclaveDb.authenticateOAuthUser({ provider, email, name, avatarUrl });

  if (serverSupabase && cloudReachable) {
    try {
      const now = new Date().toISOString();
      await serverSupabase.from('user_accounts').upsert({
        id: user.id,
        email: user.email,
        auth_provider: provider,
        provider_subject: `${provider}:${user.email}`,
        full_name: user.name,
        avatar_url: user.avatarUrl,
        target_role: user.targetRole,
        target_company: user.targetCompany,
        email_verified: true,
        last_login_at: now,
        updated_at: now,
      });
    } catch {
      // Non-fatal if remote RLS blocks service-less upsert
    }
  }

  res.json({
    success: true,
    user,
  });
});

// ==============================================================================
// AI INTERVIEW ORCHESTRATOR & REALISTIC NEURAL VOICE AGENT API
// ==============================================================================

app.get('/api/ai/voices', (_req: Request, res: Response) => {
  res.json({
    voices: Object.values(VOICE_PERSONAS),
  });
});

app.post('/api/ai/resume/parse-and-analyze', async (req: Request, res: Response) => {
  try {
    const analysis = await analyzeResumeAndJobDescription(req.body || {});
    res.json({ success: true, analysis });
  } catch (err: any) {
    console.warn('[API] Resume parse/analyze notice:', err?.message || err);
    res.status(400).json({ error: err?.message || 'Failed to parse and analyze resume document' });
  }
});

app.post('/api/ai/interview/sections', (req: Request, res: Response) => {
  try {
    const result = buildRoleInterviewSectionsAndRules(req.body || {});
    res.json({ success: true, ...result });
  } catch (err: any) {
    console.error('[API] Interview sections calculation error:', err?.message || err);
    res.status(500).json({ error: 'Failed to compute interview sections and assessment rules' });
  }
});

app.post('/api/ai/interview/plan', async (req: Request, res: Response) => {
  try {
    const plan = await generateInterviewPlan(req.body || {});
    res.json({ success: true, plan });
  } catch (err: any) {
    console.error('[API] AI plan error:', err?.message || err);
    res.status(500).json({ error: 'Failed to prepare interview topic plan' });
  }
});

app.post('/api/ai/interview/respond', async (req: Request, res: Response) => {
  try {
    const result = await generateAdaptiveTurnResponse(req.body || {});
    res.json({ success: true, ...result });
  } catch (err: any) {
    console.error('[API] AI turn response error:', err?.message || err);
    res.status(500).json({ error: 'Failed to process interview response' });
  }
});

app.post('/api/ai/interview/evaluate', async (req: Request, res: Response) => {
  try {
    const evaluation = await generateTranscriptEvaluationReport(req.body || {});
    res.json({ success: true, evaluation });
  } catch (err: any) {
    console.error('[API] AI evaluation error:', err?.message || err);
    res.status(500).json({ error: 'Failed to evaluate interview transcript' });
  }
});

app.post('/api/ai/tts', async (req: Request, res: Response) => {
  try {
    const { text, persona, voiceOverride } = req.body || {};
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required for speech synthesis' });
    }
    const ttsResult = await synthesizeSpeechAudio({ text, persona, voiceOverride });
    res.json({ success: true, ...ttsResult });
  } catch (err: any) {
    console.error('[API] AI TTS error:', err?.message || err);
    res.status(500).json({ error: 'Failed to synthesize voice audio' });
  }
});

app.post('/api/ai/transcribe', async (req: Request, res: Response) => {
  try {
    const { audioBase64, mimeType } = req.body || {};
    if (!audioBase64 || typeof audioBase64 !== 'string') {
      return res.status(400).json({ error: 'Audio payload is required for transcription' });
    }
    const transcription = await transcribeSpokenAudio({ audioBase64, mimeType });
    res.json({ success: true, ...transcription });
  } catch (err: any) {
    console.error('[API] AI Transcribe error:', err?.message || err);
    res.status(500).json({ error: 'Failed to transcribe audio' });
  }
});

// ==============================================================================
// VITE MIDDLEWARE & STATIC ASSET SERVING
// ==============================================================================
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('[PrepPilot Server] Vite dev middleware mounted on port ' + PORT);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('[PrepPilot Server] Serving static production build from ' + distPath);
  }

  await verifyCloudReachability();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[PrepPilot Server] Enclave live on http://0.0.0.0:${PORT}`);
    warmNeuralVoiceEngine();
  });
}

startServer().catch((err) => {
  console.error('[PrepPilot Server] Fatal initialization failure:', err);
  process.exit(1);
});
