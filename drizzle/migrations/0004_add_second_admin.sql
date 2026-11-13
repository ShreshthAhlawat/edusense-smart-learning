DO $$
DECLARE r record; def text;
BEGIN
  FOR r IN SELECT p.oid FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
           WHERE n.nspname='public' AND p.prosrc LIKE '%shreshthahlawat2012@gmail.com%' LOOP
    def := pg_get_functiondef(r.oid);
    def := replace(def, '= ''shreshthahlawat2012@gmail.com''', 'IN (''shreshthahlawat2012@gmail.com'',''admin23@gmail.com'')');
    EXECUTE def;
  END LOOP;
END $$;

ALTER POLICY "owner email manages licenses" ON public.school_licenses
  USING ((auth.jwt() ->> 'email') IN ('shreshthahlawat2012@gmail.com','admin23@gmail.com'))
  WITH CHECK ((auth.jwt() ->> 'email') IN ('shreshthahlawat2012@gmail.com','admin23@gmail.com'));
ALTER POLICY "owner reads school requests" ON public.school_requests
  USING ((auth.jwt() ->> 'email') IN ('shreshthahlawat2012@gmail.com','admin23@gmail.com'));
ALTER POLICY "owner updates school requests" ON public.school_requests
  USING ((auth.jwt() ->> 'email') IN ('shreshthahlawat2012@gmail.com','admin23@gmail.com'))
  WITH CHECK ((auth.jwt() ->> 'email') IN ('shreshthahlawat2012@gmail.com','admin23@gmail.com'));
ALTER POLICY "usage owner read" ON public.usage_sessions
  USING ((auth.jwt() ->> 'email') IN ('shreshthahlawat2012@gmail.com','admin23@gmail.com'));
ALTER POLICY "owner reads all profiles" ON public.profiles
  USING ((auth.jwt() ->> 'email') IN ('shreshthahlawat2012@gmail.com','admin23@gmail.com'));
ALTER POLICY "owner updates all profiles" ON public.profiles
  USING ((auth.jwt() ->> 'email') IN ('shreshthahlawat2012@gmail.com','admin23@gmail.com'))
  WITH CHECK ((auth.jwt() ->> 'email') IN ('shreshthahlawat2012@gmail.com','admin23@gmail.com'));
ALTER POLICY "own or owner read" ON public.role_change_requests
  USING (user_id = auth.uid() OR (auth.jwt() ->> 'email') IN ('shreshthahlawat2012@gmail.com','admin23@gmail.com'));