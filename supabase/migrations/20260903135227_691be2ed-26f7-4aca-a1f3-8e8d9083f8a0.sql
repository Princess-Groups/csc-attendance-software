CREATE TABLE public.attendance_timing_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  from_date date NOT NULL,
  to_date date NOT NULL,
  login_time text NOT NULL,
  logout_time text NOT NULL,
  note text,
  active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_range CHECK (to_date >= from_date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_timing_overrides TO authenticated;
GRANT ALL ON public.attendance_timing_overrides TO service_role;

ALTER TABLE public.attendance_timing_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "managers read overrides" ON public.attendance_timing_overrides
  FOR SELECT TO authenticated USING (public.is_manager(auth.uid()));

CREATE POLICY "own overrides read" ON public.attendance_timing_overrides
  FOR SELECT TO authenticated USING (staff_id = auth.uid() OR staff_id IS NULL);

CREATE POLICY "super overrides write" ON public.attendance_timing_overrides
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE INDEX idx_timing_overrides_dates ON public.attendance_timing_overrides (from_date, to_date);

CREATE TRIGGER update_attendance_timing_overrides_updated_at
  BEFORE UPDATE ON public.attendance_timing_overrides
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();