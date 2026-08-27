ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS branch text NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS public.attendance_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  work_date date NOT NULL,
  login_time timestamptz NOT NULL DEFAULT now(),
  logout_time timestamptz,
  duration_minutes integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_sessions TO authenticated;
GRANT ALL ON public.attendance_sessions TO service_role;

ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own sessions read" ON public.attendance_sessions FOR SELECT TO authenticated USING (staff_id = auth.uid());
CREATE POLICY "own sessions insert" ON public.attendance_sessions FOR INSERT TO authenticated WITH CHECK (staff_id = auth.uid());
CREATE POLICY "own sessions update" ON public.attendance_sessions FOR UPDATE TO authenticated USING (staff_id = auth.uid()) WITH CHECK (staff_id = auth.uid());
CREATE POLICY "managers sessions read" ON public.attendance_sessions FOR SELECT TO authenticated USING (public.is_manager(auth.uid()));
CREATE POLICY "super sessions delete" ON public.attendance_sessions FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

CREATE INDEX IF NOT EXISTS attendance_sessions_staff_date_idx ON public.attendance_sessions (staff_id, work_date);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER update_attendance_sessions_updated_at
BEFORE UPDATE ON public.attendance_sessions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();