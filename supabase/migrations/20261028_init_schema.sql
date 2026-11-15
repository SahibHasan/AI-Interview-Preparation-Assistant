-- ==============================================================================
-- PrepPilot AI - Normalized PostgreSQL Schema Migration for Supabase
-- Tables: profiles, resumes, job_descriptions, interview_sessions, 
--         interview_questions, candidate_answers, evaluation_reports,
--         learning_plans, learning_modules
-- Includes: Foreign Keys, UUIDs, Indexes, Row Level Security (RLS) & Auth Triggers
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. CANDIDATE PROFILES & PREFERENCES
-- Linked 1-to-1 with Supabase auth.users
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    headline TEXT DEFAULT 'Senior Frontend & Systems Architect',
    location TEXT DEFAULT 'Seattle, WA • Open to Remote & Hybrid',
    years_of_experience NUMERIC DEFAULT 5,
    education JSONB DEFAULT '{"degree": "B.S. in Computer Science", "institution": "University of Washington", "graduationYear": 2020}'::jsonb,
    skills TEXT[] DEFAULT ARRAY[
        'TypeScript',
        'React 19 & Next.js',
        'Distributed Client Caching',
        'State Synchronization',
        'Web Vitals & Performance P99',
        'GraphQL & REST',
        'Tailwind CSS & Design Tokens',
        'WebSockets',
        'Unit & E2E Testing'
    ]::TEXT[],
    extracted_experiences JSONB DEFAULT '[
        {
            "role": "Senior Frontend Engineer",
            "company": "Vercel Ecosystem / Cloud Corp",
            "period": "2022 - Present",
            "bulletPoints": [
                "Architected distributed client state caching layer reducing redundant API queries by 42%.",
                "Optimized Core Web Vitals across 80+ enterprise dashboard surfaces to achieve P99 < 120ms."
            ]
        },
        {
            "role": "Frontend Engineer",
            "company": "ScaleFin SaaS",
            "period": "2020 - 2022",
            "bulletPoints": [
                "Constructed atomic design system tokens with Tailwind CSS and React component libraries.",
                "Built WebSockets real-time portfolio feed handling 15k concurrent financial events."
            ]
        }
    ]'::jsonb,
    preferences JSONB DEFAULT '{
        "aiInterviewerPersona": "Sarah",
        "interviewerStyle": "bar-raiser",
        "speechTranscriptionEnabled": true,
        "voiceFeedbackEnabled": true,
        "cameraEnabled": false
    }'::jsonb,
    target_role TEXT DEFAULT 'Senior Frontend Engineer',
    target_company TEXT DEFAULT 'Stripe',
    experience_level TEXT DEFAULT 'senior-staff',
    readiness_score NUMERIC DEFAULT 78,
    streak_days INTEGER DEFAULT 5,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ==============================================================================
-- 3. RESUME UPLOADS & EXTRACTED INTELLIGENCE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.resumes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_size_kb NUMERIC DEFAULT 240,
    ats_score NUMERIC DEFAULT 92,
    raw_text TEXT,
    parsed_profile JSONB DEFAULT '{}'::jsonb,
    match_analysis JSONB DEFAULT '{
        "overallMatchPercentage": 86,
        "matchedSkills": [
            {"skill": "TypeScript & React Architecture", "category": "Frontend Core", "matchStrength": 98},
            {"skill": "Distributed Client Caching", "category": "Architecture", "matchStrength": 92},
            {"skill": "Web Vitals & Performance Optimization", "category": "Reliability", "matchStrength": 90},
            {"skill": "State Synchronization & Events", "category": "Systems", "matchStrength": 88},
            {"skill": "Modern CSS & Design Systems", "category": "UI Craft", "matchStrength": 95}
        ],
        "missingSkills": [
            {"skill": "High-Throughput Partition Consensus", "category": "Distributed Systems", "importance": "critical"},
            {"skill": "Decoupled Client Edge Idempotency", "category": "Reliability", "importance": "critical"},
            {"skill": "Multi-Region WAN Jitter Compensation", "category": "Network Engineering", "importance": "moderate"}
        ],
        "inferredStrengths": [
            "Demonstrated expertise in resilient front-end application architectures",
            "Production-tested optimistic state mutations and offline handling",
            "Deep familiarity with component design token systems"
        ],
        "suggestedFocusAreas": [
            "Pre-vote phase Raft algorithms during WAN jitter",
            "Idempotent API retry guarantees on degraded connections",
            "High-density dashboard streaming optimization"
        ]
    }'::jsonb,
    uploaded_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ==============================================================================
-- 4. TARGET JOB DESCRIPTIONS & REQUIREMENT MATRICES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.job_descriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    raw_text TEXT NOT NULL,
    extracted_requirements JSONB DEFAULT '{
        "mustHaveSkills": ["TypeScript", "Distributed State", "Web Vitals", "Consensus Primitives"],
        "niceToHaveSkills": ["Rust", "Wasm", "GraphQL Federation"],
        "responsibilities": ["Lead multi-region client architecture", "Maintain P99 latency SLA below 120ms"],
        "coreCompetencies": ["Technical Depth", "Tradeoff Analysis", "System Decomposition"]
    }'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ==============================================================================
-- 5. INTERVIEW SESSIONS (MOCK INTERVIEWS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.interview_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    track TEXT NOT NULL DEFAULT 'technical', -- 'technical', 'behavioral', 'system-design', 'hr-cultural'
    company TEXT NOT NULL DEFAULT 'Stripe',
    interviewer_persona TEXT NOT NULL DEFAULT 'Sarah',
    difficulty TEXT NOT NULL DEFAULT 'senior-staff',
    duration_minutes INTEGER DEFAULT 45,
    question_count INTEGER DEFAULT 5,
    voice_mode_enabled BOOLEAN DEFAULT true,
    status TEXT NOT NULL DEFAULT 'completed', -- 'draft', 'in-progress', 'completed', 'abandoned'
    overall_score NUMERIC DEFAULT 88,
    category_scores JSONB DEFAULT '{
        "technicalCorrectness": 90,
        "communicationStructure": 87,
        "problemDecomposition": 85,
        "tradeoffAnalysis": 89
    }'::jsonb,
    overall_summary TEXT,
    key_weakness TEXT DEFAULT 'Edge Partition & WAN Jitter Handling',
    started_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ==============================================================================
-- 6. INTERVIEW QUESTIONS (RUBRIC & CONSTRAINTS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.interview_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.interview_sessions(id) ON DELETE CASCADE,
    order_num INTEGER NOT NULL,
    category TEXT NOT NULL,
    difficulty TEXT NOT NULL DEFAULT 'L6',
    question_text TEXT NOT NULL,
    context_constraint TEXT,
    evaluation_rubric JSONB DEFAULT '[]'::jsonb,
    sample_expected_answer TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ==============================================================================
-- 7. CANDIDATE ANSWERS & VOICE TRANSCRIPTS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.candidate_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.interview_sessions(id) ON DELETE CASCADE,
    question_id TEXT NOT NULL,
    answer_text TEXT NOT NULL,
    duration_seconds INTEGER DEFAULT 0,
    word_count INTEGER DEFAULT 0,
    adaptive_follow_up JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ==============================================================================
-- 8. COMPREHENSIVE EVALUATION REPORTS & SCORECARDS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.evaluation_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.interview_sessions(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    completed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    overall_score NUMERIC NOT NULL DEFAULT 88,
    target_role TEXT NOT NULL DEFAULT 'Senior Frontend Engineer',
    target_company TEXT NOT NULL DEFAULT 'Stripe',
    calibrated_benchmark TEXT DEFAULT 'Stripe L6 Staff Bar',
    duration_formatted TEXT DEFAULT '42m 15s',
    percentile_rank NUMERIC DEFAULT 92,
    category_scores JSONB NOT NULL DEFAULT '{
        "technicalCorrectness": 90,
        "communicationStructure": 87,
        "problemDecomposition": 85,
        "tradeoffAnalysis": 89
    }'::jsonb,
    overall_summary TEXT NOT NULL DEFAULT 'Candidate demonstrated senior-level systems decomposition and clear failure boundaries under WAN partition constraints.',
    question_feedbacks JSONB NOT NULL DEFAULT '[]'::jsonb,
    recommended_drills TEXT[] DEFAULT ARRAY[
        'Raft Consensus Pre-Vote Under WAN Jitter',
        'Idempotent Mutation Replay via IndexedDB WAL',
        'Multi-Tab BroadcastChannel Race Avoidance'
    ]::TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ==============================================================================
-- 9. PERSONALIZED LEARNING ROADMAPS & MODULES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.learning_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    target_role TEXT NOT NULL DEFAULT 'Senior Frontend Engineer',
    target_company TEXT NOT NULL DEFAULT 'Stripe',
    target_date TEXT DEFAULT 'Nov 12, 2026',
    completion_percentage NUMERIC DEFAULT 40,
    total_modules INTEGER DEFAULT 5,
    completed_modules INTEGER DEFAULT 2,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.learning_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES public.learning_plans(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    domain TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'high', -- 'critical', 'high', 'recommended'
    estimated_hours NUMERIC DEFAULT 2.5,
    completed BOOLEAN DEFAULT false,
    key_topics TEXT[] DEFAULT ARRAY[]::TEXT[],
    reason TEXT,
    order_num INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ==============================================================================
-- 10. INDEXES FOR PERFORMANCE & RELIABILITY
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON public.resumes(user_id);
CREATE INDEX IF NOT EXISTS idx_job_descriptions_user_id ON public.job_descriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.interview_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON public.interview_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_questions_session_id ON public.interview_questions(session_id);
CREATE INDEX IF NOT EXISTS idx_answers_session_id ON public.candidate_answers(session_id);
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON public.evaluation_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_session_id ON public.evaluation_reports(session_id);
CREATE INDEX IF NOT EXISTS idx_learning_plans_user_id ON public.learning_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_modules_plan_id ON public.learning_modules(plan_id);
CREATE INDEX IF NOT EXISTS idx_learning_modules_user_id ON public.learning_modules(user_id);

-- ==============================================================================
-- 11. ROW LEVEL SECURITY (RLS) POLICIES
-- Strict Isolation: Users can access ONLY their own records.
-- ==============================================================================

-- Enable RLS on every table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_descriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_modules ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Users can view own profile" 
    ON public.profiles FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
    ON public.profiles FOR INSERT 
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id);

-- Resumes Policies
CREATE POLICY "Users can view own resumes" 
    ON public.resumes FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own resumes" 
    ON public.resumes FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own resumes" 
    ON public.resumes FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own resumes" 
    ON public.resumes FOR DELETE 
    USING (auth.uid() = user_id);

-- Job Descriptions Policies
CREATE POLICY "Users can view own job descriptions" 
    ON public.job_descriptions FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own job descriptions" 
    ON public.job_descriptions FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own job descriptions" 
    ON public.job_descriptions FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own job descriptions" 
    ON public.job_descriptions FOR DELETE 
    USING (auth.uid() = user_id);

-- Interview Sessions Policies
CREATE POLICY "Users can view own interview sessions" 
    ON public.interview_sessions FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own interview sessions" 
    ON public.interview_sessions FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own interview sessions" 
    ON public.interview_sessions FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own interview sessions" 
    ON public.interview_sessions FOR DELETE 
    USING (auth.uid() = user_id);

-- Interview Questions Policies (Accessible via owned session)
CREATE POLICY "Users can view questions in own sessions" 
    ON public.interview_questions FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.interview_sessions 
            WHERE interview_sessions.id = interview_questions.session_id 
            AND interview_sessions.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert questions into own sessions" 
    ON public.interview_questions FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.interview_sessions 
            WHERE interview_sessions.id = interview_questions.session_id 
            AND interview_sessions.user_id = auth.uid()
        )
    );

-- Candidate Answers Policies
CREATE POLICY "Users can view answers in own sessions" 
    ON public.candidate_answers FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.interview_sessions 
            WHERE interview_sessions.id = candidate_answers.session_id 
            AND interview_sessions.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert answers into own sessions" 
    ON public.candidate_answers FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.interview_sessions 
            WHERE interview_sessions.id = candidate_answers.session_id 
            AND interview_sessions.user_id = auth.uid()
        )
    );

-- Evaluation Reports Policies
CREATE POLICY "Users can view own evaluation reports" 
    ON public.evaluation_reports FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own evaluation reports" 
    ON public.evaluation_reports FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own evaluation reports" 
    ON public.evaluation_reports FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own evaluation reports" 
    ON public.evaluation_reports FOR DELETE 
    USING (auth.uid() = user_id);

-- Learning Plans Policies
CREATE POLICY "Users can view own learning plans" 
    ON public.learning_plans FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own learning plans" 
    ON public.learning_plans FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own learning plans" 
    ON public.learning_plans FOR UPDATE 
    USING (auth.uid() = user_id);

-- Learning Modules Policies
CREATE POLICY "Users can view own learning modules" 
    ON public.learning_modules FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own learning modules" 
    ON public.learning_modules FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own learning modules" 
    ON public.learning_modules FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own learning modules" 
    ON public.learning_modules FOR DELETE 
    USING (auth.uid() = user_id);

-- ==============================================================================
-- 12. AUTOMATIC PROFILE CREATION TRIGGER ON AUTH SIGNUP
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_plan_id UUID;
BEGIN
    -- 1. Insert Profile
    INSERT INTO public.profiles (
        id,
        full_name,
        target_role,
        target_company,
        readiness_score,
        streak_days
    ) VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'target_role', 'Senior Frontend Engineer'),
        COALESCE(NEW.raw_user_meta_data->>'target_company', 'Stripe'),
        78,
        1
    );

    -- 2. Insert Default Adaptive Learning Plan for New User
    INSERT INTO public.learning_plans (
        id,
        user_id,
        target_role,
        target_company,
        target_date,
        completion_percentage,
        total_modules,
        completed_modules
    ) VALUES (
        gen_random_uuid(),
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'target_role', 'Senior Frontend Engineer'),
        COALESCE(NEW.raw_user_meta_data->>'target_company', 'Stripe'),
        'Nov 12, 2026',
        40,
        5,
        2
    ) RETURNING id INTO new_plan_id;

    -- 3. Seed Standard Curriculum Modules
    INSERT INTO public.learning_modules (
        plan_id, user_id, title, domain, priority, estimated_hours, completed, key_topics, reason, order_num
    ) VALUES 
    (
        new_plan_id, NEW.id,
        'Raft Consensus Pre-Vote Under WAN Jitter',
        'Distributed Systems & Consistency',
        'critical', 2.5, false,
        ARRAY['Heartbeat timeout bounds', 'Election safety guarantees', 'Network partition quorum recovery']::TEXT[],
        'Diagnosed gap: Weak explanation of split-brain prevention during WAN jitter spikes in mock round #2.',
        1
    ),
    (
        new_plan_id, NEW.id,
        'Client-Side Idempotency & WAL Replay',
        'API Design & Reliability',
        'critical', 2.0, false,
        ARRAY['UUIDv4 token generation', 'Header injection', 'Exponential backoff with jitter']::TEXT[],
        'Required for Stripe L6 API idempotency standards across edge networks.',
        2
    ),
    (
        new_plan_id, NEW.id,
        'BroadcastChannel Multi-Tab Synchronization',
        'State Architecture',
        'high', 1.5, true,
        ARRAY['Web Workers', 'SharedArrayBuffer locks', 'Cross-origin postMessage boundaries']::TEXT[],
        'Mastered in mock round #1 with exemplar architectural breakdown.',
        3
    ),
    (
        new_plan_id, NEW.id,
        'P99 Web Vitals & Hydration Optimization',
        'Performance Engineering',
        'high', 2.0, true,
        ARRAY['INP budgeting', 'Off-main-thread compute', 'Streaming SSR reconciliation']::TEXT[],
        'Verified strength from resume indexing (ScaleFin 42% latency reduction).',
        4
    ),
    (
        new_plan_id, NEW.id,
        'Cross-Functional Engineering Conflict (STAR)',
        'Leadership & Behavioral',
        'recommended', 1.5, false,
        ARRAY['Product manager friction', 'Scope negotiation', 'Technical debt budgeting']::TEXT[],
        'Calibrated for Stripe Staff round behavioral panel with Bar Raiser.',
        5
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
