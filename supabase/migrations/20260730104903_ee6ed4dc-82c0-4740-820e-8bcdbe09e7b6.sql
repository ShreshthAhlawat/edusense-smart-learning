REVOKE EXECUTE ON FUNCTION public.is_team_member(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_team_owner(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.join_team_by_code(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.join_team_by_code(text) TO authenticated;