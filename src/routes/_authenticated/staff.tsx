import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  getMe,
  getStaffDashboard,
  clockIn,
  clockOut,
  changeMyPassword,
} from "@/lib/ccs.functions";

import { Shell, Panel, Stat, StatusBadge } from "@/components/ccs/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { formatDate, formatDuration, formatTime, monthIST, monthLabel } from "@/lib/salary";
import { Clock, LogIn, LogOut, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/staff")({
  head: () => ({
    meta: [
      { title: "My Attendance Dashboard | CSC Staff Portal" },
      {
        name: "description",
        content:
          "View your daily login and logout, monthly attendance, leave balance and late records in the CSC staff portal.",
      },
      { property: "og:title", content: "CSC Staff Attendance Dashboard" },
      { property: "og:description", content: "Your personal attendance, leave and late summary." },
    ],
  }),
  component: StaffPage,
});

function StaffPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const me = useServerFn(getMe);
  const dash = useServerFn(getStaffDashboard);
  const inFn = useServerFn(clockIn);
  const outFn = useServerFn(clockOut);
  const [month, setMonth] = useState(monthIST());

  const meQuery = useQuery({ queryKey: ["me"], queryFn: () => me({}) });
  const q = useQuery({
    queryKey: ["staff-dash", month],
    queryFn: () => dash({ data: { month } }),
  });

  const mutate = (fn: () => Promise<unknown>, ok: string) => async () => {
    try {
      await fn();
      toast.success(ok);
      qc.invalidateQueries({ queryKey: ["staff-dash"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong.");
    }
  };

  const login = useMutation({ mutationFn: mutate(() => inFn({}), "Login recorded. Have a lovely day!") });
  const logout = useMutation({ mutationFn: mutate(() => outFn({}), "Logout recorded. See you tomorrow!") });

  if (meQuery.data && meQuery.data.role !== "staff") {
    navigate({ to: meQuery.data.role === "admin" ? "/admin" : "/super", replace: true });
  }

  if (q.isLoading || !q.data) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const { profile, summary, attendance, leaves, todayRecord, settings, today } = q.data;
  const openSession = q.data.openSession;
  const todaySessions = q.data.todaySessions ?? [];

  const remainingPaid = Math.max(0, settings.paid_leave_days - summary.paidLeaveDays);

  return (
    <Shell role="staff" name={profile?.name ?? "Staff"}>
      <div className="space-y-6">
        <section className="bubble-card bubble-soft grid gap-4 p-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-muted-foreground">
              {formatDate(today)} · {monthLabel(month)}
            </p>
            <h1 className="truncate font-display text-3xl font-extrabold">
              Hello, {profile?.name ?? "Staff"} 🌸
            </h1>
            <p className="text-sm text-muted-foreground">
              {profile?.designation} · Employee ID {profile?.staff_code} · User ID {profile?.user_id}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded-full bg-card px-3 py-1.5 font-semibold shadow-[var(--shadow-soft)]">
                <Clock className="mr-1 inline h-3.5 w-3.5" />
                Login {formatTime(todayRecord?.login_time ?? null)}
              </span>
              <span className="rounded-full bg-card px-3 py-1.5 font-semibold shadow-[var(--shadow-soft)]">
                Logout {formatTime(todayRecord?.logout_time ?? null)}
              </span>
              {todayRecord ? <StatusBadge status={todayRecord.status} /> : <StatusBadge status="absent" />}
              {todayRecord?.late_minutes ? (
                <span className="rounded-full bg-warning/25 px-3 py-1.5 text-xs font-bold text-warning-foreground">
                  Late {todayRecord.late_minutes} min
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => login.mutate()}
              disabled={login.isPending || openSession}
              className="rounded-2xl bubble-gradient px-6 py-6 font-bold shadow-[var(--shadow-bubble)]"
            >
              <LogIn className="mr-2 h-4 w-4" /> Login
            </Button>
            <Button
              onClick={() => logout.mutate()}
              disabled={logout.isPending || !openSession}
              variant="secondary"
              className="rounded-2xl px-6 py-6 font-bold"
            >
              <LogOut className="mr-2 h-4 w-4" /> Logout
            </Button>
          </div>
        </section>

        {todaySessions.length > 0 ? (
          <section className="bubble-card p-5">
            <p className="font-display text-sm font-bold">Today's Sessions</p>
            <ul className="mt-2 space-y-1 text-sm">
              {todaySessions.map((s) => (
                <li key={s.id} className="flex flex-wrap gap-2 text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    {formatTime(s.login_time)} → {s.logout_time ? formatTime(s.logout_time) : "Active"}
                  </span>
                  <span>
                    {s.duration_minutes > 0
                      ? `${Math.floor(s.duration_minutes / 60)}h ${s.duration_minutes % 60}m`
                      : ""}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}



        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Total Working Days" value={summary.totalWorkingDays} />
          <Stat label="Present Days" value={summary.presentDays} />
          <Stat label="Half Days" value={summary.halfDays} />
          <Stat label="Attendance %" value={`${summary.attendancePercent}%`} />
          <Stat label="Leave Days" value={summary.leaveDays} />
          <Stat label="Paid Leave" value={summary.paidLeaveDays} hint={`${remainingPaid} remaining`} />
          <Stat label="Unpaid Leave" value={summary.unpaidLeaveDays} />
          <Stat
            label="Late Days"
            value={summary.lateDays}
            hint={`${summary.lateMinutes} min total · avg ${summary.averageLateMinutes} min`}
          />
        </div>

        <Panel
          title="Monthly Attendance"
          description={`Total working hours: ${formatDuration(summary.workingMinutes)}`}
          action={
            <Input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value || monthIST())}
              className="w-[170px] rounded-2xl"
            />
          }
        >
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Login</TableHead>
                  <TableHead>Logout</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Late</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendance.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No attendance recorded for this month yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  attendance.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-semibold">{formatDate(a.work_date)}</TableCell>
                      <TableCell>{formatTime(a.login_time)}</TableCell>
                      <TableCell>{formatTime(a.logout_time)}</TableCell>
                      <TableCell>{formatDuration(a.working_minutes)}</TableCell>
                      <TableCell>
                        <StatusBadge status={a.status} />
                      </TableCell>
                      <TableCell>
                        {a.late_minutes ? (
                          <span className="font-semibold text-warning-foreground">
                            {a.late_minutes} min
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Panel>

        <div className="grid gap-6 lg:grid-cols-2">
          <Panel
            title="Leave Summary"
            description={`${settings.paid_leave_days} paid leave day per ${settings.cycle_days}-day cycle`}
          >
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Total Leave" value={summary.leaveDays} />
              <Stat label="Paid Leave" value={summary.paidLeaveDays} />
              <Stat label="Unpaid Leave" value={summary.unpaidLeaveDays} />
              <Stat label="Remaining Paid" value={remainingPaid} />
            </div>
            <ul className="mt-4 space-y-2">
              {leaves.length === 0 ? (
                <li className="text-sm text-muted-foreground">No leave taken this month.</li>
              ) : (
                leaves.map((l) => (
                  <li
                    key={l.id}
                    className="flex items-center justify-between rounded-2xl bg-bubble-tint px-4 py-2 text-sm"
                  >
                    <span className="font-semibold">{formatDate(l.leave_date)}</span>
                    <span>
                      {l.leave_days} day{Number(l.leave_days) > 1 ? "s" : ""} · {l.leave_type}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </Panel>

          <Panel
            title="Late / Delay Records"
            description={`Your official start time is ${(profile?.official_start_time ?? settings.office_start_time).slice(0, 5)}`}
          >
            <ul className="space-y-2">
              {attendance.filter((a) => a.late_minutes > 0).length === 0 ? (
                <li className="text-sm text-muted-foreground">No late arrivals this month. 🎉</li>
              ) : (
                attendance
                  .filter((a) => a.late_minutes > 0)
                  .map((a) => (
                    <li
                      key={a.id}
                      className="flex items-center justify-between rounded-2xl bg-bubble-tint px-4 py-2 text-sm"
                    >
                      <span className="font-semibold">{formatDate(a.work_date)}</span>
                      <span>
                        Login {formatTime(a.login_time)} · Late {a.late_minutes} min
                      </span>
                    </li>
                  ))
              )}
            </ul>
          </Panel>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="My Details" description="Contact your Admin if anything here needs updating.">
            <dl className="grid gap-3 sm:grid-cols-2">
              <Detail label="Employee ID" value={profile?.staff_code} />
              <Detail label="User ID" value={profile?.user_id} />
              <Detail label="Department" value={profile?.department} />
              <Detail label="Designation" value={profile?.designation} />
              <Detail label="Shift" value={profile?.shift} />
              <Detail
                label="Official Timings"
                value={`${(profile?.official_start_time ?? "09:00").slice(0, 5)} – ${(profile?.official_end_time ?? "18:00").slice(0, 5)}`}
              />
              <Detail label="Joining Date" value={formatDate(profile?.joining_date ?? null)} />
            </dl>
          </Panel>

          <ChangePasswordPanel />
        </div>
      </div>
    </Shell>
  );
}

function Detail({ label, value }: { label: string; value?: string | null | undefined }) {
  return (
    <div className="rounded-2xl bg-bubble-tint px-4 py-2">
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="font-semibold">{value || "—"}</dd>
    </div>
  );
}

function ChangePasswordPanel() {
  const change = useServerFn(changeMyPassword);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (next.length < 8) {
      toast.error("Your new password must be at least 8 characters.");
      return;
    }
    if (next !== confirm) {
      toast.error("The new passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await change({ data: { currentPassword: current, newPassword: next } });
      toast.success("Password updated.");
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update your password.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel title="Change Password" description="Keep your account secure with a private password.">
      <div className="grid gap-3">
        <PasswordInput
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          placeholder="Current password"
          maxLength={72}
          className="rounded-2xl"
        />
        <PasswordInput
          value={next}
          onChange={(e) => setNext(e.target.value)}
          placeholder="New password (min 8 characters)"
          maxLength={72}
          className="rounded-2xl"
        />
        <PasswordInput
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Confirm new password"
          maxLength={72}
          className="rounded-2xl"
        />
        <Button
          onClick={submit}
          disabled={busy}
          className="rounded-2xl bubble-gradient font-bold"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update Password"}
        </Button>
      </div>
    </Panel>
  );
}

