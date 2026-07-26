
CREATE TABLE public.teacher_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  topic TEXT NOT NULL,
  class_level TEXT,
  language TEXT DEFAULT 'English',
  content_markdown TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.teacher_content TO authenticated;
GRANT ALL ON public.teacher_content TO service_role;

ALTER TABLE public.teacher_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "content teacher manage" ON public.teacher_content
  FOR ALL USING (auth.uid() = teacher_id) WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "content read all authenticated" ON public.teacher_content
  FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.tc_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER tc_updated_at BEFORE UPDATE ON public.teacher_content
  FOR EACH ROW EXECUTE FUNCTION public.tc_touch_updated_at();
