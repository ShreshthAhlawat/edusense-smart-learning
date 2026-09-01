-- 1. QUIZ ATTEMPTS: duration + completion + per-answer detail
ALTER TABLE public.quiz_attempts
  ADD COLUMN IF NOT EXISTS duration_seconds integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS completion_rate numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS answer_detail jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 2. SCHOOL REQUESTS: duration + decision trail
ALTER TABLE public.school_requests
  ADD COLUMN IF NOT EXISTS duration_months integer NOT NULL DEFAULT 12,
  ADD COLUMN IF NOT EXISTS decision_note text,
  ADD COLUMN IF NOT EXISTS license_id uuid;

-- allow owner to update status (previously UPDATE was denied)
DROP POLICY IF EXISTS "owner updates school requests" ON public.school_requests;
CREATE POLICY "owner updates school requests" ON public.school_requests
  FOR UPDATE TO authenticated
  USING ((auth.jwt() ->> 'email') = 'shreshthahlawat2012@gmail.com')
  WITH CHECK ((auth.jwt() ->> 'email') = 'shreshthahlawat2012@gmail.com');

-- 3. SCHOOL LICENSES: lifecycle management
ALTER TABLE public.school_licenses
  ADD COLUMN IF NOT EXISTS label text,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS revoked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS duration_months integer NOT NULL DEFAULT 12,
  ADD COLUMN IF NOT EXISTS request_id uuid;

-- redeem should respect expiry + revocation
CREATE OR REPLACE FUNCTION public.redeem_school_code(_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  IF NOT FOUND OR NOT lic.active OR lic.revoked THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid or inactive code');
  END IF;
  IF lic.expires_at IS NOT NULL AND lic.expires_at < now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This code has expired');
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
  PERFORM set_config('app.allow_plan_change', 'on', true);
  UPDATE public.profiles SET plan = 'school-pro'::user_plan WHERE id = auth.uid();
  PERFORM set_config('app.allow_plan_change', 'off', true);
  RETURN jsonb_build_object('ok', true, 'plan', 'school-pro');
END;
$function$;

-- 4. USAGE SESSIONS (platform analytics)
CREATE TABLE IF NOT EXISTS public.usage_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text,
  route text NOT NULL,
  tool text NOT NULL DEFAULT 'General',
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  duration_seconds integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.usage_sessions TO authenticated;
GRANT ALL ON public.usage_sessions TO service_role;
ALTER TABLE public.usage_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usage self insert" ON public.usage_sessions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "usage self update" ON public.usage_sessions
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "usage self read" ON public.usage_sessions
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "usage owner read" ON public.usage_sessions
  FOR SELECT TO authenticated USING ((auth.jwt() ->> 'email') = 'shreshthahlawat2012@gmail.com');

CREATE INDEX IF NOT EXISTS usage_sessions_started_idx ON public.usage_sessions (started_at DESC);
CREATE INDEX IF NOT EXISTS usage_sessions_user_idx ON public.usage_sessions (user_id);

-- 5. CHATBOT HISTORY
CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  persona text NOT NULL DEFAULT 'student',
  title text NOT NULL DEFAULT 'New chat',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_sessions TO authenticated;
GRANT ALL ON public.chat_sessions TO service_role;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chat sessions self" ON public.chat_sessions
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER chat_sessions_touch BEFORE UPDATE ON public.chat_sessions
  FOR EACH ROW EXECUTE FUNCTION public.tc_touch_updated_at();

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_messages TO service_role;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chat messages self" ON public.chat_messages
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX IF NOT EXISTS chat_messages_session_idx ON public.chat_messages (session_id, created_at);