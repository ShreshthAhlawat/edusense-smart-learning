-- Extend user_plan enum
ALTER TYPE public.user_plan ADD VALUE IF NOT EXISTS 'school-pro';

-- Update handle_new_user to auto-assign admin plan for founder email
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
    CASE WHEN lower(NEW.email) = 'shreshthahlawat2012@gmail.com' THEN 'admin'::user_plan ELSE 'free'::user_plan END
  )
  ON CONFLICT (id) DO UPDATE SET
    plan = CASE WHEN lower(NEW.email) = 'shreshthahlawat2012@gmail.com' THEN 'admin'::user_plan ELSE public.profiles.plan END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill: if the founder already exists, upgrade to admin
UPDATE public.profiles p SET plan = 'admin'::user_plan
FROM auth.users u WHERE p.id = u.id AND lower(u.email) = 'shreshthahlawat2012@gmail.com';

-- Allow guest quiz attempts + written answers
ALTER TABLE public.quiz_attempts ALTER COLUMN student_id DROP NOT NULL;
ALTER TABLE public.quiz_attempts ADD COLUMN IF NOT EXISTS guest_name text;
ALTER TABLE public.quiz_attempts ADD COLUMN IF NOT EXISTS written_answers jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Allow anon inserts (guests) into quiz_attempts, restricted to guest rows
GRANT INSERT, SELECT ON public.quiz_attempts TO anon;

DROP POLICY IF EXISTS "attempts guest insert" ON public.quiz_attempts;
CREATE POLICY "attempts guest insert" ON public.quiz_attempts
  FOR INSERT TO anon WITH CHECK (student_id IS NULL AND guest_name IS NOT NULL);

DROP POLICY IF EXISTS "attempts teacher read written" ON public.quiz_attempts;
CREATE POLICY "attempts teacher read written" ON public.quiz_attempts
  FOR SELECT TO anon USING (false); -- placeholder, teacher policy already exists via authenticated

-- Allow public read of quizzes for shareable links (anon)
GRANT SELECT ON public.quizzes TO anon;
DROP POLICY IF EXISTS "quizzes public read" ON public.quizzes;
CREATE POLICY "quizzes public read" ON public.quizzes FOR SELECT TO anon USING (true);

-- ============ saved_models ============
CREATE TABLE IF NOT EXISTS public.saved_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_name text NOT NULL,
  sketchfab_uid text NOT NULL,
  title text NOT NULL,
  license_type text,
  creator_name text,
  thumbnail_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_models TO authenticated;
GRANT ALL ON public.saved_models TO service_role;
ALTER TABLE public.saved_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "saved_models read all authenticated" ON public.saved_models FOR SELECT TO authenticated USING (true);
CREATE POLICY "saved_models teacher manage" ON public.saved_models FOR ALL TO authenticated USING (auth.uid() = teacher_id) WITH CHECK (auth.uid() = teacher_id);

-- ============ school_licenses ============
CREATE TABLE IF NOT EXISTS public.school_licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  max_students int NOT NULL DEFAULT 0,
  max_teachers int NOT NULL DEFAULT 0,
  students_redeemed int NOT NULL DEFAULT 0,
  teachers_redeemed int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.school_licenses TO authenticated;
GRANT ALL ON public.school_licenses TO service_role;
ALTER TABLE public.school_licenses ENABLE ROW LEVEL SECURITY;

-- Only admins can view/manage license inventory
CREATE POLICY "school_licenses admin manage" ON public.school_licenses FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.plan = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.plan = 'admin'));

-- Redeem function: validate & increment counts atomically, and upgrade caller's plan
CREATE OR REPLACE FUNCTION public.redeem_school_code(_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

GRANT EXECUTE ON FUNCTION public.redeem_school_code(text) TO authenticated;