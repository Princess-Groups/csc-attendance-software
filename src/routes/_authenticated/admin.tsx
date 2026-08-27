import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { getMe, getOverview } from "@/lib/ccs.functions";
import { Shell, Panel, Stat, StatusBadge } from "@/components/ccs/shell";
import { StaffDetailDialog } from "@/components/ccs/staff-detail";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { formatDuration, formatTime, inr, monthIST, monthLabel } from "@/lib/salary";
import { Loader2, Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard | CSC Attendance & Salary" },
      {
        name: "description",
        content:
          "Daily and monthly attendance overview for all staff with automatically calculated salary results.",
      },
      { property: "og:title", content: "CSC Admin Dashboard" },
      { property: "og:description", content: "All staff attendance, leave, late records and salary results." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const navigate = useNavigate();
  const me = useServerFn(getMe);
  const overview = useServerFn(getOverview);
  const [month, setMonth] = useState(monthIST());
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [department, setDepartment] = useState("all");

  const [selected, setSelected] = useState<string | null>(null);

  const meQuery = useQuery({ queryKey: ["me"], queryFn: () => me({}) });
  const q = useQuery({ queryKey: ["overview", month], queryFn: () => overview({ data: { month } }) });

  if (meQuery.data && meQuery.data.role === "staff") {
    navigate({ to: "/staff", replace: true });
  }

  const departments = useMemo(() => {
    const set = new Set<string>();
    (q.data?.rows ?? []).forEach((r) => set.add(r.profile.department ?? "Other"));
    return Array.from(set).sort();
  }, [q.data]);

  const rows = useMemo(() => {
    const list = q.data?.rows ?? [];
    return list.filter((r) => {
      const term = search.trim().toLowerCase();
      const matchName =
        r.profile.name.toLowerCase().includes(term) ||
        r.profile.user_id.toLowerCase().includes(term) ||
        r.profile.staff_code.toLowerCase().includes(term);
      if (!matchName) return false;
      if (department !== "all" && (r.profile.department ?? "Other") !== department) return false;
      switch (filter) {
        case "present":
          return r.today?.status === "present";
        case "half_day":
          return r.today?.status === "half_day";
        case "leave":
          return r.summary.leaveDays > 0;
        case "late":
          return r.summary.lateDays > 0;
        case "absent":
          return !r.today;
        default:
          return true;
      }
    });
  }, [q.data, search, filter, department]);


  if (q.isLoading || !q.data || !meQuery.data) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const t = q.data.totals;
  const role = q.data.role as "admin" | "super_admin";

  return (
    <Shell role={role} name={meQuery.data.profile?.name ?? "Admin"}>
      <div className="space-y-6">
        <section className="bubble-card bubble-soft grid gap-3 p-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div className="min-w-0">
            <h1 className="font-display text-3xl font-extrabold">Today&apos;s Overview</h1>
            <p className="text-sm text-muted-foreground">{monthLabel(month)} · {t.staff} staff members</p>
          </div>
          <Input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value || monthIST())}
            className="w-[170px] rounded-2xl bg-card"
          />
        </section>

        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Total Staff" value={t.staff} />
          <Stat label="Present" value={t.present} />
          <Stat label="Absent" value={t.absent} />
          <Stat label="On Leave" value={t.onLeave} />
          <Stat label="Late" value={t.late} />
          <Stat label="Logged In Now" value={t.loggedIn} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Stat label="Not Logged In" value={t.notLoggedIn} />
          <Stat label="Monthly Present" value={t.monthPresent} />
          <Stat label="Monthly Leave" value={t.monthLeave} />
          <Stat label="Monthly Late" value={t.monthLate} />
          <Stat label="Monthly Half Days" value={t.monthHalf} />

        </div>

        <Panel
          title="Staff-wise Attendance & Salary"
          description="Salary is recalculated automatically from attendance, leave, waivers and incentives."
          action={
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search staff"
                  className="w-[180px] rounded-2xl pl-9"
                  maxLength={60}
                />
              </div>
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-[150px] rounded-2xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All staff</SelectItem>
                  <SelectItem value="present">Present today</SelectItem>
                  <SelectItem value="absent">Absent today</SelectItem>
                  <SelectItem value="half_day">Half day today</SelectItem>
                  <SelectItem value="leave">Has leave</SelectItem>
                  <SelectItem value="late">Has late days</SelectItem>
                </SelectContent>
              </Select>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger className="w-[170px] rounded-2xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All departments</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

            </div>
          }
        >
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Today</TableHead>

                  <TableHead>Present</TableHead>
                  <TableHead>Leave</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Unpaid</TableHead>
                  <TableHead>Late</TableHead>
                  <TableHead>Half</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Deduction</TableHead>
                  <TableHead>Incentive</TableHead>
                  <TableHead>Final Salary</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={14} className="text-center text-muted-foreground">
                      No staff match this filter.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => (
                    <TableRow key={r.profile.id}>
                      <TableCell>
                        <p className="font-semibold">{r.profile.name}</p>
                        <p className="text-xs text-muted-foreground">{r.profile.user_id}</p>
                      </TableCell>
                      <TableCell>
                        {r.profile.department ?? "—"}
                        <span className="block text-xs text-muted-foreground">
                          {r.profile.designation}
                        </span>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={r.today?.status ?? "absent"} />
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {formatTime(r.today?.login_time ?? null)} –{" "}
                          {formatTime(r.today?.logout_time ?? null)}
                        </span>
                      </TableCell>

                      <TableCell>{r.summary.presentDays}</TableCell>
                      <TableCell>{r.summary.leaveDays}</TableCell>
                      <TableCell>{r.summary.paidLeaveDays}</TableCell>
                      <TableCell>{r.summary.unpaidLeaveDays}</TableCell>
                      <TableCell>{r.summary.lateDays}</TableCell>
                      <TableCell>{r.summary.halfDays}</TableCell>
                      <TableCell>{formatDuration(r.summary.workingMinutes)}</TableCell>
                      <TableCell className="text-destructive">{inr(r.salary.salaryDeduction)}</TableCell>
                      <TableCell>{inr(r.salary.incentive)}</TableCell>
                      <TableCell className="font-display font-bold">{inr(r.salary.finalSalary)}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="rounded-full"
                          onClick={() => setSelected(r.profile.id)}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Stat label="Total Payable" value={inr(t.monthSalary)} />
            <Stat label="Total Deduction" value={inr(t.monthDeduction)} />
            <Stat label="Total Incentive" value={inr(t.monthIncentive)} />
          </div>
        </Panel>
      </div>

      <StaffDetailDialog staffId={selected} month={month} role={role} onClose={() => setSelected(null)} />
    </Shell>
  );
}
