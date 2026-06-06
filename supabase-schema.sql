-- ============================================================
-- Origo Abroad — Creator Dashboard
-- Supabase Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. CREATOR PROFILES
-- Extends Supabase auth.users with business-specific fields
CREATE TABLE IF NOT EXISTS public.creator_profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name     TEXT NOT NULL,
  username      TEXT NOT NULL UNIQUE,
  email         TEXT NOT NULL,
  phone         TEXT,
  social_handle TEXT,   -- Instagram / YouTube handle
  bio           TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Enforce lowercase alphanumeric usernames (a-z, 0-9, hyphens only)
ALTER TABLE public.creator_profiles
  ADD CONSTRAINT username_format CHECK (username ~ '^[a-z0-9-]{3,30}$');

-- 2. LEADS TABLE
-- Each row = one student enquiry submitted via a creator's form
CREATE TABLE IF NOT EXISTS public.leads (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id        UUID NOT NULL REFERENCES public.creator_profiles(id),
  creator_username  TEXT NOT NULL,

  -- Student details
  student_name      TEXT NOT NULL,
  student_email     TEXT NOT NULL,
  student_phone     TEXT NOT NULL,
  city              TEXT,
  country_of_interest TEXT,   -- UK, Canada, Australia, Germany, etc.
  course_interest   TEXT,     -- Engineering, MBA, Medicine, etc.
  budget            TEXT,     -- e.g. "Under ₹30L", "₹30L–₹50L", "₹50L+"
  intake_year       TEXT,     -- 2025, 2026, 2027
  message           TEXT,

  -- CRM status
  status            TEXT NOT NULL DEFAULT 'new'
                    CHECK (status IN ('new', 'contacted', 'converted', 'closed')),

  -- Meta
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ROW LEVEL SECURITY
ALTER TABLE public.creator_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- creator_profiles: users can only read/update their own profile
CREATE POLICY "Creators can view own profile"
  ON public.creator_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Creators can update own profile"
  ON public.creator_profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Creators can insert own profile"
  ON public.creator_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- leads: creators can only see their own leads
CREATE POLICY "Creators can view own leads"
  ON public.leads FOR SELECT
  USING (auth.uid() = creator_id);

-- leads: anyone (unauthenticated students) can insert a lead
CREATE POLICY "Students can submit leads"
  ON public.leads FOR INSERT
  WITH CHECK (true);

-- 4. UPDATED_AT TRIGGER
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER creator_profiles_updated_at
  BEFORE UPDATE ON public.creator_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 5. INDEXES
CREATE INDEX IF NOT EXISTS leads_creator_id_idx ON public.leads(creator_id);
CREATE INDEX IF NOT EXISTS leads_created_at_idx ON public.leads(created_at DESC);
CREATE INDEX IF NOT EXISTS leads_status_idx ON public.leads(status);
CREATE INDEX IF NOT EXISTS creator_profiles_username_idx ON public.creator_profiles(username);

-- ============================================================
-- DONE. Next step: deploy the send-lead-email Edge Function.
-- ============================================================
