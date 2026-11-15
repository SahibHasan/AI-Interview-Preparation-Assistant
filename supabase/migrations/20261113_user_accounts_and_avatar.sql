-- ==============================================================================
-- PrepPilot AI - Migration: User Accounts (Email, Password Hash, OAuth Provider)
-- & Persistent Candidate Profile Avatars
-- ==============================================================================

-- 1. Enhance public.profiles with email, avatar_url, auth_provider, and login telemetry
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS email TEXT,
    ADD COLUMN IF NOT EXISTS avatar_url TEXT,
    ADD COLUMN IF NOT EXISTS auth_provider TEXT NOT NULL DEFAULT 'email',
    ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email_lower
    ON public.profiles (LOWER(email))
    WHERE email IS NOT NULL;

-- 2. Create normalized public.user_accounts table for credential & provider persistence
-- Stores salted scrypt password hashes (never plaintext), OAuth provider links (Google/GitHub),
-- and canonical profile avatar URLs keyed by email.
CREATE TABLE IF NOT EXISTS public.user_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    password_hash TEXT,
    auth_provider TEXT NOT NULL DEFAULT 'email' CHECK (auth_provider IN ('email', 'google', 'github')),
    provider_subject TEXT,
    full_name TEXT NOT NULL DEFAULT 'Candidate',
    avatar_url TEXT,
    target_role TEXT NOT NULL DEFAULT 'Senior Frontend Engineer',
    target_company TEXT NOT NULL DEFAULT 'Stripe',
    email_verified BOOLEAN NOT NULL DEFAULT true,
    last_login_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_accounts_email_lower
    ON public.user_accounts (LOWER(email));

CREATE INDEX IF NOT EXISTS idx_user_accounts_provider_sub
    ON public.user_accounts (auth_provider, provider_subject)
    WHERE provider_subject IS NOT NULL;

ALTER TABLE public.user_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own account" ON public.user_accounts;
CREATE POLICY "Users can view own account"
    ON public.user_accounts FOR SELECT
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own account" ON public.user_accounts;
CREATE POLICY "Users can insert own account"
    ON public.user_accounts FOR INSERT
    WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own account" ON public.user_accounts;
CREATE POLICY "Users can update own account"
    ON public.user_accounts FOR UPDATE
    USING (auth.uid() = id);

-- 3. Update auth signup trigger to persist email, avatar_url, and auth_provider
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_plan_id UUID;
    resolved_name TEXT;
    resolved_role TEXT;
    resolved_company TEXT;
    resolved_avatar TEXT;
    resolved_provider TEXT;
BEGIN
    resolved_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
    resolved_role := COALESCE(NEW.raw_user_meta_data->>'target_role', 'Senior Frontend Engineer');
    resolved_company := COALESCE(NEW.raw_user_meta_data->>'target_company', 'Stripe');
    resolved_avatar := COALESCE(NEW.raw_user_meta_data->>'avatar_url', '');
    resolved_provider := COALESCE(NEW.raw_app_meta_data->>'provider', 'email');

    -- Sync profile record
    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        avatar_url,
        auth_provider,
        target_role,
        target_company,
        readiness_score,
        streak_days,
        last_login_at
    ) VALUES (
        NEW.id,
        LOWER(NEW.email),
        resolved_name,
        NULLIF(resolved_avatar, ''),
        CASE WHEN resolved_provider IN ('email', 'google', 'github') THEN resolved_provider ELSE 'email' END,
        resolved_role,
        resolved_company,
        78,
        1,
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = COALESCE(EXCLUDED.email, public.profiles.email),
        avatar_url = COALESCE(NULLIF(EXCLUDED.avatar_url, ''), public.profiles.avatar_url),
        auth_provider = EXCLUDED.auth_provider,
        last_login_at = NOW(),
        updated_at = NOW();

    -- Sync user_accounts record
    INSERT INTO public.user_accounts (
        id,
        email,
        auth_provider,
        full_name,
        avatar_url,
        target_role,
        target_company,
        email_verified,
        last_login_at
    ) VALUES (
        NEW.id,
        LOWER(NEW.email),
        CASE WHEN resolved_provider IN ('email', 'google', 'github') THEN resolved_provider ELSE 'email' END,
        resolved_name,
        NULLIF(resolved_avatar, ''),
        resolved_role,
        resolved_company,
        NEW.email_confirmed_at IS NOT NULL,
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.user_accounts.full_name),
        avatar_url = COALESCE(public.user_accounts.avatar_url, EXCLUDED.avatar_url),
        last_login_at = NOW(),
        updated_at = NOW();

    -- Seed default learning plan if missing
    IF NOT EXISTS (SELECT 1 FROM public.learning_plans WHERE user_id = NEW.id) THEN
        INSERT INTO public.learning_plans (
            id, user_id, target_role, target_company, target_date, completion_percentage, total_modules, completed_modules
        ) VALUES (
            gen_random_uuid(), NEW.id, resolved_role, resolved_company, 'Nov 12, 2026', 40, 5, 2
        ) RETURNING id INTO new_plan_id;

        INSERT INTO public.learning_modules (
            plan_id, user_id, title, domain, priority, estimated_hours, completed, key_topics, reason, order_num
        ) VALUES
        (new_plan_id, NEW.id, 'Raft Consensus Pre-Vote Under WAN Jitter', 'Distributed Systems & Consistency', 'critical', 2.5, false, ARRAY['Heartbeat timeout bounds', 'Election safety guarantees', 'Network partition quorum recovery']::TEXT[], 'Diagnosed gap: Weak explanation of split-brain prevention during WAN jitter spikes.', 1),
        (new_plan_id, NEW.id, 'Client-Side Idempotency & WAL Replay', 'API Design & Reliability', 'critical', 2.0, false, ARRAY['UUIDv4 token generation', 'Header injection', 'Exponential backoff with jitter']::TEXT[], 'Required for Stripe L6 API idempotency standards.', 2),
        (new_plan_id, NEW.id, 'BroadcastChannel Multi-Tab Synchronization', 'State Architecture', 'high', 1.5, true, ARRAY['Web Workers', 'SharedArrayBuffer locks', 'Cross-origin postMessage boundaries']::TEXT[], 'Mastered in mock round #1.', 3),
        (new_plan_id, NEW.id, 'P99 Web Vitals & Hydration Optimization', 'Performance Engineering', 'high', 2.0, true, ARRAY['INP budgeting', 'Off-main-thread compute', 'Streaming SSR reconciliation']::TEXT[], 'Verified strength from resume indexing.', 4),
        (new_plan_id, NEW.id, 'Cross-Functional Engineering Conflict (STAR)', 'Leadership & Behavioral', 'recommended', 1.5, false, ARRAY['Product manager friction', 'Scope negotiation', 'Technical debt budgeting']::TEXT[], 'Calibrated for Staff round behavioral panel.', 5);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
