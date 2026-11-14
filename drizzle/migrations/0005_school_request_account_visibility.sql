ALTER TABLE public.school_requests
  ADD COLUMN IF NOT EXISTS applicant_user_id uuid;

DROP POLICY IF EXISTS "anyone can submit school request" ON public.school_requests;
DROP POLICY IF EXISTS "anyone can submit valid school request" ON public.school_requests;

CREATE POLICY "guest can submit school request"
  ON public.school_requests
  FOR INSERT
  TO anon
  WITH CHECK (
    applicant_user_id IS NULL
    AND length(COALESCE(school_name, '')) > 1
    AND length(COALESCE(contact_person, '')) > 1
    AND contact_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  );

CREATE POLICY "signed-in user submits own school request"
  ON public.school_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    applicant_user_id = auth.uid()
    AND length(COALESCE(school_name, '')) > 1
    AND length(COALESCE(contact_person, '')) > 1
    AND contact_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  );

CREATE POLICY "applicant reads own school requests"
  ON public.school_requests
  FOR SELECT
  TO authenticated
  USING (applicant_user_id = auth.uid());

CREATE POLICY "applicant reads own school licenses"
  ON public.school_licenses
  FOR SELECT
  TO authenticated
  USING (
    request_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.school_requests AS request
      WHERE request.id = school_licenses.request_id
        AND request.applicant_user_id = auth.uid()
    )
  );