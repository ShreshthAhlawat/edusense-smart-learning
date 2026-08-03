CREATE TABLE public.class_timetables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL,
  day_of_week text NOT NULL,
  period text NOT NULL,
  subject text NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  teacher_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_timetables TO authenticated;
GRANT ALL ON public.class_timetables TO service_role;
ALTER TABLE public.class_timetables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "timetable teacher manage" ON public.class_timetables
  FOR ALL TO authenticated
  USING (public.is_team_owner(team_id, auth.uid()))
  WITH CHECK (public.is_team_owner(team_id, auth.uid()) AND teacher_id = auth.uid());

CREATE POLICY "timetable member read" ON public.class_timetables
  FOR SELECT TO authenticated
  USING (public.is_team_member(team_id, auth.uid()));

CREATE TRIGGER class_timetables_touch BEFORE UPDATE ON public.class_timetables
  FOR EACH ROW EXECUTE FUNCTION public.tc_touch_updated_at();

CREATE INDEX class_timetables_team_idx ON public.class_timetables(team_id);

CREATE TABLE public.engagement_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL,
  subject text NOT NULL DEFAULT 'Unscheduled',
  session_date date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  started_at timestamptz NOT NULL,
  ended_at timestamptz NOT NULL,
  duration_seconds integer NOT NULL DEFAULT 0,
  students_present integer NOT NULL DEFAULT 0,
  max_students integer NOT NULL DEFAULT 0,
  expression_distribution jsonb NOT NULL DEFAULT '{}'::jsonb,
  engagement_score numeric NOT NULL DEFAULT 0,
  timeline jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.engagement_sessions TO authenticated;
GRANT ALL ON public.engagement_sessions TO service_role;
ALTER TABLE public.engagement_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sessions teacher manage" ON public.engagement_sessions
  FOR ALL TO authenticated
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid() AND public.is_team_owner(team_id, auth.uid()));

CREATE INDEX engagement_sessions_team_idx ON public.engagement_sessions(team_id);