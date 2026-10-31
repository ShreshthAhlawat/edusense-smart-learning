-- STUDY GROUPS: any team member can host a meeting; hosts manage their own meetings.
DROP POLICY "meetings host manage" ON public.meetings;

CREATE POLICY "meetings member host insert" ON public.meetings FOR INSERT TO authenticated
  WITH CHECK (
    host_id = auth.uid()
    AND (public.is_team_owner(team_id, auth.uid()) OR public.is_team_member(team_id, auth.uid()))
  );

CREATE POLICY "meetings host update" ON public.meetings FOR UPDATE TO authenticated
  USING (host_id = auth.uid() OR public.is_team_owner(team_id, auth.uid()))
  WITH CHECK (host_id = auth.uid() OR public.is_team_owner(team_id, auth.uid()));

CREATE POLICY "meetings host delete" ON public.meetings FOR DELETE TO authenticated
  USING (host_id = auth.uid() OR public.is_team_owner(team_id, auth.uid()));

COMMENT ON TABLE public.meetings IS 'Team live classes and student study groups; host_id may be any team member.';