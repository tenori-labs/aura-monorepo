-- ============================================================
-- AURA: Incremental Migration — Add 'admin' role
--
-- IMPORTANT: Postgres requires enum modifications to be committed
-- BEFORE they are used in the same transaction.
-- ============================================================

-- STEP 1: Run this command SEPARATELY first to add the value.
-- (Uncomment and run if 'admin' is not yet in your enum)
-- ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'admin';


-- STEP 2: Run the rest of this script to update policies & triggers
-- (Run this AFTER Step 1 is committed)

-- 1. Update the faculty RLS policy so admins also pass it
DROP POLICY IF EXISTS "Faculty can view all profiles" ON public.profiles;
CREATE POLICY "Faculty can view all profiles"
  ON public.profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('faculty', 'admin')
    )
  );

-- 2. Add a dedicated admin full-access policy
DROP POLICY IF EXISTS "Admins have full access" ON public.profiles;
CREATE POLICY "Admins have full access"
  ON public.profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- 3. Replace handle_new_user() to safely accept 'admin' from signup metadata
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
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Done. Existing users and data are untouched.
-- New signups with role: 'admin' in metadata will get admin role.
-- ============================================================
