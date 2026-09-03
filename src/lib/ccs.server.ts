import type { SupabaseClient } from "@supabase/supabase-js";
import {
  calculateSalary,
  daysInMonth,
  todayIST,
  type SalarySettings,
  type SalaryResult,
} from "./salary";

type DB = SupabaseClient<any, any, any>;

export type Role = "staff" | "admin" | "super_admin";

export async function getRole(supabase: DB, userId: string): Promise<Role> {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  const roles = (data ?? []).map((r: { role: Role }) => r.role);
  if (roles.includes("super_admin")) return "super_admin";
  if (roles.includes("admin")) return "admin";
  return "staff";
}

export async function requireManager(supabase: DB, userId: string): Promise<Role> {
  const role = await getRole(supabase, userId);
  if (role === "staff") throw new Error("You are not allowed to access this information.");
  return role;
}

export async function requireSuper(supabase: DB, userId: string): Promise<Role> {
  const role = await getRole(supabase, userId);
  if (role !== "super_admin") throw new Error("Only the Super Admin can perform this action.");
  return role;
}

export async function getSettings(supabase: DB): Promise<SalarySettings> {
  const { data } = await supabase.from("salary_settings").select("*").eq("id", 1).maybeSingle();
  return (
    (data as SalarySettings) ?? {
      cycle_days: 30,
      paid_leave_days: 1,
      half_day_leave_value: 0.5,
      office_start_time: "09:00",
      late_grace_minutes: 0,
      full_day_minutes: 480,
    }
  );
}

export function monthRange(month: string) {
  const start = `${month}-01`;
  const end = `${month}-${String(daysInMonth(month)).padStart(2, "0")}`;
  return { start, end };
}

export type AttendanceRow = {
  id: string;
  staff_id: string;
  work_date: string;
  login_time: string | null;
  logout_time: string | null;
  working_minutes: number;
  status: "present" | "half_day" | "leave" | "absent" | "permission" | "holiday" | "week_off";
  late_minutes: number;
  half_day: boolean;
  note: string | null;
};

export type LeaveRow = {
  id: string;
  staff_id: string;
  leave_date: string;
  leave_days: number;
  leave_type: string;
  approval_status: string;
  reason: string | null;
};

export type AttendanceSummary = {
  totalWorkingDays: number;
  presentDays: number;
  halfDays: number;
  leaveDays: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  absentDays: number;
  permissionDays: number;
  holidayDays: number;
  weekOffDays: number;
  lateDays: number;
  lateMinutes: number;
  averageLateMinutes: number;
  workingMinutes: number;
  attendancePercent: number;
};


export function summarize(
  month: string,
  attendance: AttendanceRow[],
  leaves: LeaveRow[],
  settings: SalarySettings,
): AttendanceSummary {
  const today = todayIST();
  const isCurrent = today.slice(0, 7) === month;
  const totalWorkingDays = isCurrent ? Number(today.slice(8)) : daysInMonth(month);

  const presentDays = attendance.filter((a) => a.status === "present").length;
  const halfDays = attendance.filter((a) => a.status === "half_day").length;
  const absentDays = attendance.filter((a) => a.status === "absent").length;
  const leaveDays = Number(
    leaves.reduce((s, l) => s + Number(l.leave_days || 0), 0).toFixed(2),
  );
  const paidLeaveDays = Math.min(leaveDays, settings.paid_leave_days);
  const unpaidLeaveDays = Number(Math.max(0, leaveDays - paidLeaveDays).toFixed(2));
  const lateRows = attendance.filter((a) => (a.late_minutes || 0) > 0);
  const lateMinutes = lateRows.reduce((s, a) => s + (a.late_minutes || 0), 0);
  const workingMinutes = attendance.reduce((s, a) => s + (a.working_minutes || 0), 0);
  const credited = presentDays + halfDays * 0.5;

  return {
    totalWorkingDays,
    presentDays,
    halfDays,
    leaveDays,
    paidLeaveDays,
    unpaidLeaveDays,
    absentDays,
    permissionDays: attendance.filter((a) => a.status === "permission").length,
    holidayDays: attendance.filter((a) => a.status === "holiday").length,
    weekOffDays: attendance.filter((a) => a.status === "week_off").length,

    lateDays: lateRows.length,
    lateMinutes,
    averageLateMinutes: lateRows.length ? Math.round(lateMinutes / lateRows.length) : 0,
    workingMinutes,
    attendancePercent: totalWorkingDays
      ? Number(((credited / totalWorkingDays) * 100).toFixed(1))
      : 0,
  };
}

/**
 * Salary that applies to a given month: the most recent salary-history entry
 * whose effective month is on or before it. Falls back to the current amount
 * stored on staff_salary when no history exists.
 */
export async function salaryForMonth(
  supabase: DB,
  staffId: string,
  month: string,
): Promise<number> {
  const { data: history } = await supabase
    .from("salary_history")
    .select("monthly_salary, effective_month")
    .eq("staff_id", staffId)
    .lte("effective_month", month)
    .order("effective_month", { ascending: false })
    .limit(1);
  if (history && history.length > 0) return Number(history[0]!.monthly_salary ?? 0);

  const { data: current } = await supabase
    .from("staff_salary")
    .select("monthly_salary")
    .eq("staff_id", staffId)
    .maybeSingle();
  return Number(current?.monthly_salary ?? 0);
}

export async function computeSalaryFor(
  supabase: DB,
  staffId: string,
  month: string,
  settings: SalarySettings,
  summary: AttendanceSummary,
): Promise<SalaryResult> {
  const [monthlySalary, { data: incentives }, { data: exceptions }] = await Promise.all([
    salaryForMonth(supabase, staffId, month),
    supabase.from("incentives").select("amount").eq("staff_id", staffId).eq("month", month),
    supabase
      .from("exceptions")
      .select("waived_days, waived_amount")
      .eq("staff_id", staffId)
      .eq("month", month),
  ]);


  const result = calculateSalary({
    monthlySalary,
    settings,
    leaveDays: summary.leaveDays,
    halfDays: summary.halfDays,
    waivedDays: (exceptions ?? []).reduce(
      (s: number, e: { waived_days: number }) => s + Number(e.waived_days || 0),
      0,
    ),
    waivedAmount: (exceptions ?? []).reduce(
      (s: number, e: { waived_amount: number }) => s + Number(e.waived_amount || 0),
      0,
    ),
    incentive: (incentives ?? []).reduce(
      (s: number, i: { amount: number }) => s + Number(i.amount || 0),
      0,
    ),
  });

  // Persist the calculated result so frontend and backend always agree.
  await supabase.from("salary_records").upsert(
    {
      staff_id: staffId,
      month,
      monthly_salary: result.monthlySalary,
      salary_days: result.salaryDays,
      daily_salary: result.dailySalary,
      total_leave: result.totalLeave,
      paid_leave: result.paidLeave,
      waived_leave: result.waivedLeave,
      deductible_leave: result.deductibleLeave,
      salary_deduction: result.salaryDeduction,
      incentive: result.incentive,
      final_salary: result.finalSalary,
      calculated_at: new Date().toISOString(),
    },
    { onConflict: "staff_id,month" },
  );

  return result;
}

export async function logAudit(
  supabase: DB,
  actorId: string,
  action: string,
  entity: string,
  entityId: string | null,
  oldValue: unknown,
  newValue: unknown,
) {
  const [{ data: profile }, role] = await Promise.all([
    supabase.from("profiles").select("name").eq("id", actorId).maybeSingle(),
    getRole(supabase, actorId),
  ]);
  await supabase.from("audit_logs").insert({
    actor_id: actorId,
    actor_name: profile?.name ?? "Unknown",
    actor_role: role,
    action,
    entity,
    entity_id: entityId,
    old_value: oldValue ? JSON.parse(JSON.stringify(oldValue)) : null,
    new_value: newValue ? JSON.parse(JSON.stringify(newValue)) : null,
  });
}

export const emailFor = (userId: string) => `${userId.trim().toLowerCase()}@ccs.local`;

/* ------------------------------------------------------------------ */
/* Attendance timing overrides (Super Admin)                           */
/* ------------------------------------------------------------------ */

export type TimingOverrideRow = {
  id: string;
  staff_id: string | null;
  from_date: string;
  to_date: string;
  login_time: string;
  logout_time: string;
  active: boolean;
  note: string | null;
  created_by: string | null;
  created_at: string;
};

export type ResolvedTiming = {
  start: string;
  end: string;
  source: "date_override" | "range_override" | "default";
  overrideId: string | null;
};

/**
 * Working timing that applies to one employee on one date.
 * Priority: date-specific override → date-range override → default timing
 * (the employee's official times, else the global salary settings).
 * Employee-specific overrides always beat all-employee overrides.
 */
export async function timingForDate(
  supabase: DB,
  staffId: string,
  date: string,
  fallback?: { start?: string | null; end?: string | null },
): Promise<ResolvedTiming> {
  const settings = await getSettings(supabase);
  const defaults: ResolvedTiming = {
    start: fallback?.start || settings.office_start_time || "09:00",
    end: fallback?.end || "19:00",
    source: "default",
    overrideId: null,
  };

  const { data } = await supabase
    .from("attendance_timing_overrides")
    .select("id, staff_id, from_date, to_date, login_time, logout_time, active")
    .eq("active", true)
    .lte("from_date", date)
    .gte("to_date", date);

  const rows = ((data ?? []) as TimingOverrideRow[]).filter(
    (r) => r.staff_id === staffId || r.staff_id === null,
  );
  if (rows.length === 0) return defaults;

  const score = (r: TimingOverrideRow) =>
    (r.from_date === r.to_date ? 2 : 0) + (r.staff_id ? 1 : 0);
  const best = rows.sort((a, b) => {
    const diff = score(b) - score(a);
    if (diff !== 0) return diff;
    return b.from_date.localeCompare(a.from_date);
  })[0]!;

  return {
    start: best.login_time,
    end: best.logout_time,
    source: best.from_date === best.to_date ? "date_override" : "range_override",
    overrideId: best.id,
  };
}
