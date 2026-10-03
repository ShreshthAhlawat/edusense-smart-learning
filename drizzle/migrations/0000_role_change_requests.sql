CREATE TABLE public.role_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text,
  username text,
  from_role text,
  requested_role public.user_role NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz
);
GRANT SELECT, INSERT ON public.role_change_requests TO authenticated;
GRANT ALL ON public.role_change_requests TO service_role;
ALTER TABLE public.role_change_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own or owner read" ON public.role_change_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR (auth.jwt() ->> 'email') = 'shreshthahlawat2012@gmail.com');
CREATE POLICY "insert own pending" ON public.role_change_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'pending');

CREATE OR REPLACE FUNCTION public.decide_role_request(_id uuid, _decision text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.role_change_requests%ROWTYPE;
BEGIN
  IF (auth.jwt() ->> 'email') IS DISTINCT FROM 'shreshthahlawat2012@gmail.com' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not allowed');
  END IF;
  IF _decision NOT IN ('approved','denied','ignored') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Bad decision');
  END IF;
  SELECT * INTO r FROM public.role_change_requests WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'Not found'); END IF;
  IF _decision = 'approved' THEN
    UPDATE public.profiles SET role = r.requested_role WHERE id = r.user_id;
  END IF;
  UPDATE public.role_change_requests SET status = _decision, decided_at = now() WHERE id = _id;
  RETURN jsonb_build_object('ok', true);
END $$;
REVOKE EXECUTE ON FUNCTION public.decide_role_request(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.decide_role_request(uuid, text) TO authenticated;