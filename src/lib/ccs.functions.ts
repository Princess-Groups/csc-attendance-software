import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { profileFields } from "./ccs-schemas";


/* ------------------------------------------------------------------ */
/* Bootstrap: creates the single Super Admin account on first use only  */
/* ------------------------------------------------------------------ */

export const bootstrapSystem = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { emailFor } = await import("./ccs.server");

  const userId = "superadmin";

  // Check if superadmin profile already exists
  const { data: existing } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) return { created: false as const };

  // Create the superadmin auth user
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: emailFor(userId),
    password: "Super@2026",
    email_confirm: true,
    user_metadata: { name: "Super Admin", user_id: userId },
  });
  if (error || !data.user) throw new Error(error?.message ?? "Could not create the account.");

  // Create the profile and role
  await supabaseAdmin.from("profiles").insert({
    id: data.user.id,
    name: "Super Admin",
    staff_code: "CSC-0001",
    user_id: userId,
    designation: "Super Admin",
    department: "Other",
    shift: "General",
    joining_date: new Date().toISOString().slice(0, 10),
  });
  await supabaseAdmin.from("user_roles").insert({ user_id: data.user.id, role: "super_admin" });

  return { created: true as const };
});


/* ------------------------------------------------------------------ */
/* Identity                                                            */
/* ------------------------------------------------------------------ */

export const getMe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getRole } = await import("./ccs.server");
    const { supabase, userId } = context;
    const { data: profile } = await supabase
      .from("profiles")
      .select(
        "id, name, staff_code, user_id, designation, department, branch, work_type, shift, mobile, email, official_start_time, official_end_time, joining_date, active",
      )

      .eq("id", userId)
      .maybeSingle();
    const role = await getRole(supabase, userId);
    return { profile, role };
  });

/* ------------------------------------------------------------------ */
/* Staff portal                                                        */
/* ------------------------------------------------------------------ */

export const getStaffDashboard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { month?: string }) => z.object({ month: z.string().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { getSettings, monthRange, summarize } = await import("./ccs.server");
    const { monthIST, todayIST } = await import("./salary");
    const { supabase, userId } = context;
    const month = data.month ?? monthIST();
    const { start, end } = monthRange(month);

    const settings = await getSettings(supabase);
    const [{ data: attendance }, { data: leaves }, { data: profile }] = await Promise.all([
      supabase
        .from("attendance")
        .select("*")
        .eq("staff_id", userId)
        .gte("work_date", start)
        .lte("work_date", end)
        .order("work_date"),
      supabase
        .from("leaves")
        .select("*")
        .eq("staff_id", userId)
        .gte("leave_date", start)
        .lte("leave_date", end)
        .order("leave_date"),
      supabase
        .from("profiles")
        .select(
          "id, name, staff_code, user_id, designation, department, branch, work_type, shift, official_start_time, official_end_time, joining_date",
        )

        .eq("id", userId)
        .maybeSingle(),
    ]);

    const rows = attendance ?? [];
    const today = todayIST();
    const { data: sessions } = await supabase
      .from("attendance_sessions")
      .select("id, work_date, login_time, logout_time, duration_minutes")
      .eq("staff_id", userId)
      .eq("work_date", today)
      .order("login_time", { ascending: false });

    return {
      month,
      today,
      profile,
      settings,
      attendance: rows,
      leaves: leaves ?? [],
      todaySessions: sessions ?? [],
      openSession: (sessions ?? []).some((s) => !s.logout_time),
      todayRecord: rows.find((r) => r.work_date === today) ?? null,
      summary: summarize(month, rows as never, (leaves ?? []) as never, settings),
    };

  });

export const clockIn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getSettings, timingForDate } = await import("./ccs.server");
    const { todayIST, lateMinutes } = await import("./salary");
    const { supabase, userId } = context;
    const work_date = todayIST();

    // Multiple sessions a day are allowed, but only one may be open at a time.
    const { data: open } = await supabase
      .from("attendance_sessions")
      .select("id")
      .eq("staff_id", userId)
      .is("logout_time", null)
      .maybeSingle();
    if (open) throw new Error("You are already logged in. Please log out first.");

    const settings = await getSettings(supabase);
    const { data: profile } = await supabase
      .from("profiles")
      .select("official_start_time, official_end_time, active")
      .eq("id", userId)
      .maybeSingle();
    if (profile && profile.active === false) {
      throw new Error("Your account is inactive. Please contact the Admin.");
    }
    const now = new Date().toISOString();

    const { data: existing } = await supabase
      .from("attendance")
      .select("id, login_time")
      .eq("staff_id", userId)
      .eq("work_date", work_date)
      .maybeSingle();

    const firstLogin = existing?.login_time ?? now;
    // Super Admin date/date-range timing overrides win over the default times.
    const timing = await timingForDate(supabase, userId, work_date, {
      start: profile?.official_start_time ?? null,
      end: profile?.official_end_time ?? null,
    });
    const late = lateMinutes(firstLogin, settings, timing.start);

    const { error: sessionError } = await supabase
      .from("attendance_sessions")
      .insert({ staff_id: userId, work_date, login_time: now });
    if (sessionError) throw new Error(sessionError.message);

    const payload = {
      staff_id: userId,
      work_date,
      login_time: firstLogin,
      logout_time: null,
      status: "present" as const,
      late_minutes: late,
    };
    const { error } = existing
      ? await supabase.from("attendance").update(payload).eq("id", existing.id)
      : await supabase.from("attendance").insert(payload);
    if (error) throw new Error(error.message);
    return { login_time: now, late_minutes: late };
  });

export const clockOut = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { todayIST } = await import("./salary");
    const { supabase, userId } = context;
    const work_date = todayIST();

    const { data: open } = await supabase
      .from("attendance_sessions")
      .select("id, work_date, login_time")
      .eq("staff_id", userId)
      .is("logout_time", null)
      .order("login_time", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!open) throw new Error("You cannot log out before logging in.");

    const now = new Date();
    const minutes = Math.max(
      0,
      Math.round((now.getTime() - new Date(open.login_time).getTime()) / 60000),
    );
    const { error: sessionError } = await supabase
      .from("attendance_sessions")
      .update({ logout_time: now.toISOString(), duration_minutes: minutes })
      .eq("id", open.id);
    if (sessionError) throw new Error(sessionError.message);

    // Day totals are the sum of every session on that date.
    const { data: sessions } = await supabase
      .from("attendance_sessions")
      .select("duration_minutes")
      .eq("staff_id", userId)
      .eq("work_date", open.work_date);
    const total = (sessions ?? []).reduce(
      (s: number, r: { duration_minutes: number }) => s + Number(r.duration_minutes || 0),
      0,
    );

    const { error } = await supabase
      .from("attendance")
      .update({ logout_time: now.toISOString(), working_minutes: total })
      .eq("staff_id", userId)
      .eq("work_date", open.work_date);
    if (error) throw new Error(error.message);
    return { logout_time: now.toISOString(), working_minutes: total, work_date };
  });

/**
 * Permanent login / logout history. Every session is stored separately and is
 * never overwritten. Super Admin only, with optional name, branch and date
 * range filters that combine freely.
 */
export const getActivityLog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { search?: string; branch?: string; from?: string; to?: string }) =>
    z
      .object({
        search: z.string().max(80).optional(),
        branch: z.string().max(40).optional(),
        from: z.string().max(10).optional(),
        to: z.string().max(10).optional(),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { requireSuper } = await import("./ccs.server");
    const { supabase, userId } = context;
    await requireSuper(supabase, userId);

    let query = supabase
      .from("attendance_sessions")
      .select("id, staff_id, work_date, login_time, logout_time, duration_minutes")
      .order("login_time", { ascending: false })
      .limit(1000);
    if (data.from) query = query.gte("work_date", data.from);
    if (data.to) query = query.lte("work_date", data.to);

    const [{ data: sessions }, { data: profiles }] = await Promise.all([
      query,
      supabase.from("profiles").select("id, name, staff_code, branch, department"),
    ]);

    const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
    const search = (data.search ?? "").trim().toLowerCase();

    const rows = (sessions ?? [])
      .map((s) => {
        const p = byId.get(s.staff_id);
        return {
          id: s.id,
          staffId: s.staff_id,
          name: p?.name ?? "Unknown",
          staffCode: p?.staff_code ?? "",
          branch: p?.branch ?? "",
          workDate: s.work_date,
          loginTime: s.login_time,
          logoutTime: s.logout_time,
          minutes: Number(s.duration_minutes || 0),
        };
      })
      .filter((r) => (search ? r.name.toLowerCase().includes(search) : true))
      .filter((r) => (data.branch && data.branch !== "all" ? r.branch === data.branch : true));

    return {
      rows,
      totals: {
        sessions: rows.length,
        minutes: rows.reduce((s, r) => s + r.minutes, 0),
        employees: new Set(rows.map((r) => r.staffId)).size,
      },
    };
  });


/* ------------------------------------------------------------------ */
/* Admin / Super Admin overview                                        */
/* ------------------------------------------------------------------ */

export const getOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { month?: string }) => z.object({ month: z.string().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { requireManager, getSettings, monthRange, summarize, computeSalaryFor } = await import(
      "./ccs.server"
    );
    const { monthIST, todayIST } = await import("./salary");
    const { supabase, userId } = context;
    const role = await requireManager(supabase, userId);
    const month = data.month ?? monthIST();
    const { start, end } = monthRange(month);
    const today = todayIST();
    const settings = await getSettings(supabase);

    const [{ data: staffRows }, { data: attendance }, { data: leaves }, { data: roles }] =
      await Promise.all([
        supabase
          .from("profiles")
          .select(
            "id, name, staff_code, user_id, designation, department, branch, work_type, shift, mobile, email, official_start_time, official_end_time, joining_date, active",
          )

          .order("name"),
        supabase.from("attendance").select("*").gte("work_date", start).lte("work_date", end),
        supabase.from("leaves").select("*").gte("leave_date", start).lte("leave_date", end),
        supabase.from("user_roles").select("user_id, role"),
      ]);

    const staffOnly = (staffRows ?? []).filter(
      (p) => !(roles ?? []).some((r) => r.user_id === p.id && r.role !== "staff"),
    );

    const rows = [] as Array<{
      profile: (typeof staffOnly)[number];
      summary: ReturnType<typeof summarize>;
      salary: Awaited<ReturnType<typeof computeSalaryFor>>;
      today: (typeof attendance extends null ? never : NonNullable<typeof attendance>)[number] | null;
    }>;

    for (const p of staffOnly) {
      const att = (attendance ?? []).filter((a) => a.staff_id === p.id);
      const lv = (leaves ?? []).filter((l) => l.staff_id === p.id);
      const summary = summarize(month, att as never, lv as never, settings);
      const salary = await computeSalaryFor(supabase, p.id, month, settings, summary);
      rows.push({
        profile: p,
        summary,
        salary,
        today: att.find((a) => a.work_date === today) ?? null,
      });
    }

    const todayLeaveStaff = new Set(
      (leaves ?? []).filter((l) => l.leave_date === today).map((l) => l.staff_id),
    );

    return {
      role,
      month,
      today,
      settings,
      rows,
      totals: {
        staff: staffOnly.length,
        present: rows.filter((r) => r.today?.status === "present").length,
        halfDay: rows.filter((r) => r.today?.status === "half_day").length,
        onLeave: rows.filter((r) => todayLeaveStaff.has(r.profile.id)).length,
        late: rows.filter((r) => (r.today?.late_minutes ?? 0) > 0).length,
        loggedIn: rows.filter((r) => r.today?.login_time && !r.today?.logout_time).length,
        absent: rows.filter((r) => !r.today && !todayLeaveStaff.has(r.profile.id)).length,
        notLoggedIn: rows.filter((r) => !r.today?.login_time).length,
        monthPresent: rows.reduce((s, r) => s + r.summary.presentDays, 0),
        monthLeave: rows.reduce((s, r) => s + r.summary.leaveDays, 0),

        monthLate: rows.reduce((s, r) => s + r.summary.lateDays, 0),
        monthHalf: rows.reduce((s, r) => s + r.summary.halfDays, 0),
        monthSalary: rows.reduce((s, r) => s + r.salary.finalSalary, 0),
        monthDeduction: rows.reduce((s, r) => s + r.salary.salaryDeduction, 0),
        monthIncentive: rows.reduce((s, r) => s + r.salary.incentive, 0),
      },
    };
  });

export const getStaffDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { staffId: string; month: string }) =>
    z.object({ staffId: z.string().uuid(), month: z.string() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { requireManager, getSettings, monthRange, summarize, computeSalaryFor } = await import(
      "./ccs.server"
    );
    const { supabase, userId } = context;
    const role = await requireManager(supabase, userId);
    const { start, end } = monthRange(data.month);
    const settings = await getSettings(supabase);

    const [
      { data: profile },
      { data: attendance },
      { data: leaves },
      { data: salaryRow },
      { data: incentives },
      { data: exceptions },
    ] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", data.staffId).maybeSingle(),
      supabase
        .from("attendance")
        .select("*")
        .eq("staff_id", data.staffId)
        .gte("work_date", start)
        .lte("work_date", end)
        .order("work_date"),
      supabase
        .from("leaves")
        .select("*")
        .eq("staff_id", data.staffId)
        .gte("leave_date", start)
        .lte("leave_date", end)
        .order("leave_date"),
      supabase
        .from("staff_salary")
        .select("monthly_salary")
        .eq("staff_id", data.staffId)
        .maybeSingle(),
      supabase.from("incentives").select("*").eq("staff_id", data.staffId).eq("month", data.month),
      supabase.from("exceptions").select("*").eq("staff_id", data.staffId).eq("month", data.month),
    ]);

    const summary = summarize(data.month, (attendance ?? []) as never, (leaves ?? []) as never, settings);
    const salary = await computeSalaryFor(supabase, data.staffId, data.month, settings, summary);

    return {
      role,
      profile,
      attendance: attendance ?? [],
      leaves: leaves ?? [],
      monthlySalary: Number(salaryRow?.monthly_salary ?? 0),
      incentives: incentives ?? [],
      exceptions: exceptions ?? [],
      summary,
      salary,
      settings,
    };
  });

/* ------------------------------------------------------------------ */
/* Attendance & leave corrections                                      */
/* ------------------------------------------------------------------ */

export const setAttendance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { staffId: string; date: string; status: string; note?: string }) =>
      z
        .object({
          staffId: z.string().uuid(),
          date: z.string(),
          status: z.enum([
            "present",
            "half_day",
            "leave",
            "permission",
            "absent",
            "holiday",
            "week_off",
          ]),

          note: z.string().max(200).optional(),
        })
        .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { requireManager, logAudit } = await import("./ccs.server");
    const { supabase, userId } = context;
    await requireManager(supabase, userId);

    const { data: existing } = await supabase
      .from("attendance")
      .select("*")
      .eq("staff_id", data.staffId)
      .eq("work_date", data.date)
      .maybeSingle();

    const payload = {
      staff_id: data.staffId,
      work_date: data.date,
      status: data.status,
      half_day: data.status === "half_day",
      note: data.note ?? null,
      updated_at: new Date().toISOString(),
    };
    const { error } = existing
      ? await supabase.from("attendance").update(payload).eq("id", existing.id)
      : await supabase.from("attendance").insert(payload);
    if (error) throw new Error(error.message);

    if (data.status === "leave" || data.status === "half_day") {
      await supabase.from("leaves").upsert(
        {
          staff_id: data.staffId,
          leave_date: data.date,
          leave_days: data.status === "half_day" ? 0.5 : 1,
          leave_type: "casual",
          reason: data.note ?? null,
        },
        { onConflict: "staff_id,leave_date" },
      );
    } else {
      await supabase.from("leaves").delete().eq("staff_id", data.staffId).eq("leave_date", data.date);
    }




    await logAudit(supabase, userId, "update", "attendance", data.date, existing ?? null, payload);
    return { ok: true };
  });

export const deleteAttendance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { requireSuper, logAudit } = await import("./ccs.server");
    const { supabase, userId } = context;
    await requireSuper(supabase, userId);
    const { data: old } = await supabase.from("attendance").select("*").eq("id", data.id).maybeSingle();
    const { error } = await supabase.from("attendance").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit(supabase, userId, "delete", "attendance", data.id, old, null);
    return { ok: true };
  });

export const setLeave = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { staffId: string; date: string; days: number; reason?: string }) =>
      z
        .object({
          staffId: z.string().uuid(),
          date: z.string(),
          days: z.number().min(0.5).max(1),
          reason: z.string().max(200).optional(),
        })
        .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { requireManager, logAudit } = await import("./ccs.server");
    const { supabase, userId } = context;
    await requireManager(supabase, userId);
    const { error } = await supabase.from("leaves").upsert(
      {
        staff_id: data.staffId,
        leave_date: data.date,
        leave_days: data.days,
        leave_type: "casual",
        reason: data.reason ?? null,
      },
      { onConflict: "staff_id,leave_date" },
    );
    if (error) throw new Error(error.message);
    await supabase.from("attendance").upsert(
      { staff_id: data.staffId, work_date: data.date, status: "leave" },
      { onConflict: "staff_id,work_date" },
    );
    await logAudit(supabase, userId, "create", "leave", data.date, null, data);
    return { ok: true };
  });

export const deleteLeave = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { requireSuper, logAudit } = await import("./ccs.server");
    const { supabase, userId } = context;
    await requireSuper(supabase, userId);
    const { data: old } = await supabase.from("leaves").select("*").eq("id", data.id).maybeSingle();
    const { error } = await supabase.from("leaves").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    if (old) {
      await supabase
        .from("attendance")
        .delete()
        .eq("staff_id", old.staff_id)
        .eq("work_date", old.leave_date)
        .eq("status", "leave");
    }
    await logAudit(supabase, userId, "delete", "leave", data.id, old, null);
    return { ok: true };
  });

/* ------------------------------------------------------------------ */
/* Super Admin: settings, incentives, exceptions, users, audit         */
/* ------------------------------------------------------------------ */

export const updateSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: Record<string, unknown>) =>
      z
        .object({
          cycle_days: z.number().int().min(1).max(31),
          paid_leave_days: z.number().min(0).max(31),
          half_day_leave_value: z.number().min(0).max(1),
          office_start_time: z.string().regex(/^\d{2}:\d{2}$/),
          late_grace_minutes: z.number().int().min(0).max(240),
          full_day_minutes: z.number().int().min(60).max(1440),
        })
        .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { requireSuper, getSettings, logAudit } = await import("./ccs.server");
    const { supabase, userId } = context;
    await requireSuper(supabase, userId);
    const old = await getSettings(supabase);
    const { error } = await supabase
      .from("salary_settings")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("id", 1);
    if (error) throw new Error(error.message);
    await logAudit(supabase, userId, "update", "salary_settings", "1", old, data);
    return { ok: true };
  });

export const addIncentive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { staffId: string; month: string; amount: number; reason?: string }) =>
      z
        .object({
          staffId: z.string().uuid(),
          month: z.string().regex(/^\d{4}-\d{2}$/),
          amount: z.number().min(0).max(10000000),
          reason: z.string().max(200).optional(),
        })
        .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { requireSuper, logAudit } = await import("./ccs.server");
    const { supabase, userId } = context;
    await requireSuper(supabase, userId);
    const { error } = await supabase.from("incentives").insert({
      staff_id: data.staffId,
      month: data.month,
      amount: data.amount,
      reason: data.reason ?? null,
      created_by: userId,
    });
    if (error) throw new Error(error.message);
    await logAudit(supabase, userId, "create", "incentive", data.staffId, null, data);
    return { ok: true };
  });

export const deleteIncentive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { requireSuper, logAudit } = await import("./ccs.server");
    const { supabase, userId } = context;
    await requireSuper(supabase, userId);
    const { data: old } = await supabase.from("incentives").select("*").eq("id", data.id).maybeSingle();
    const { error } = await supabase.from("incentives").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit(supabase, userId, "delete", "incentive", data.id, old, null);
    return { ok: true };
  });

export const addException = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { staffId: string; month: string; waivedDays: number; reason?: string }) =>
      z
        .object({
          staffId: z.string().uuid(),
          month: z.string().regex(/^\d{4}-\d{2}$/),
          waivedDays: z.number().min(0).max(31),
          reason: z.string().max(200).optional(),
        })
        .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { requireSuper, logAudit } = await import("./ccs.server");
    const { supabase, userId } = context;
    await requireSuper(supabase, userId);
    const { error } = await supabase.from("exceptions").insert({
      staff_id: data.staffId,
      month: data.month,
      exception_type: "leave_waiver",
      waived_days: data.waivedDays,
      reason: data.reason ?? null,
      approved_by: userId,
    });
    if (error) throw new Error(error.message);
    await logAudit(supabase, userId, "create", "exception", data.staffId, null, data);
    return { ok: true };
  });

export const deleteException = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { requireSuper, logAudit } = await import("./ccs.server");
    const { supabase, userId } = context;
    await requireSuper(supabase, userId);
    const { data: old } = await supabase.from("exceptions").select("*").eq("id", data.id).maybeSingle();
    const { error } = await supabase.from("exceptions").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit(supabase, userId, "delete", "exception", data.id, old, null);
    return { ok: true };
  });

/** Creates an employee account. Initial password is always Name@2026. */

export const createStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: Record<string, unknown>) =>
    profileFields
      .extend({
        role: z.enum(["staff", "admin"]).default("staff"),
        monthlySalary: z.number().min(0).max(10000000).default(0),
        loginId: z
          .string()
          .trim()
          .regex(/^[A-Za-z0-9._-]*$/, "User ID can only contain letters, numbers, . _ -")
          .max(60)
          .optional(),
        password: z.string().max(72).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { requireSuper, logAudit, emailFor } = await import("./ccs.server");
    const { defaultPasswordFor, loginIdFor } = await import("./ccs-constants");
    const { supabase, userId } = context;
    const actorRole = await requireSuper(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const loginId = data.loginId?.trim() ? data.loginId.trim() : loginIdFor(data.name);
    const password = data.password?.trim() ? data.password.trim() : defaultPasswordFor(data.name);
    if (password.length < 6) throw new Error("The password must be at least 6 characters.");

    const { data: dupe } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("user_id", loginId)
      .maybeSingle();
    if (dupe) throw new Error(`An employee with the User ID ${loginId} already exists.`);

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: emailFor(loginId),
      password,
      email_confirm: true,
      user_metadata: { name: data.name, user_id: loginId },
    });
    if (error || !created.user) throw new Error(error?.message ?? "Could not create the account.");

    const id = created.user.id;
    await supabaseAdmin.from("profiles").insert({
      id,
      name: data.name,
      staff_code: `CSC-${Math.floor(1000 + Math.random() * 9000)}`,
      user_id: loginId,
      designation: data.designation,
      department: data.department,
      branch: data.branch,
      work_type: data.workType ?? "",
      mobile: data.mobile || null,
      email: data.email || null,
      shift: data.shift,
      official_start_time: data.officialStart,
      official_end_time: data.officialEnd,
      joining_date: data.joiningDate,
    });
    await supabaseAdmin.from("user_roles").insert({ user_id: id, role: data.role });
    await supabaseAdmin
      .from("staff_salary")
      .insert({ staff_id: id, monthly_salary: data.monthlySalary });
    await supabaseAdmin.from("salary_history").insert({
      staff_id: id,
      effective_month: (data.joiningDate || new Date().toISOString().slice(0, 10)).slice(0, 7),
      monthly_salary: data.monthlySalary,
      note: "Initial salary",
      created_by: userId,
    });


    await logAudit(supabase, userId, "create", "employee", id, null, {
      loginId,
      role: data.role,
      actorRole,
    });
    return { ok: true, loginId };
  });

export const updateStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: Record<string, unknown>) =>
    profileFields
      .extend({
        staffId: z.string().uuid(),
        active: z.boolean(),
        monthlySalary: z.number().min(0).max(10000000).optional(),
        salaryEffectiveMonth: z
          .string()
          .trim()
          .regex(/^\d{4}-\d{2}$/, "Choose a valid effective month")
          .optional(),
        staffCode: z.string().trim().max(40).optional(),
        loginId: z
          .string()
          .trim()
          .regex(/^[A-Za-z0-9._-]*$/, "User ID can only contain letters, numbers, . _ -")
          .max(60)
          .optional(),
        password: z.string().max(72).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { requireSuper, logAudit, emailFor } = await import("./ccs.server");
    const { supabase, userId } = context;
    await requireSuper(supabase, userId);
    const { data: old } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", data.staffId)
      .maybeSingle();
    if (!old) throw new Error("Employee not found.");

    const loginId = data.loginId?.trim() || old.user_id;
    const password = data.password?.trim();
    if (password && password.length < 6)
      throw new Error("The password must be at least 6 characters.");

    if (loginId !== old.user_id) {
      const { data: dupe } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", loginId)
        .neq("id", data.staffId)
        .maybeSingle();
      if (dupe) throw new Error(`An employee with the User ID ${loginId} already exists.`);
    }

    if (loginId !== old.user_id || password) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(data.staffId, {
        ...(loginId !== old.user_id ? { email: emailFor(loginId) } : {}),
        ...(password ? { password } : {}),
      });
      if (authError) throw new Error(authError.message);
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        name: data.name,
        user_id: loginId,
        ...(data.staffCode?.trim() ? { staff_code: data.staffCode.trim() } : {}),
        designation: data.designation,
        department: data.department,
        branch: data.branch,
        work_type: data.workType ?? "",
        mobile: data.mobile || null,
        email: data.email || null,
        shift: data.shift,
        official_start_time: data.officialStart,
        official_end_time: data.officialEnd,
        joining_date: data.joiningDate,
        active: data.active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.staffId);
    if (error) throw new Error(error.message);

    if (data.monthlySalary !== undefined) {
      const { salaryForMonth } = await import("./ccs.server");
      const { monthIST } = await import("./salary");
      const effectiveMonth = data.salaryEffectiveMonth ?? monthIST();
      await supabase.from("salary_history").upsert(
        {
          staff_id: data.staffId,
          effective_month: effectiveMonth,
          monthly_salary: data.monthlySalary,
          created_by: userId,
        },
        { onConflict: "staff_id,effective_month" },
      );
      // staff_salary always mirrors the amount that applies right now.
      const current = await salaryForMonth(supabase, data.staffId, monthIST());
      await supabase
        .from("staff_salary")
        .upsert(
          { staff_id: data.staffId, monthly_salary: current, updated_at: new Date().toISOString() },
          { onConflict: "staff_id" },
        );
    }
    await logAudit(supabase, userId, "update", "employee", data.staffId, old, {
      ...data,
      password: password ? "changed" : undefined,
    });
    return { ok: true };
  });


/**
 * Sets an employee's password. With no value supplied it falls back to the
 * standard initial password (Employee Name + @2026). Only the Super Admin.
 */
export const resetStaffPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { staffId: string; password?: string }) =>
    z.object({ staffId: z.string().uuid(), password: z.string().max(72).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { requireSuper, logAudit } = await import("./ccs.server");
    const { defaultPasswordFor } = await import("./ccs-constants");
    const { supabase, userId } = context;
    await requireSuper(supabase, userId);
    const { data: profile } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", data.staffId)
      .maybeSingle();
    if (!profile) throw new Error("Employee not found.");

    const password = data.password?.trim() ? data.password.trim() : defaultPasswordFor(profile.name);
    if (password.length < 6) throw new Error("The password must be at least 6 characters.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.staffId, { password });
    if (error) throw new Error(error.message);
    await logAudit(supabase, userId, "reset", "password", data.staffId, null, { reset: true });
    return { ok: true };
  });


/** Any signed-in user can change their own password. */
export const changeMyPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { currentPassword: string; newPassword: string }) =>
    z
      .object({
        currentPassword: z.string().min(4).max(72),
        newPassword: z.string().min(8).max(72),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { emailFor } = await import("./ccs.server");
    const { supabase, userId } = context;
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("id", userId)
      .maybeSingle();
    if (!profile) throw new Error("Profile not found.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { createClient } = await import("@supabase/supabase-js");
    const check = createClient(
      process.env["SUPABASE_URL"]!,
      process.env["SUPABASE_PUBLISHABLE_KEY"]!,
      { auth: { persistSession: false, autoRefreshToken: false, storage: undefined } },
    );
    const { error: signInError } = await check.auth.signInWithPassword({
      email: emailFor(profile.user_id),
      password: data.currentPassword,
    });
    if (signInError) throw new Error("Your current password is incorrect.");

    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: data.newPassword,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Full user directory with roles — managers only, never includes credentials. */
export const getUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { requireManager } = await import("./ccs.server");
    const { supabase, userId } = context;
    const role = await requireManager(supabase, userId);
    const [{ data: profiles }, { data: roles }, { data: salaries }] = await Promise.all([
      supabase.from("profiles").select("*").order("name"),
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("staff_salary").select("staff_id, monthly_salary"),
    ]);
    return {
      role,
      users: (profiles ?? []).map((p) => ({
        ...p,
        role: (roles ?? []).find((r) => r.user_id === p.id)?.role ?? "staff",
        monthly_salary: Number(
          (salaries ?? []).find((s) => s.staff_id === p.id)?.monthly_salary ?? 0,
        ),
      })),

    };
  });

/** Salary revision history for one employee — managers only. */
export const getSalaryHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { staffId: string }) => z.object({ staffId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { requireManager } = await import("./ccs.server");
    const { supabase, userId } = context;
    await requireManager(supabase, userId);
    const { data: rows } = await supabase
      .from("salary_history")
      .select("id, effective_month, monthly_salary, note")
      .eq("staff_id", data.staffId)
      .order("effective_month", { ascending: false });
    return { history: rows ?? [] };
  });

/** Super Admin only: remove a salary revision entry. */
export const deleteSalaryHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { requireSuper, logAudit } = await import("./ccs.server");
    const { supabase, userId } = context;
    await requireSuper(supabase, userId);
    const { error } = await supabase.from("salary_history").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit(supabase, userId, "delete", "salary_history", data.id, null, null);
    return { ok: true };
  });

/** Super Admin only: change a user's role. */
export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { staffId: string; role: string }) =>
    z
      .object({
        staffId: z.string().uuid(),
        role: z.enum(["staff", "admin", "super_admin"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { requireSuper, logAudit } = await import("./ccs.server");
    const { supabase, userId } = context;
    await requireSuper(supabase, userId);
    if (data.staffId === userId) throw new Error("You cannot change your own role.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.staffId);
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.staffId, role: data.role });
    if (error) throw new Error(error.message);
    await logAudit(supabase, userId, "update", "role", data.staffId, null, { role: data.role });
    return { ok: true };
  });


export const deleteStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { staffId: string }) => z.object({ staffId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { requireSuper, logAudit } = await import("./ccs.server");
    const { supabase, userId } = context;
    await requireSuper(supabase, userId);
    const { data: old } = await supabase.from("profiles").select("*").eq("id", data.staffId).maybeSingle();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.staffId);
    if (error) throw new Error(error.message);
    await logAudit(supabase, userId, "delete", "staff", data.staffId, old, null);
    return { ok: true };
  });

export const getAuditLogs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { requireManager } = await import("./ccs.server");
    const { supabase, userId } = context;
    const role = await requireManager(supabase, userId);
    const query = supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(role === "super_admin" ? 200 : 25);
    const { data } = await query;
    return { role, logs: data ?? [] };
  });


/* ------------------------------------------------------------------ */
/* Attendance timing overrides — Super Admin only                      */
/* ------------------------------------------------------------------ */

const overrideInput = z
  .object({
    id: z.string().uuid().optional(),
    staffId: z.string().uuid().nullable().optional(),
    fromDate: z.string().min(10, "Choose a valid from date"),
    toDate: z.string().min(10, "Choose a valid to date"),
    loginTime: z.string().min(4, "Login time is required"),
    logoutTime: z.string().min(4, "Logout time is required"),
    note: z.string().max(200).optional(),
    active: z.boolean().optional(),
  })
  .refine((v) => v.toDate >= v.fromDate, { message: "To date cannot be before the from date." })
  .refine((v) => v.logoutTime > v.loginTime, {
    message: "Logout time must be later than the login time.",
  });

export const listTimingOverrides = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { requireSuper } = await import("./ccs.server");
    const { supabase, userId } = context;
    await requireSuper(supabase, userId);

    const [{ data: rows }, { data: profiles }] = await Promise.all([
      supabase
        .from("attendance_timing_overrides")
        .select("*")
        .order("from_date", { ascending: false }),
      supabase.from("profiles").select("id, name, staff_code"),
    ]);
    const names = new Map(
      (profiles ?? []).map((p: { id: string; name: string; staff_code: string }) => [
        p.id,
        `${p.name} (${p.staff_code})`,
      ]),
    );
    return {
      rows: (rows ?? []).map((r: Record<string, any>) => ({
        id: r['id'] as string,
        staffId: (r['staff_id'] ?? null) as string | null,
        staffName: r['staff_id'] ? names.get(r['staff_id']) ?? "Unknown" : "All Employees",
        fromDate: r['from_date'] as string,
        toDate: r['to_date'] as string,
        loginTime: r['login_time'] as string,
        logoutTime: r['logout_time'] as string,
        note: (r['note'] ?? null) as string | null,
        active: Boolean(r['active']),
        createdBy: r['created_by'] ? names.get(r['created_by']) ?? "Super Admin" : "Super Admin",
        createdAt: r['created_at'] as string,
      })),
    };
  });

export const saveTimingOverride = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => overrideInput.parse(d))
  .handler(async ({ data, context }) => {
    const { requireSuper, logAudit } = await import("./ccs.server");
    const { supabase, userId } = context;
    await requireSuper(supabase, userId);

    const payload = {
      staff_id: data.staffId ?? null,
      from_date: data.fromDate,
      to_date: data.toDate,
      login_time: data.loginTime,
      logout_time: data.logoutTime,
      note: data.note ?? null,
      active: data.active ?? true,
      created_by: userId,
    };

    if (data.id) {
      const { data: old } = await supabase
        .from("attendance_timing_overrides")
        .select("*")
        .eq("id", data.id)
        .maybeSingle();
      const { error } = await supabase
        .from("attendance_timing_overrides")
        .update(payload)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      await logAudit(supabase, userId, "update", "timing_override", data.id, old, payload);
      return { ok: true as const, id: data.id };
    }

    const { data: created, error } = await supabase
      .from("attendance_timing_overrides")
      .insert(payload)
      .select("id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    await logAudit(supabase, userId, "create", "timing_override", created?.id ?? null, null, payload);
    return { ok: true as const, id: created?.id ?? null };
  });

export const deleteTimingOverride = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { requireSuper, logAudit } = await import("./ccs.server");
    const { supabase, userId } = context;
    await requireSuper(supabase, userId);
    const { data: old } = await supabase
      .from("attendance_timing_overrides")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    const { error } = await supabase.from("attendance_timing_overrides").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit(supabase, userId, "delete", "timing_override", data.id, old, null);
    return { ok: true as const };
  });
