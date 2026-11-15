# PrepPilot AI — Supabase Database Integration Guide

This directory contains the database schema and migration scripts for PrepPilot AI.

## Quick Setup Instructions

### 1. Execute SQL Migration in Supabase
1. Open your [Supabase Dashboard](https://supabase.com/dashboard).
2. Select your PrepPilot project.
3. In the left navigation, click **SQL Editor**.
4. Click **New Query**.
5. Copy the entire contents of `supabase/migrations/20261028_init_schema.sql` and paste it into the SQL Editor.
6. Click **Run** (green button).
7. Confirm that all 8 tables, indexes, RLS policies, and the `on_auth_user_created` trigger were created successfully.

### 2. Configure Environment Variables
In your local environment or `.env` file, provide your Supabase Project URL and Anon (Publishable) Key:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-publishable-key
```

> **Note**: Both keys are safe for the frontend browser bundle. Never use your `service_role` secret or database password in client-side code.

### 3. Enabled Row Level Security (RLS)
The migration enables RLS on all tables:
- `profiles`
- `resumes`
- `job_descriptions`
- `interview_sessions`
- `interview_questions`
- `candidate_answers`
- `evaluation_reports`
- `learning_plans`
- `learning_modules`

Each authenticated user can query, insert, and modify **only** their own private interview history, transcripts, resumes, and study plans.
