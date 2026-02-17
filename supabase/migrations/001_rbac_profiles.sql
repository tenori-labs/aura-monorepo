-- ============================================================
-- AURA Role-Based Auth: Supabase SQL Migration (Production)
-- Run this in your Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Create role enum
CREATE TYPE public.user_role AS ENUM ('student', 'faculty', 'admin');

-- 2. Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.user_role NOT NULL DEFAULT 'student',
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Validation constraints
ALTER TABLE public.profiles
  ADD CONSTRAINT full_name_length CHECK (length(full_name) <= 255);

-- 4. Performance indexes
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_created_at ON public.profiles(created_at DESC);

-- 5. Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS Policies
-- ============================================================

-- Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile (role change blocked by trigger below)
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow inserts from the trigger (runs as SECURITY DEFINER)
CREATE POLICY "Service role can insert profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (true);

-- Faculty can view all profiles (for management purposes)
-- Admin inherits this since admin > faculty in the hierarchy
CREATE POLICY "Faculty can view all profiles"
  ON public.profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('faculty', 'admin')
    )
  );

-- Admins have full unrestricted access to all profiles
CREATE POLICY "Admins have full access"
  ON public.profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- ============================================================
-- Triggers
-- ============================================================

-- 6. Auto-update updated_at on any change
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 7. Prevent users from changing their own role (critical security)
CREATE OR REPLACE FUNCTION public.prevent_role_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.role IS DISTINCT FROM NEW.role AND auth.uid() = NEW.id THEN
    RAISE EXCEPTION 'Users cannot change their own role';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER check_role_change
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_change();

-- 8. Auto-create profile on signup (with error handling)
--    Accepts 'student', 'faculty', or 'admin' via raw_user_meta_data.
--    Falls back to 'student' for any unrecognised or missing value.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  requested_role TEXT;
  assigned_role  public.user_role;
BEGIN
  requested_role := NEW.raw_user_meta_data->>'role';

  -- Only allow known enum values; everything else becomes 'student'
  IF requested_role IN ('student', 'faculty', 'admin') THEN
    assigned_role := requested_role::public.user_role;
  ELSE
    assigned_role := 'student';
  END IF;

  INSERT INTO public.profiles (id, role, full_name)
  VALUES (
    NEW.id,
    assigned_role,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Error creating profile for user %: %', NEW.id, SQLERRM;
  RETURN NEW; -- Don't block user creation
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 9. Sync role to app_metadata (tamper-proof JWT claim)
CREATE OR REPLACE FUNCTION public.sync_role_to_app_metadata()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data = raw_app_meta_data || jsonb_build_object('role', NEW.role::text)
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_profile_role_change
  AFTER INSERT OR UPDATE OF role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_role_to_app_metadata();
