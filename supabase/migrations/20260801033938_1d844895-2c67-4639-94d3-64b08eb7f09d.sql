-- 1) Prevent self privilege escalation on profiles
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW; -- service role / definer flows
  END IF;
  IF (auth.jwt() ->> 'email') = 'shreshthahlawat2012@gmail.com' THEN
    RETURN NEW;
  END IF;
  IF NEW.role IS DISTINCT FROM OLD.role AND OLD.role IS NOT NULL THEN
    RAISE EXCEPTION 'You are not allowed to change your role';
  END IF;
  IF NEW.plan IS DISTINCT FROM OLD.plan THEN
    RAISE EXCEPTION 'You are not allowed to change your plan';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_prevent_privilege_escalation ON public.profiles;
CREATE TRIGGER profiles_prevent_privilege_escalation
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

-- redeem_school_code must still be able to grant school-pro: it is SECURITY DEFINER,
-- but auth.uid() is set, so bypass it explicitly via a session flag.
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
  PERFORM set_config('app.allow_plan_change', 'on', true);
  UPDATE public.profiles SET plan = 'school-pro'::user_plan WHERE id = auth.uid();
  PERFORM set_config('app.allow_plan_change', 'off', true);
  RETURN jsonb_build_object('ok', true, 'plan', 'school-pro');
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  IF (auth.jwt() ->> 'email') = 'shreshthahlawat2012@gmail.com' THEN
    RETURN NEW;
  END IF;
  IF coalesce(current_setting('app.allow_plan_change', true), 'off') = 'on' THEN
    RETURN NEW;
  END IF;
  IF NEW.role IS DISTINCT FROM OLD.role AND OLD.role IS NOT NULL THEN
    RAISE EXCEPTION 'You are not allowed to change your role';
  END IF;
  IF NEW.plan IS DISTINCT FROM OLD.plan THEN
    RAISE EXCEPTION 'You are not allowed to change your plan';
  END IF;
  RETURN NEW;
END;
$$;

-- 2) Quizzes: remove anonymous access to full quiz rows (answer keys)
DROP POLICY IF EXISTS "quizzes public read" ON public.quizzes;

CREATE OR REPLACE FUNCTION public.get_public_quiz(_quiz_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'id', q.id,
    'title', q.title,
    'subject', q.subject,
    'difficulty', q.difficulty,
    'language', q.language,
    'class_level', q.class_level,
    'questions', COALESCE((
      SELECT jsonb_agg(elem - 'correct' - 'sample_answer' ORDER BY ord)
      FROM jsonb_array_elements(q.questions) WITH ORDINALITY AS t(elem, ord)
    ), '[]'::jsonb)
  )
  FROM public.quizzes q
  WHERE q.id = _quiz_id;
$$;

REVOKE ALL ON FUNCTION public.get_public_quiz(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_public_quiz(uuid) TO anon, authenticated;

-- Server-side scoring + attempt recording for public/shared quizzes
CREATE OR REPLACE FUNCTION public.submit_public_quiz_attempt(
  _quiz_id uuid,
  _guest_name text,
  _mcq_answers jsonb,
  _written_answers jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  qz public.quizzes%ROWTYPE;
  elem jsonb;
  i int := 0;
  sub text;
  breakdown jsonb := '{}'::jsonb;
  cur jsonb;
  correct_count int := 0;
  total_scored int := 0;
  score numeric := 0;
  uid uuid := auth.uid();
BEGIN
  SELECT * INTO qz FROM public.quizzes WHERE id = _quiz_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Quiz not found');
  END IF;
  IF uid IS NULL AND coalesce(trim(_guest_name), '') = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Name required');
  END IF;

  FOR elem IN SELECT * FROM jsonb_array_elements(qz.questions) LOOP
    sub := coalesce(elem->>'subtopic', 'General');
    IF coalesce(elem->>'type', 'mcq') <> 'written' THEN
      cur := coalesce(breakdown->sub, jsonb_build_object('correct', 0, 'total', 0));
      total_scored := total_scored + 1;
      cur := jsonb_set(cur, '{total}', to_jsonb((cur->>'total')::int + 1));
      IF (_mcq_answers->>i::text) IS NOT NULL
         AND (_mcq_answers->>i::text)::int = (elem->>'correct')::int THEN
        correct_count := correct_count + 1;
        cur := jsonb_set(cur, '{correct}', to_jsonb((cur->>'correct')::int + 1));
      END IF;
      breakdown := jsonb_set(breakdown, ARRAY[sub], cur);
    END IF;
    i := i + 1;
  END LOOP;

  IF total_scored > 0 THEN
    score := round((correct_count::numeric / total_scored) * 100);
  END IF;

  INSERT INTO public.quiz_attempts (student_id, quiz_id, subject, score, correct_count, total_count, subtopic_breakdown, guest_name, written_answers)
  VALUES (uid, _quiz_id, qz.subject, score, correct_count, total_scored, breakdown,
          CASE WHEN uid IS NULL THEN trim(_guest_name) ELSE NULL END,
          coalesce(_written_answers, '[]'::jsonb));

  RETURN jsonb_build_object('ok', true, 'score', score, 'correct', correct_count, 'total', total_scored, 'breakdown', breakdown);
END;
$$;

REVOKE ALL ON FUNCTION public.submit_public_quiz_attempt(uuid, text, jsonb, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.submit_public_quiz_attempt(uuid, text, jsonb, jsonb) TO anon, authenticated;

-- 3) saved_models: owner or students in that teacher's teams
CREATE OR REPLACE FUNCTION public.shares_team_with(_teacher_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members tm
    JOIN public.teams t ON t.id = tm.team_id
    WHERE t.teacher_id = _teacher_id AND tm.student_id = _user_id
  );
$$;

DROP POLICY IF EXISTS "saved_models read all authenticated" ON public.saved_models;
CREATE POLICY "saved_models owner or team read" ON public.saved_models
FOR SELECT TO authenticated
USING (auth.uid() = teacher_id OR public.shares_team_with(teacher_id, auth.uid()));

-- 4) teacher_content: owner or explicitly shared with a team the user belongs to
CREATE OR REPLACE FUNCTION public.content_shared_with_user(_content_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.content_shares cs
    JOIN public.team_members tm ON tm.team_id = cs.team_id
    WHERE cs.content_id = _content_id AND tm.student_id = _user_id
  );
$$;

DROP POLICY IF EXISTS "content read all authenticated" ON public.teacher_content;
CREATE POLICY "content owner or shared read" ON public.teacher_content
FOR SELECT TO authenticated
USING (auth.uid() = teacher_id OR public.content_shared_with_user(id, auth.uid()));

-- 5) Internal SECURITY DEFINER helpers should not be callable by API roles
REVOKE ALL ON FUNCTION public.handle_new_user() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.tc_touch_updated_at() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_profile_privilege_escalation() FROM public, anon, authenticated;
