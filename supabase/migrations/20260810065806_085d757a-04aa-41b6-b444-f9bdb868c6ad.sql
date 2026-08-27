ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS department text NOT NULL DEFAULT 'Other',
  ADD COLUMN IF NOT EXISTS mobile text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS shift text NOT NULL DEFAULT 'General',
  ADD COLUMN IF NOT EXISTS official_start_time text,
  ADD COLUMN IF NOT EXISTS official_end_time text;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_user_id_key ON public.profiles (lower(user_id));
CREATE UNIQUE INDEX IF NOT EXISTS attendance_staff_date_key ON public.attendance (staff_id, work_date);
CREATE UNIQUE INDEX IF NOT EXISTS leaves_staff_date_key ON public.leaves (staff_id, leave_date);

ALTER TYPE public.attendance_status ADD VALUE IF NOT EXISTS 'permission';
ALTER TYPE public.attendance_status ADD VALUE IF NOT EXISTS 'holiday';
ALTER TYPE public.attendance_status ADD VALUE IF NOT EXISTS 'week_off';