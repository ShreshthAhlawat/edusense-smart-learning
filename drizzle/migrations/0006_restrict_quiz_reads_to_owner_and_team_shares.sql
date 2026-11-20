DROP POLICY IF EXISTS "quizzes read all authenticated" ON public.quizzes;

CREATE POLICY "quiz owner or shared team member read"
  ON public.quizzes
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = teacher_id
    OR EXISTS (
      SELECT 1
      FROM public.content_shares AS share
      JOIN public.team_members AS member ON member.team_id = share.team_id
      WHERE share.content_type = 'quiz'
        AND share.content_id = quizzes.id
        AND member.student_id = auth.uid()
    )
  );