-- TEAMS
CREATE TABLE public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL,
  name text NOT NULL,
  join_code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teams TO authenticated;
GRANT ALL ON public.teams TO service_role;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, student_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_members TO authenticated;
GRANT ALL ON public.team_members TO service_role;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.content_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type text NOT NULL,
  content_id uuid NOT NULL,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  shared_by uuid NOT NULL,
  shared_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_shares TO authenticated;
GRANT ALL ON public.content_shares TO service_role;
ALTER TABLE public.content_shares ENABLE ROW LEVEL SECURITY;

-- helper: is the current user a member of this team
CREATE OR REPLACE FUNCTION public.is_team_member(_team_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.team_id = _team_id AND tm.student_id = _user_id);
$$;

CREATE OR REPLACE FUNCTION public.is_team_owner(_team_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.teams t WHERE t.id = _team_id AND t.teacher_id = _user_id);
$$;

-- POLICIES: teams
CREATE POLICY "teams teacher manage" ON public.teams FOR ALL TO authenticated
  USING (auth.uid() = teacher_id) WITH CHECK (auth.uid() = teacher_id);
CREATE POLICY "teams member read" ON public.teams FOR SELECT TO authenticated
  USING (public.is_team_member(id, auth.uid()));

-- POLICIES: team_members
CREATE POLICY "members self manage" ON public.team_members FOR ALL TO authenticated
  USING (auth.uid() = student_id) WITH CHECK (auth.uid() = student_id);
CREATE POLICY "members teacher read" ON public.team_members FOR SELECT TO authenticated
  USING (public.is_team_owner(team_id, auth.uid()));
CREATE POLICY "members teacher remove" ON public.team_members FOR DELETE TO authenticated
  USING (public.is_team_owner(team_id, auth.uid()));

-- POLICIES: content_shares
CREATE POLICY "shares teacher manage" ON public.content_shares FOR ALL TO authenticated
  USING (public.is_team_owner(team_id, auth.uid())) WITH CHECK (public.is_team_owner(team_id, auth.uid()));
CREATE POLICY "shares member read" ON public.content_shares FOR SELECT TO authenticated
  USING (public.is_team_member(team_id, auth.uid()));

-- team analytics: teacher can read attempts of their team students
CREATE POLICY "attempts teacher read team students" ON public.quiz_attempts FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.team_members tm
    JOIN public.teams t ON t.id = tm.team_id
    WHERE t.teacher_id = auth.uid() AND tm.student_id = quiz_attempts.student_id
  ));

-- students can read quizzes/content shared to their teams (already broad read-all-authenticated policies exist)

-- OWNER user management on profiles
CREATE POLICY "owner reads all profiles" ON public.profiles FOR SELECT TO authenticated
  USING ((auth.jwt() ->> 'email') = 'shreshthahlawat2012@gmail.com');
CREATE POLICY "owner updates all profiles" ON public.profiles FOR UPDATE TO authenticated
  USING ((auth.jwt() ->> 'email') = 'shreshthahlawat2012@gmail.com')
  WITH CHECK ((auth.jwt() ->> 'email') = 'shreshthahlawat2012@gmail.com');

-- join by code (security definer so students can find the team without broad read access)
CREATE OR REPLACE FUNCTION public.join_team_by_code(_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t public.teams%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sign in required');
  END IF;
  SELECT * INTO t FROM public.teams WHERE join_code = upper(trim(_code));
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid join code');
  END IF;
  IF t.teacher_id = auth.uid() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'You own this team');
  END IF;
  INSERT INTO public.team_members (team_id, student_id) VALUES (t.id, auth.uid())
    ON CONFLICT (team_id, student_id) DO NOTHING;
  RETURN jsonb_build_object('ok', true, 'team_id', t.id, 'name', t.name);
END;
$$;

CREATE TRIGGER teams_touch BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.tc_touch_updated_at();