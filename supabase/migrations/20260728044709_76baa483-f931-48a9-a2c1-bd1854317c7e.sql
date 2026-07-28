
-- Replace the always-true INSERT policy with a lightweight non-empty check
DROP POLICY IF EXISTS "anyone can submit school request" ON public.school_requests;

CREATE POLICY "anyone can submit valid school request"
  ON public.school_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    length(coalesce(school_name, '')) > 1
    AND length(coalesce(contact_person, '')) > 1
    AND contact_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  );

-- Restrict redeem_school_code to authenticated only (the function itself checks auth.uid() but revoking anon is cleaner)
REVOKE ALL ON FUNCTION public.redeem_school_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_school_code(text) TO authenticated;
