CREATE TABLE public.team_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  author_name text NOT NULL DEFAULT 'Member',
  parent_id uuid REFERENCES public.team_messages(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_messages TO authenticated;
GRANT ALL ON public.team_messages TO service_role;

ALTER TABLE public.team_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team messages read" ON public.team_messages
  FOR SELECT TO authenticated
  USING (public.is_team_member(team_id, auth.uid()) OR public.is_team_owner(team_id, auth.uid()));

CREATE POLICY "team messages insert" ON public.team_messages
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND (public.is_team_member(team_id, auth.uid()) OR public.is_team_owner(team_id, auth.uid())));

CREATE POLICY "team messages delete" ON public.team_messages
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_team_owner(team_id, auth.uid()));

CREATE INDEX team_messages_team_created_idx ON public.team_messages (team_id, created_at DESC);

CREATE TABLE public.notification_state (
  user_id uuid PRIMARY KEY,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.notification_state TO authenticated;
GRANT ALL ON public.notification_state TO service_role;

ALTER TABLE public.notification_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notification state self" ON public.notification_state
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER notification_state_touch
  BEFORE UPDATE ON public.notification_state
  FOR EACH ROW EXECUTE FUNCTION public.tc_touch_updated_at();