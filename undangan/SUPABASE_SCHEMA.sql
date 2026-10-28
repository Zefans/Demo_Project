-- ─────────────────────────────────────────────────────────────────────────────
-- SUPABASE SCHEMA — Undangan Digital Platform
-- ─────────────────────────────────────────────────────────────────────────────
-- Run this in Supabase SQL Editor to set up the production database.
-- Row Level Security (RLS) is enabled on all user-data tables.
-- Only use the public ANON key in the frontend.
-- NEVER expose the service-role key to the client.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Extensions ────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 2. User Profiles ─────────────────────────────────────────────────────────
-- Extends Supabase auth.users with app-specific fields.
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL DEFAULT '',
  plan        TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'premium', 'business')),
  plan_expires_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can only read/update their own profile
CREATE POLICY "profiles: own read" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles: own update" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', ''));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── 3. Invitations ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.invitations (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id   TEXT NOT NULL DEFAULT 'playful-garden',
  couple_data   JSONB NOT NULL DEFAULT '{}',
  events        JSONB NOT NULL DEFAULT '[]',
  story         JSONB NOT NULL DEFAULT '[]',
  gallery       JSONB NOT NULL DEFAULT '[]',
  bank_accounts JSONB NOT NULL DEFAULT '[]',
  opening_text  TEXT NOT NULL DEFAULT '',
  closing_text  TEXT NOT NULL DEFAULT '',
  cover_photo_url TEXT,
  hashtag       TEXT,
  status        TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Owners can CRUD their own invitations
CREATE POLICY "invitations: owner select" ON public.invitations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "invitations: owner insert" ON public.invitations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "invitations: owner update" ON public.invitations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "invitations: owner delete" ON public.invitations
  FOR DELETE USING (auth.uid() = user_id);

-- Anyone can read PUBLISHED invitations (public share link)
CREATE POLICY "invitations: public read published" ON public.invitations
  FOR SELECT USING (status = 'published');

-- ── 4. RSVP ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.rsvps (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invitation_id   UUID NOT NULL REFERENCES public.invitations(id) ON DELETE CASCADE,
  guest_name      TEXT NOT NULL,
  attendance      TEXT NOT NULL CHECK (attendance IN ('hadir', 'tidak-hadir', 'belum-pasti')),
  guest_count     INT NOT NULL DEFAULT 1 CHECK (guest_count BETWEEN 1 AND 10),
  message         TEXT NOT NULL DEFAULT '',
  submitted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.rsvps ENABLE ROW LEVEL SECURITY;

-- Anyone can submit RSVP for a published invitation
CREATE POLICY "rsvps: public insert" ON public.rsvps
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invitations
      WHERE id = invitation_id AND status = 'published'
    )
  );

-- Invitation owner can read all RSVPs for their invitations
CREATE POLICY "rsvps: owner select" ON public.rsvps
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.invitations
      WHERE id = invitation_id AND user_id = auth.uid()
    )
  );

-- ── 5. Plan / Subscription limits ────────────────────────────────────────────
-- Validate plan server-side — never trust client-sent plan values.
CREATE OR REPLACE FUNCTION public.get_user_plan(user_uuid UUID)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_plan TEXT;
  v_expires TIMESTAMPTZ;
BEGIN
  SELECT plan, plan_expires_at INTO v_plan, v_expires
  FROM public.profiles WHERE id = user_uuid;

  -- If plan has expired, fall back to free
  IF v_expires IS NOT NULL AND v_expires < NOW() THEN
    RETURN 'free';
  END IF;

  RETURN COALESCE(v_plan, 'free');
END;
$$;

-- ── 6. Indexes ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_invitations_user_id ON public.invitations(user_id);
CREATE INDEX IF NOT EXISTS idx_invitations_status  ON public.invitations(status);
CREATE INDEX IF NOT EXISTS idx_rsvps_invitation_id ON public.rsvps(invitation_id);

-- ── 7. Updated_at trigger ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER invitations_updated_at
  BEFORE UPDATE ON public.invitations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- To connect: set in .env (frontend only — ANON key, never service-role):
--   VITE_SUPABASE_URL=https://your-project.supabase.co
--   VITE_SUPABASE_ANON_KEY=eyJ...
-- ─────────────────────────────────────────────────────────────────────────────

