ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS work_type text NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS public.salary_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  effective_month text NOT NULL,
  monthly_salary numeric NOT NULL DEFAULT 0,
  note text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (staff_id, effective_month)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.salary_history TO authenticated;
GRANT ALL ON public.salary_history TO service_role;

ALTER TABLE public.salary_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "managers salary history read" ON public.salary_history
  FOR SELECT TO authenticated USING (is_manager(auth.uid()));

CREATE POLICY "super salary history write" ON public.salary_history
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

INSERT INTO public.salary_history (staff_id, effective_month, monthly_salary, note)
SELECT s.staff_id, to_char(p.joining_date, 'YYYY-MM'), s.monthly_salary, 'Initial salary'
FROM public.staff_salary s
JOIN public.profiles p ON p.id = s.staff_id
ON CONFLICT (staff_id, effective_month) DO NOTHING;