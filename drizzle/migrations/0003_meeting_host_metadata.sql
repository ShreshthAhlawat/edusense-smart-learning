ALTER TABLE public.meetings ADD COLUMN host_name text;
ALTER TABLE public.meetings ADD COLUMN kind text NOT NULL DEFAULT 'class';
UPDATE public.meetings m
SET host_name = COALESCE((SELECT p.username FROM public.profiles p WHERE p.id = m.host_id), 'Host')
WHERE m.host_name IS NULL;
COMMENT ON COLUMN public.meetings.kind IS 'class = teacher-led live class; study_group = student-hosted study group';
COMMENT ON COLUMN public.meetings.host_name IS 'Denormalized display name of the host, captured at creation';