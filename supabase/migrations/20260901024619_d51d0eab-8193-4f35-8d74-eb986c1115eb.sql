REVOKE EXECUTE ON FUNCTION public.redeem_school_code(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.redeem_school_code(text) TO authenticated;