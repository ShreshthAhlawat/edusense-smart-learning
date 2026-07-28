
-- 1. Migrate all existing admin plan users to pro
UPDATE public.profiles SET plan = 'pro'::user_plan WHERE plan = 'admin'::user_plan;

-- 2. Rewrite handle_new_user to no longer use admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username, plan)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'free'::user_plan
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Make sure the trigger exists (it may or may not have been created previously)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Drop the old admin-plan-based RLS policy on school_licenses and replace with email check
DROP POLICY IF EXISTS "school_licenses admin manage" ON public.school_licenses;

CREATE POLICY "owner email manages licenses"
  ON public.school_licenses
  FOR ALL
  TO authenticated
  USING ((auth.jwt() ->> 'email') = 'shreshthahlawat2012@gmail.com')
  WITH CHECK ((auth.jwt() ->> 'email') = 'shreshthahlawat2012@gmail.com');

-- Students/teachers still need to read a specific code to redeem — allow read via SECURITY DEFINER fn only.
-- (Existing redeem_school_code function uses SECURITY DEFINER so no read policy required for redemption.)

-- 4. Recreate redeem_school_code without admin references (existing version already doesn't reference admin, but reapply cleanly)
CREATE OR REPLACE FUNCTION public.redeem_school_code(_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  lic public.school_licenses%ROWTYPE;
  urole text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sign in required');
  END IF;
  SELECT role::text INTO urole FROM public.profiles WHERE id = auth.uid();
  IF urole IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Select your role first');
  END IF;
  SELECT * INTO lic FROM public.school_licenses WHERE code = upper(_code) FOR UPDATE;
  IF NOT FOUND OR NOT lic.active THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid or inactive code');
  END IF;
  IF urole = 'student' THEN
    IF lic.students_redeemed >= lic.max_students THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Student seats exhausted for this code');
    END IF;
    UPDATE public.school_licenses SET students_redeemed = students_redeemed + 1 WHERE id = lic.id;
  ELSE
    IF lic.teachers_redeemed >= lic.max_teachers THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Teacher seats exhausted for this code');
    END IF;
    UPDATE public.school_licenses SET teachers_redeemed = teachers_redeemed + 1 WHERE id = lic.id;
  END IF;
  UPDATE public.profiles SET plan = 'school-pro'::user_plan WHERE id = auth.uid();
  RETURN jsonb_build_object('ok', true, 'plan', 'school-pro');
END;
$$;

-- 5. Drop the "admin" value from the user_plan enum
-- Postgres has no direct DROP VALUE; recreate the enum without it.
ALTER TYPE public.user_plan RENAME TO user_plan__old;
CREATE TYPE public.user_plan AS ENUM ('free', 'pro', 'school-pro');
-- Migrate the column
ALTER TABLE public.profiles
  ALTER COLUMN plan DROP DEFAULT,
  ALTER COLUMN plan TYPE public.user_plan USING plan::text::public.user_plan,
  ALTER COLUMN plan SET DEFAULT 'free'::public.user_plan;
DROP TYPE public.user_plan__old;

-- 6. Create the school_requests table for enterprise enquiries
CREATE TABLE IF NOT EXISTS public.school_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_name text NOT NULL,
  contact_person text NOT NULL,
  contact_email text NOT NULL,
  contact_phone text,
  estimated_students integer,
  estimated_teachers integer,
  notes text,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.school_requests TO authenticated;
GRANT INSERT ON public.school_requests TO anon;
GRANT ALL ON public.school_requests TO service_role;

ALTER TABLE public.school_requests ENABLE ROW LEVEL SECURITY;

-- Anyone (guest or signed-in) can submit an enquiry
CREATE POLICY "anyone can submit school request"
  ON public.school_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only the owner email can read submissions
CREATE POLICY "owner reads school requests"
  ON public.school_requests
  FOR SELECT
  TO authenticated
  USING ((auth.jwt() ->> 'email') = 'shreshthahlawat2012@gmail.com');
