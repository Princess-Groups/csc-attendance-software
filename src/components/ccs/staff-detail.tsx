import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getStaffDetail,
  setAttendance,
  deleteLeave,
  deleteAttendance,
} from "@/lib/ccs.functions";
import { ATTENDANCE_STATUSES, STATUS_LABEL } from "@/lib/ccs-constants";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Stat, StatusBadge } from "./shell";
import { toast } from "sonner";
import { formatDate, formatDuration, formatTime, inr, monthLabel, todayIST } from "@/lib/salary";
import { Loader2, Trash2 } from "lucide-react";

export function StaffDetailDialog({
  staffId,
  month,
  role,
  onClose,
}: {
  staffId: string | null;
  month: string;
  role: "admin" | "super_admin";
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const detailFn = useServerFn(getStaffDetail);
  const attendanceFn = useServerFn(setAttendance);
  
  const delLeaveFn = useServerFn(deleteLeave);
  const delAttFn = useServerFn(deleteAttendance);

  const [date, setDate] = useState(todayIST());
  const [status, setStatus] = useState("present");

  const q = useQuery({
    queryKey: ["staff-detail", staffId, month],
    queryFn: () => detailFn({ data: { staffId: staffId!, month } }),
    enabled: !!staffId,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["staff-detail"] });
    qc.invalidateQueries({ queryKey: ["overview"] });
  };

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      toast.success(ok);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed.");
    }
  };

  const applyStatus = () =>
    run(
      () => attendanceFn({ data: { staffId: staffId!, date, status } }),
      "Attendance updated.",
    );


  return (
    <Dialog open={!!staffId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto rounded-3xl">
        {!q.data ? (
          <div className="grid h-40 place-items-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-2xl">
                {q.data.profile?.name} · {monthLabel(month)}
              </DialogTitle>
            </DialogHeader>

            <p className="text-sm text-muted-foreground">
              {q.data.profile?.designation} · {q.data.profile?.department ?? "—"} · ID{" "}
              {q.data.profile?.staff_code} · User {q.data.profile?.user_id} · Shift{" "}
              {q.data.profile?.shift ?? "General"} (
              {(q.data.profile?.official_start_time ?? "09:00").slice(0, 5)}–
              {(q.data.profile?.official_end_time ?? "18:00").slice(0, 5)}) · Joined{" "}
              {formatDate(q.data.profile?.joining_date ?? null)}
            </p>


            <div className="grid gap-3 sm:grid-cols-3">
              <Stat label="Present" value={q.data.summary.presentDays} />
              <Stat label="Half Days" value={q.data.summary.halfDays} />
              <Stat label="Leave" value={q.data.summary.leaveDays} />
              <Stat label="Late Days" value={q.data.summary.lateDays} hint={`${q.data.summary.lateMinutes} min`} />
              <Stat label="Working Hours" value={formatDuration(q.data.summary.workingMinutes)} />
              <Stat label="Attendance %" value={`${q.data.summary.attendancePercent}%`} />
            </div>

            <div className="rounded-3xl bubble-soft border border-border p-5">
              <h3 className="font-display text-lg font-bold">Salary Calculation</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <Stat label="Monthly Salary" value={inr(q.data.salary.monthlySalary)} />
                <Stat label="Daily Salary" value={inr(q.data.salary.dailySalary)} hint={`${q.data.salary.salaryDays}-day cycle`} />
                <Stat label="Total Leave" value={q.data.salary.totalLeave} />
                <Stat label="Paid Leave" value={q.data.salary.paidLeave} />
                <Stat label="Deductible Leave" value={q.data.salary.deductibleLeave} hint={`${q.data.salary.waivedLeave} waived`} />
                <Stat label="Deduction" value={inr(q.data.salary.salaryDeduction)} />
                <Stat label="Incentive" value={inr(q.data.salary.incentive)} />
                <Stat label="Final Salary" value={inr(q.data.salary.finalSalary)} />
              </div>
              {role === "super_admin" ? (
                <ol className="mt-4 space-y-1 rounded-2xl bg-card p-4 text-xs text-muted-foreground">
                  {q.data.salary.steps.map((s) => (
                    <li key={s}>• {s}</li>
                  ))}
                </ol>
              ) : null}
            </div>

            <div className="rounded-3xl border border-border p-5">
              <h3 className="font-display text-lg font-bold">Attendance Correction</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                <div className="space-y-1">
                  <Label>Date</Label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-2xl" />
                </div>
                <div className="space-y-1">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger className="rounded-2xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ATTENDANCE_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {STATUS_LABEL[s]}
                        </SelectItem>
                      ))}

                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={applyStatus} className="self-end rounded-2xl bubble-gradient font-bold">
                  Apply
                </Button>
              </div>
              {role === "admin" ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Admins can correct attendance but cannot delete records or change salary rules.
                </p>
              ) : null}
            </div>

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
                    {role === "super_admin" ? <TableHead /> : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {q.data.attendance.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-semibold">{formatDate(a.work_date)}</TableCell>
                      <TableCell>{formatTime(a.login_time)}</TableCell>
                      <TableCell>{formatTime(a.logout_time)}</TableCell>
                      <TableCell>{formatDuration(a.working_minutes)}</TableCell>
                      <TableCell>
                        <StatusBadge status={a.status} />
                      </TableCell>
                      <TableCell>{a.late_minutes ? `${a.late_minutes} min` : "—"}</TableCell>
                      {role === "super_admin" ? (
                        <TableCell>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="rounded-full text-destructive"
                            onClick={() => run(() => delAttFn({ data: { id: a.id } }), "Attendance deleted.")}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div>
              <h3 className="font-display text-lg font-bold">Leave Register</h3>
              <ul className="mt-2 space-y-2">
                {q.data.leaves.length === 0 ? (
                  <li className="text-sm text-muted-foreground">No leave this month.</li>
                ) : (
                  q.data.leaves.map((l) => (
                    <li
                      key={l.id}
                      className="flex items-center justify-between rounded-2xl bg-bubble-tint px-4 py-2 text-sm"
                    >
                      <span className="font-semibold">{formatDate(l.leave_date)}</span>
                      <span className="flex items-center gap-3">
                        {l.leave_days} day(s)
                        {role === "super_admin" ? (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="rounded-full text-destructive"
                            onClick={() => run(() => delLeaveFn({ data: { id: l.id } }), "Leave deleted.")}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        ) : null}
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
