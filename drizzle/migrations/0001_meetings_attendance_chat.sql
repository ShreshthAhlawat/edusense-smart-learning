-- LIVE CLASSES: meetings, attendance, meeting chat
CREATE TABLE public.meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  host_id uuid NOT NULL,
  title text NOT NULL,
  subject text,
  room_code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'live',
  scheduled_at timestamptz,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  summary text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meetings TO authenticated;
GRANT ALL ON public.meetings TO service_role;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.meeting_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  display_name text NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  left_at timestamptz,
  duration_seconds integer NOT NULL DEFAULT 0
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meeting_attendance TO authenticated;
GRANT ALL ON public.meeting_attendance TO service_role;
ALTER TABLE public.meeting_attendance ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.meeting_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  author_name text NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meeting_messages TO authenticated;
GRANT ALL ON public.meeting_messages TO service_role;
ALTER TABLE public.meeting_messages ENABLE ROW LEVEL SECURITY;

-- POLICIES: meetings — the team owner manages, team members read
CREATE POLICY "meetings host manage" ON public.meetings FOR ALL TO authenticated
  USING (public.is_team_owner(team_id, auth.uid()))
  WITH CHECK (public.is_team_owner(team_id, auth.uid()));
CREATE POLICY "meetings member read" ON public.meetings FOR SELECT TO authenticated
  USING (public.is_team_member(team_id, auth.uid()) OR public.is_team_owner(team_id, auth.uid()));

-- POLICIES: attendance — you record yourself; you can read your own rows or rows of a meeting you can see
CREATE POLICY "attendance self insert" ON public.meeting_attendance FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.meetings m
      WHERE m.id = meeting_id
        AND (public.is_team_owner(m.team_id, auth.uid()) OR public.is_team_member(m.team_id, auth.uid()))
    )
  );
CREATE POLICY "attendance self update" ON public.meeting_attendance FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "attendance read" ON public.meeting_attendance FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.meetings m
      WHERE m.id = meeting_id
        AND (public.is_team_owner(m.team_id, auth.uid()) OR public.is_team_member(m.team_id, auth.uid()))
    )
  );

-- POLICIES: meeting chat — members of the meeting's team can read and post
CREATE POLICY "messages member post" ON public.meeting_messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.meetings m
      WHERE m.id = meeting_id
        AND (public.is_team_owner(m.team_id, auth.uid()) OR public.is_team_member(m.team_id, auth.uid()))
    )
  );
CREATE POLICY "messages member read" ON public.meeting_messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.meetings m
      WHERE m.id = meeting_id
        AND (public.is_team_owner(m.team_id, auth.uid()) OR public.is_team_member(m.team_id, auth.uid()))
    )
  );
