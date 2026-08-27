
CREATE TYPE public.app_role AS ENUM ('staff','admin','super_admin');
CREATE TYPE public.attendance_status AS ENUM ('present','half_day','leave','absent');

-- profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  staff_code text NOT NULL UNIQUE,
  user_id text NOT NULL UNIQUE,
  designation text NOT NULL DEFAULT 'Staff',
  joining_date date NOT NULL DEFAULT current_date,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_manager(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','super_admin'));
$$;

CREATE POLICY "own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "managers read profiles" ON public.profiles FOR SELECT TO authenticated USING (public.is_manager(auth.uid()));
CREATE POLICY "managers insert profiles" ON public.profiles FOR INSERT TO authenticated WITH CHECK (public.is_manager(auth.uid()));
CREATE POLICY "managers update profiles" ON public.profiles FOR UPDATE TO authenticated USING (public.is_manager(auth.uid())) WITH CHECK (public.is_manager(auth.uid()));
CREATE POLICY "super delete profiles" ON public.profiles FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'super_admin'));

CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_manager(auth.uid()));

-- salary details (hidden from staff)
CREATE TABLE public.staff_salary (
  staff_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  monthly_salary numeric(12,2) NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_salary TO authenticated;
GRANT ALL ON public.staff_salary TO service_role;
ALTER TABLE public.staff_salary ENABLE ROW LEVEL SECURITY;
CREATE POLICY "managers read salary" ON public.staff_salary FOR SELECT TO authenticated USING (public.is_manager(auth.uid()));
CREATE POLICY "super write salary" ON public.staff_salary FOR ALL TO authenticated USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));

-- attendance
CREATE TABLE public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  work_date date NOT NULL,
  login_time timestamptz,
  logout_time timestamptz,
  working_minutes integer NOT NULL DEFAULT 0,
  status public.attendance_status NOT NULL DEFAULT 'present',
  late_minutes integer NOT NULL DEFAULT 0,
  half_day boolean NOT NULL DEFAULT false,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (staff_id, work_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance TO authenticated;
GRANT ALL ON public.attendance TO service_role;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own attendance read" ON public.attendance FOR SELECT TO authenticated USING (staff_id = auth.uid());
CREATE POLICY "managers attendance read" ON public.attendance FOR SELECT TO authenticated USING (public.is_manager(auth.uid()));
CREATE POLICY "own attendance insert" ON public.attendance FOR INSERT TO authenticated WITH CHECK (staff_id = auth.uid());
CREATE POLICY "own attendance update" ON public.attendance FOR UPDATE TO authenticated USING (staff_id = auth.uid()) WITH CHECK (staff_id = auth.uid());
CREATE POLICY "managers attendance write" ON public.attendance FOR INSERT TO authenticated WITH CHECK (public.is_manager(auth.uid()));
CREATE POLICY "managers attendance edit" ON public.attendance FOR UPDATE TO authenticated USING (public.is_manager(auth.uid())) WITH CHECK (public.is_manager(auth.uid()));
CREATE POLICY "super attendance delete" ON public.attendance FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'super_admin'));

-- leave
CREATE TABLE public.leaves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  leave_date date NOT NULL,
  leave_days numeric(4,2) NOT NULL DEFAULT 1 CHECK (leave_days > 0 AND leave_days <= 1),
  leave_type text NOT NULL DEFAULT 'casual',
  approval_status text NOT NULL DEFAULT 'approved',
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (staff_id, leave_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leaves TO authenticated;
GRANT ALL ON public.leaves TO service_role;
ALTER TABLE public.leaves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own leaves read" ON public.leaves FOR SELECT TO authenticated USING (staff_id = auth.uid());
CREATE POLICY "managers leaves read" ON public.leaves FOR SELECT TO authenticated USING (public.is_manager(auth.uid()));
CREATE POLICY "managers leaves write" ON public.leaves FOR INSERT TO authenticated WITH CHECK (public.is_manager(auth.uid()));
CREATE POLICY "managers leaves edit" ON public.leaves FOR UPDATE TO authenticated USING (public.is_manager(auth.uid())) WITH CHECK (public.is_manager(auth.uid()));
CREATE POLICY "super leaves delete" ON public.leaves FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'super_admin'));

-- incentives
CREATE TABLE public.incentives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  month text NOT NULL,
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  reason text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.incentives TO authenticated;
GRANT ALL ON public.incentives TO service_role;
ALTER TABLE public.incentives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "managers incentives read" ON public.incentives FOR SELECT TO authenticated USING (public.is_manager(auth.uid()));
CREATE POLICY "super incentives write" ON public.incentives FOR ALL TO authenticated USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));

-- exceptions / waivers
CREATE TABLE public.exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  month text NOT NULL,
  exception_type text NOT NULL DEFAULT 'leave_waiver',
  waived_days numeric(4,2) NOT NULL DEFAULT 0 CHECK (waived_days >= 0),
  waived_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (waived_amount >= 0),
  reason text,
  approved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exceptions TO authenticated;
GRANT ALL ON public.exceptions TO service_role;
ALTER TABLE public.exceptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "managers exceptions read" ON public.exceptions FOR SELECT TO authenticated USING (public.is_manager(auth.uid()));
CREATE POLICY "super exceptions write" ON public.exceptions FOR ALL TO authenticated USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));

-- settings
CREATE TABLE public.salary_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  cycle_days integer NOT NULL DEFAULT 30 CHECK (cycle_days > 0),
  paid_leave_days numeric(4,2) NOT NULL DEFAULT 1 CHECK (paid_leave_days >= 0),
  half_day_leave_value numeric(4,2) NOT NULL DEFAULT 0.5,
  office_start_time text NOT NULL DEFAULT '09:00',
  late_grace_minutes integer NOT NULL DEFAULT 0,
  full_day_minutes integer NOT NULL DEFAULT 480,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.salary_settings TO authenticated;
GRANT ALL ON public.salary_settings TO service_role;
ALTER TABLE public.salary_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "everyone reads settings" ON public.salary_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "super updates settings" ON public.salary_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));
INSERT INTO public.salary_settings (id) VALUES (1);

-- salary results
CREATE TABLE public.salary_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  month text NOT NULL,
  monthly_salary numeric(12,2) NOT NULL DEFAULT 0,
  salary_days integer NOT NULL DEFAULT 30,
  daily_salary numeric(12,2) NOT NULL DEFAULT 0,
  total_leave numeric(6,2) NOT NULL DEFAULT 0,
  paid_leave numeric(6,2) NOT NULL DEFAULT 0,
  waived_leave numeric(6,2) NOT NULL DEFAULT 0,
  deductible_leave numeric(6,2) NOT NULL DEFAULT 0,
  salary_deduction numeric(12,2) NOT NULL DEFAULT 0,
  incentive numeric(12,2) NOT NULL DEFAULT 0,
  final_salary numeric(12,2) NOT NULL DEFAULT 0,
  calculated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (staff_id, month)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.salary_records TO authenticated;
GRANT ALL ON public.salary_records TO service_role;
ALTER TABLE public.salary_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "managers salary read" ON public.salary_records FOR SELECT TO authenticated USING (public.is_manager(auth.uid()));
CREATE POLICY "super salary write" ON public.salary_records FOR ALL TO authenticated USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));

-- audit log
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  actor_name text,
  actor_role text,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id text,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "managers audit read" ON public.audit_logs FOR SELECT TO authenticated USING (public.is_manager(auth.uid()));
CREATE POLICY "managers audit insert" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (public.is_manager(auth.uid()));
