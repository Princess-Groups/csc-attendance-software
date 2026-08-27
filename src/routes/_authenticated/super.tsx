import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState, useId } from "react";
import {
  getMe,
  getOverview,
  getStaffDetail,
  getAuditLogs,
  updateSettings,
  addIncentive,
  addException,
  createStaff,
  updateStaff,
  resetStaffPassword,
  deleteStaff,
  getUsers,
  setUserRole,
  getSalaryHistory,
  deleteSalaryHistory,
  getActivityLog,

} from "@/lib/ccs.functions";
import { loginIdFor, BRANCHES } from "@/lib/ccs-constants";

import { Shell, Panel, Stat } from "@/components/ccs/shell";
import { StaffDetailDialog } from "@/components/ccs/staff-detail";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { toast } from "sonner";
import { calculateSalary, inr, monthIST, monthLabel } from "@/lib/salary";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/super")({
  head: () => ({
    meta: [
      { title: "Super Admin Control Centre | CSC Attendance & Salary" },
      {
        name: "description",
        content:
          "Configure salary rules, incentives, waivers, users and review the full audit history of the CSC system.",
      },
      { property: "og:title", content: "CSC Super Admin Control Centre" },
      { property: "og:description", content: "Salary rules, calculator, incentives, exceptions and audit logs." },
    ],
  }),
  component: SuperPage,
});

function SuperPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const me = useServerFn(getMe);
  const overview = useServerFn(getOverview);
  const audit = useServerFn(getAuditLogs);
  const [month, setMonth] = useState(monthIST());
  const [selected, setSelected] = useState<string | null>(null);

  const meQuery = useQuery({ queryKey: ["me"], queryFn: () => me({}) });
  const q = useQuery({ queryKey: ["overview", month], queryFn: () => overview({ data: { month } }) });
  const logs = useQuery({ queryKey: ["audit"], queryFn: () => audit({}) });

  useEffect(() => {
    if (meQuery.data && meQuery.data.role !== "super_admin") {
      navigate({ to: meQuery.data.role === "admin" ? "/admin" : "/staff", replace: true });
    }
  }, [meQuery.data, navigate]);

  if (!q.data || !meQuery.data) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const t = q.data.totals;
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["overview"] });
    qc.invalidateQueries({ queryKey: ["audit"] });
  };

  return (
    <Shell role="super_admin" name={meQuery.data.profile?.name ?? "Super Admin"}>
      <div className="space-y-6">
        <section className="bubble-card bubble-soft grid gap-3 p-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div className="min-w-0">
            <h1 className="font-display text-3xl font-extrabold">Super Admin Control Centre</h1>
            <p className="text-sm text-muted-foreground">{monthLabel(month)} · full system authority</p>
          </div>
          <Input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value || monthIST())}
            className="w-[170px] rounded-2xl bg-card"
          />
        </section>

        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Employees" value={t.staff} />
          <Stat label="Present Today" value={t.present} />
          <Stat label="Absent Today" value={t.absent} />
          <Stat label="Leave Today" value={t.onLeave} />
          <Stat label="Late Today" value={t.late} />
          <Stat label="Monthly Payout" value={inr(t.monthSalary)} />
        </div>

        <Tabs defaultValue="calculator">
          <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 rounded-2xl bg-bubble-tint p-1">
            <TabsTrigger className="rounded-xl" value="calculator">Salary Calculator</TabsTrigger>
            <TabsTrigger className="rounded-xl" value="rules">Salary Rules</TabsTrigger>
            <TabsTrigger className="rounded-xl" value="incentives">Incentives</TabsTrigger>
            <TabsTrigger className="rounded-xl" value="exceptions">Exceptions</TabsTrigger>
            <TabsTrigger className="rounded-xl" value="users">User Management</TabsTrigger>
            <TabsTrigger className="rounded-xl" value="activity">Login / Logout History</TabsTrigger>
            <TabsTrigger className="rounded-xl" value="audit">Audit Logs</TabsTrigger>

          </TabsList>

          <TabsContent value="calculator" className="mt-4 space-y-6">
            <CalculatorPanel settings={q.data.settings} />
            <Panel title="Backend calculation results" description="Stored values recalculated on every change.">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Monthly</TableHead>
                      <TableHead>Daily</TableHead>
                      <TableHead>Total Leave</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>Waived</TableHead>
                      <TableHead>Deductible</TableHead>
                      <TableHead>Deduction</TableHead>
                      <TableHead>Incentive</TableHead>
                      <TableHead>Final</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {q.data.rows.map((r) => (
                      <TableRow key={r.profile.id}>
                        <TableCell className="font-semibold">{r.profile.name}</TableCell>
                        <TableCell>{inr(r.salary.monthlySalary)}</TableCell>
                        <TableCell>{inr(r.salary.dailySalary)}</TableCell>
                        <TableCell>{r.salary.totalLeave}</TableCell>
                        <TableCell>{r.salary.paidLeave}</TableCell>
                        <TableCell>{r.salary.waivedLeave}</TableCell>
                        <TableCell>{r.salary.deductibleLeave}</TableCell>
                        <TableCell className="text-destructive">{inr(r.salary.salaryDeduction)}</TableCell>
                        <TableCell>{inr(r.salary.incentive)}</TableCell>
                        <TableCell className="font-display font-bold">{inr(r.salary.finalSalary)}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="secondary" className="rounded-full" onClick={() => setSelected(r.profile.id)}>
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Panel>
          </TabsContent>

          <TabsContent value="rules" className="mt-4">
            <RulesPanel settings={q.data.settings} onSaved={refresh} />
          </TabsContent>

          <TabsContent value="incentives" className="mt-4">
            <IncentivePanel rows={q.data.rows} month={month} onSaved={refresh} />
          </TabsContent>

          <TabsContent value="exceptions" className="mt-4">
            <ExceptionPanel rows={q.data.rows} month={month} onSaved={refresh} />
          </TabsContent>

          <TabsContent value="users" className="mt-4">
            <UsersPanel rows={q.data.rows} onSaved={refresh} />
          </TabsContent>

          <TabsContent value="audit" className="mt-4">
            <Panel title="Audit History" description="Every correction, deletion, incentive and waiver is recorded.">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>When</TableHead>
                      <TableHead>Who</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead>Old → New</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(logs.data?.logs ?? []).map((l) => (
                      <TableRow key={l.id}>
                        <TableCell className="whitespace-nowrap text-xs">
                          {new Date(l.created_at).toLocaleString("en-GB", { timeZone: "Asia/Kolkata" })}
                        </TableCell>
                        <TableCell className="text-xs font-semibold">
                          {l.actor_name} ({l.actor_role})
                        </TableCell>
                        <TableCell className="text-xs">{l.action}</TableCell>
                        <TableCell className="text-xs">{l.entity}</TableCell>
                        <TableCell className="max-w-[320px] truncate text-xs text-muted-foreground">
                          {JSON.stringify(l.old_value)} → {JSON.stringify(l.new_value)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Panel>
          </TabsContent>

          <TabsContent value="activity" className="mt-4">
            <ActivityPanel />
          </TabsContent>
        </Tabs>
      </div>


      <StaffDetailDialog staffId={selected} month={month} role="super_admin" onClose={() => setSelected(null)} />
    </Shell>
  );
}

type Settings = {
  cycle_days: number;
  paid_leave_days: number;
  half_day_leave_value: number;
  office_start_time: string;
  late_grace_minutes: number;
  full_day_minutes: number;
};
type Row = { profile: { id: string; name: string; user_id: string; designation: string; joining_date: string; active: boolean } };

function CalculatorPanel({ settings }: { settings: Settings }) {
  const [salary, setSalary] = useState(0);
  const [leave, setLeave] = useState(0);
  const [incentive, setIncentive] = useState(0);
  const [waived, setWaived] = useState(0);

  const result = calculateSalary({
    monthlySalary: salary,
    settings,
    leaveDays: leave,
    halfDays: 0,
    waivedDays: waived,
    waivedAmount: 0,
    incentive,
  });

  return (
    <Panel title="Salary Calculator" description="Same engine the backend uses — frontend and backend always match.">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Monthly Salary" value={salary} onChange={setSalary} />
          <Field label="Total Leave Days" value={leave} onChange={setLeave} step={0.5} />
          <Field label="Waived Leave Days" value={waived} onChange={setWaived} step={0.5} />
          <Field label="Incentive" value={incentive} onChange={setIncentive} />
        </div>
        <div className="rounded-3xl bubble-soft border border-border p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <Stat label="Daily Salary" value={inr(result.dailySalary)} />
            <Stat label="Deductible Leave" value={result.deductibleLeave} />
            <Stat label="Salary Deduction" value={inr(result.salaryDeduction)} />
            <Stat label="Final Salary" value={inr(result.finalSalary)} />
          </div>
          <ol className="mt-4 space-y-1 rounded-2xl bg-card p-4 text-xs text-muted-foreground">
            {result.steps.map((s) => (
              <li key={s}>• {s}</li>
            ))}
          </ol>
        </div>
      </div>
    </Panel>
  );
}

function Field({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  step?: number;
}) {
  const id = useId();
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        step={step}
        min={0}
        value={value}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
        className="rounded-2xl"
      />
    </div>
  );
}

function RulesPanel({ settings, onSaved }: { settings: Settings; onSaved: () => void }) {
  const save = useServerFn(updateSettings);
  const [form, setForm] = useState<Settings>(settings);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await save({
        data: {
          cycle_days: Number(form.cycle_days),
          paid_leave_days: Number(form.paid_leave_days),
          half_day_leave_value: Number(form.half_day_leave_value),
          office_start_time: form.office_start_time,
          late_grace_minutes: Number(form.late_grace_minutes),
          full_day_minutes: Number(form.full_day_minutes),
        },
      });
      toast.success("Salary rules updated. Future calculations use the new rules.");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save the rules.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel title="Salary & Attendance Rules" description="Only the Super Admin can change these values.">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Salary Cycle Days" value={form.cycle_days} onChange={(v) => setForm({ ...form, cycle_days: v })} />
        <Field label="Paid Leave Days" value={form.paid_leave_days} onChange={(v) => setForm({ ...form, paid_leave_days: v })} step={0.5} />
        <Field label="Half Day Leave Value" value={form.half_day_leave_value} onChange={(v) => setForm({ ...form, half_day_leave_value: v })} step={0.1} />
        <div className="space-y-1">
          <Label>Office Start Time</Label>
          <Input
            type="time"
            value={form.office_start_time}
            onChange={(e) => setForm({ ...form, office_start_time: e.target.value })}
            className="rounded-2xl"
          />
        </div>
        <Field label="Late Grace (minutes)" value={form.late_grace_minutes} onChange={(v) => setForm({ ...form, late_grace_minutes: v })} />
        <Field label="Full Day Minutes" value={form.full_day_minutes} onChange={(v) => setForm({ ...form, full_day_minutes: v })} />
      </div>
      <Button onClick={submit} disabled={busy} className="mt-4 rounded-2xl bubble-gradient font-bold">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Rules"}
      </Button>
    </Panel>
  );
}

function StaffPicker({ rows, value, onChange }: { rows: Row[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <Label>Employee</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="rounded-2xl">
          <SelectValue placeholder="Select employee" />
        </SelectTrigger>
        <SelectContent>
          {rows.map((r) => (
            <SelectItem key={r.profile.id} value={r.profile.id}>
              {r.profile.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function IncentivePanel({ rows, month, onSaved }: { rows: Row[]; month: string; onSaved: () => void }) {
  const add = useServerFn(addIncentive);
  const [staffId, setStaffId] = useState("");
  const [amount, setAmount] = useState(500);
  const [reason, setReason] = useState("");

  const submit = async () => {
    if (!staffId) {
      toast.error("Please select an employee.");
      return;
    }
    try {
      await add({ data: { staffId, month, amount, reason: reason.trim().slice(0, 200) } });
      toast.success("Incentive added and salary recalculated.");
      setReason("");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add the incentive.");
    }
  };

  return (
    <Panel title="Incentive Management" description={`Incentives apply to ${monthLabel(month)}.`}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StaffPicker rows={rows} value={staffId} onChange={setStaffId} />
        <Field label="Amount" value={amount} onChange={setAmount} />
        <div className="space-y-1 sm:col-span-2">
          <Label>Reason</Label>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} className="rounded-2xl" placeholder="Performance bonus" />
        </div>
      </div>
      <Button onClick={submit} className="mt-4 rounded-2xl bubble-gradient font-bold">
        Add Incentive
      </Button>
    </Panel>
  );
}

function ExceptionPanel({ rows, month, onSaved }: { rows: Row[]; month: string; onSaved: () => void }) {
  const add = useServerFn(addException);
  const [staffId, setStaffId] = useState("");
  const [days, setDays] = useState(1);
  const [reason, setReason] = useState("");

  const submit = async () => {
    if (!staffId) {
      toast.error("Please select an employee.");
      return;
    }
    try {
      await add({ data: { staffId, month, waivedDays: days, reason: reason.trim().slice(0, 200) } });
      toast.success("Exception approved. Deduction waived.");
      setReason("");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save the exception.");
    }
  };

  return (
    <Panel title="Exception / Waiver Management" description="Forgive deductible leave days for a month.">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StaffPicker rows={rows} value={staffId} onChange={setStaffId} />
        <Field label="Waived Leave Days" value={days} onChange={setDays} step={0.5} />
        <div className="space-y-1 sm:col-span-2">
          <Label>Reason</Label>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} className="rounded-2xl" placeholder="Approved medical leave" />
        </div>
      </div>
      <Button onClick={submit} className="mt-4 rounded-2xl bubble-gradient font-bold">
        Approve Exception
      </Button>
    </Panel>
  );
}

type ManagedUser = {
  id: string;
  name: string;
  staff_code: string;
  user_id: string;
  designation: string;
  department: string | null;
  branch: string | null;
  work_type: string | null;
  shift: string | null;
  mobile: string | null;
  email: string | null;
  official_start_time: string | null;
  official_end_time: string | null;
  joining_date: string;
  active: boolean;
  role: string;
  monthly_salary: number;
};

type EmployeeForm = {
  name: string;
  loginId: string;
  password: string;
  staffCode: string;
  designation: string;
  department: string;
  branch: string;
  workType: string;
  shift: string;
  mobile: string;
  email: string;
  officialStart: string;
  officialEnd: string;
  joiningDate: string;
  monthlySalary: number;
  salaryEffectiveMonth: string;
  active: boolean;
};

const emptyForm = (): EmployeeForm => ({
  name: "",
  loginId: "",
  password: "",
  staffCode: "",
  designation: "",
  department: "",
  branch: "",
  workType: "",
  shift: "",
  mobile: "",
  email: "",
  officialStart: "09:00",
  officialEnd: "18:00",
  joiningDate: new Date().toISOString().slice(0, 10),
  monthlySalary: 0,
  salaryEffectiveMonth: monthIST(),
  active: true,
});

const formFromUser = (u: ManagedUser): EmployeeForm => ({
  name: u.name,
  loginId: u.user_id,
  password: "",
  staffCode: u.staff_code ?? "",
  designation: u.designation ?? "",
  department: u.department ?? "",
  branch: u.branch ?? "",
  workType: u.work_type ?? "",
  shift: u.shift ?? "",
  mobile: u.mobile ?? "",
  email: u.email ?? "",
  officialStart: (u.official_start_time ?? "09:00").slice(0, 5),
  officialEnd: (u.official_end_time ?? "18:00").slice(0, 5),
  joiningDate: u.joining_date,
  monthlySalary: Number(u.monthly_salary ?? 0),
  salaryEffectiveMonth: monthIST(),
  active: u.active,
});


/** Free-text field with optional suggestions — nothing is forced on the Super Admin. */
function TextField({
  label,
  value,
  onChange,
  placeholder,
  type,
  suggestions,
  listId,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  suggestions?: readonly string[];
  listId?: string;
  maxLength?: number;
}) {
  const id = useId();
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        list={suggestions ? listId : undefined}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className="rounded-2xl"
      />
      {suggestions ? (
        <datalist id={listId}>
          {suggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      ) : null}
    </div>
  );
}

function EmployeeFields({
  form,
  set,
  idPrefix,
  mode,
}: {
  form: EmployeeForm;
  set: <K extends keyof EmployeeForm>(k: K, v: EmployeeForm[K]) => void;
  idPrefix: string;
  mode: "create" | "edit";
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <TextField label="Employee Name" value={form.name} onChange={(v) => set("name", v)} placeholder="Rishi" maxLength={60} />
      <div className="space-y-1">
        <Label htmlFor={`${idPrefix}-branch`}>Branch *</Label>
        <Select value={form.branch} onValueChange={(v) => set("branch", v)}>
          <SelectTrigger id={`${idPrefix}-branch`} className="rounded-2xl">
            <SelectValue placeholder="Select branch" />
          </SelectTrigger>
          <SelectContent>
            {BRANCHES.map((b) => (
              <SelectItem key={b} value={b}>
                {b}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <TextField
        label="Login User ID"
        value={form.loginId}
        onChange={(v) => set("loginId", v)}
        placeholder={mode === "create" ? (form.name.trim() ? loginIdFor(form.name.trim()) : "Auto (Name2026)") : ""}
        maxLength={60}
      />
      <div className="space-y-1">
        <Label htmlFor={`${idPrefix}-password`}>
          {mode === "create" ? "Password" : "New Password (optional)"}
        </Label>
        <PasswordInput
          id={`${idPrefix}-password`}
          value={form.password}
          onChange={(e) => set("password", e.target.value)}
          maxLength={72}
          className="rounded-2xl"
          placeholder={mode === "create" ? "Auto (Name@2026)" : "Leave blank to keep"}
        />
      </div>
      <TextField
        label="Department / Working Group"
        value={form.department}
        onChange={(v) => set("department", v)}
        placeholder="Type anything"
        maxLength={60}
      />
      <TextField label="Work / Work Type" value={form.workType} onChange={(v) => set("workType", v)} placeholder="Type anything" maxLength={60} />
      <TextField label="Position / Designation" value={form.designation} onChange={(v) => set("designation", v)} placeholder="Type anything" maxLength={60} />
      <TextField
        label="Shift"
        value={form.shift}
        onChange={(v) => set("shift", v)}
        placeholder="Type anything"
        maxLength={30}
      />
      <TextField label="Mobile" value={form.mobile} onChange={(v) => set("mobile", v)} placeholder="9876543210" maxLength={20} />
      <TextField label="Email" value={form.email} onChange={(v) => set("email", v)} placeholder="name@company.com" maxLength={120} />
      {mode === "edit" ? (
        <TextField label="Employee Code" value={form.staffCode} onChange={(v) => set("staffCode", v)} placeholder="CSC-1234" maxLength={40} />
      ) : null}
      <TextField label="Official Start Time" type="time" value={form.officialStart} onChange={(v) => set("officialStart", v)} />
      <TextField label="Official End Time" type="time" value={form.officialEnd} onChange={(v) => set("officialEnd", v)} />
      <TextField label="Joining Date" type="date" value={form.joiningDate} onChange={(v) => set("joiningDate", v)} />
      <Field label="Monthly Salary" value={form.monthlySalary} onChange={(v) => set("monthlySalary", v)} />
      {mode === "edit" ? (
        <TextField
          label="Salary Effective From"
          type="month"
          value={form.salaryEffectiveMonth}
          onChange={(v) => set("salaryEffectiveMonth", v)}
        />
      ) : null}
    </div>
  );
}

function payload(form: EmployeeForm) {
  return {
    name: form.name.trim(),
    branch: form.branch as "Colachel" | "Vadasery" | "Nagercoil",

    designation: form.designation.trim(),
    department: form.department.trim(),
    workType: form.workType.trim(),
    shift: form.shift.trim(),
    mobile: form.mobile.trim(),
    email: form.email.trim(),
    officialStart: form.officialStart || "09:00",
    officialEnd: form.officialEnd || "18:00",
    joiningDate: form.joiningDate || new Date().toISOString().slice(0, 10),
    monthlySalary: Number(form.monthlySalary) || 0,
  };
}

function UsersPanel({ onSaved }: { rows: Row[]; onSaved: () => void }) {
  const create = useServerFn(createStaff);
  const update = useServerFn(updateStaff);
  const reset = useServerFn(resetStaffPassword);
  const remove = useServerFn(deleteStaff);
  const setRole = useServerFn(setUserRole);
  const list = useServerFn(getUsers);
  const usersQuery = useQuery({ queryKey: ["users"], queryFn: () => list({}) });

  const [form, setForm] = useState<EmployeeForm>(emptyForm());
  const [role, setNewRole] = useState<"staff" | "admin">("staff");
  const [editing, setEditing] = useState<ManagedUser | null>(null);
  const [editForm, setEditForm] = useState<EmployeeForm>(emptyForm());

  const set = <K extends keyof EmployeeForm>(k: K, v: EmployeeForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));
  const setEdit = <K extends keyof EmployeeForm>(k: K, v: EmployeeForm[K]) =>
    setEditForm((f) => ({ ...f, [k]: v }));

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      toast.success(ok);
      usersQuery.refetch();
      onSaved();
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed.");
      return false;
    }
  };

  const users = (usersQuery.data?.users ?? []) as ManagedUser[];
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const visibleUsers =
    branchFilter === "all" ? users : users.filter((u) => (u.branch ?? "") === branchFilter);

  const openEdit = (u: ManagedUser) => {
    setEditForm(formFromUser(u));
    setEditing(u);
  };

  const saveEdit = async () => {
    if (!editing) return;
    if (editForm.name.trim().length < 2) {
      toast.error("Enter the employee name.");
      return;
    }
    if (!editForm.branch) {
      toast.error("Select a branch.");
      return;
    }

    if (editForm.password.trim() && editForm.password.trim().length < 6) {
      toast.error("The password must be at least 6 characters.");
      return;
    }
    const ok = await run(
      () =>
        update({
          data: {
            staffId: editing.id,
            ...payload(editForm),
            salaryEffectiveMonth: editForm.salaryEffectiveMonth || monthIST(),
            loginId: editForm.loginId.trim() || undefined,
            staffCode: editForm.staffCode.trim() || undefined,
            password: editForm.password.trim() || undefined,
            active: editForm.active,
          },
        }),
      "Employee details updated.",
    );
    if (ok) setEditing(null);
  };

  return (
    <div className="space-y-6">
      <Panel
        title="Add Employee"
        description="Every field is manual entry. Leave User ID or password blank to use the standard rules (Name2026 / Name@2026)."
      >
        <EmployeeFields form={form} set={set} idPrefix="new" mode="create" />
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setNewRole(v as "staff" | "admin")}>
              <SelectTrigger className="rounded-2xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="staff">Staff / Employee</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button
          className="mt-4 rounded-2xl bubble-gradient font-bold"
          onClick={async () => {
            const name = form.name.trim();
            if (name.length < 2) {
              toast.error("Enter the employee name.");
              return;
            }
            if (!form.branch) {
              toast.error("Select a branch.");
              return;
            }

            const loginId = form.loginId.trim() || loginIdFor(name);
            if (form.password.trim() && form.password.trim().length < 6) {
              toast.error("The password must be at least 6 characters.");
              return;
            }
            const ok = await run(
              () =>
                create({
                  data: {
                    ...payload(form),
                    loginId,
                    password: form.password.trim() || undefined,
                    role,
                  },
                }),
              `Employee created. User ID: ${loginId}`,
            );
            if (ok) setForm(emptyForm());
          }}
        >
          Create Employee
        </Button>
      </Panel>

      <Panel
        title="Manage Employees"
        description="Edit any detail — name, user ID, password, position, salary, joining date — at any time. Passwords are never shown."
        action={
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="w-[180px] rounded-2xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              {BRANCHES.map((b) => (
                <SelectItem key={b} value={b}>
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      >
        <div className="mb-3 grid gap-3 sm:grid-cols-4">
          <Stat label="All Branches" value={users.length} />
          {BRANCHES.map((b) => (
            <Stat key={b} label={b} value={users.filter((u) => (u.branch ?? "") === b).length} />
          ))}
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>User ID</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Work</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Salary</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleUsers.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-semibold">
                    {u.name}
                    <span className="block text-xs text-muted-foreground">{u.staff_code}</span>
                  </TableCell>
                  <TableCell>{u.user_id}</TableCell>
                  <TableCell>{u.branch || "—"}</TableCell>
                  <TableCell>{u.department || "—"}</TableCell>
                  <TableCell>{u.work_type || "—"}</TableCell>
                  <TableCell>
                    {u.designation}
                    <span className="block text-xs text-muted-foreground">

                      {u.shift ?? "General"} · {(u.official_start_time ?? "09:00").slice(0, 5)}–
                      {(u.official_end_time ?? "18:00").slice(0, 5)}
                    </span>
                  </TableCell>
                  <TableCell className="font-semibold">{inr(u.monthly_salary)}</TableCell>
                  <TableCell>
                    <Select
                      value={u.role}
                      onValueChange={(v) =>
                        run(() => setRole({ data: { staffId: u.id, role: v } }), "Role updated.")
                      }
                    >
                      <SelectTrigger className="w-[140px] rounded-2xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="staff">Staff</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="super_admin">Super Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={u.active}
                      onCheckedChange={(v) =>
                        run(
                          () =>
                            update({
                              data: {
                                staffId: u.id,
                                ...payload(formFromUser(u)),
                                monthlySalary: undefined,
                                loginId: u.user_id,
                                active: v,
                              },
                            }),
                          v ? "Employee activated." : "Employee deactivated.",
                        )
                      }
                    />
                  </TableCell>
                  <TableCell className="flex flex-wrap gap-2">
                    <Button size="sm" className="rounded-full bubble-gradient font-bold" onClick={() => openEdit(u)}>
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="rounded-full"
                      onClick={() => {
                        const entered = window.prompt(
                          `Set a new password for ${u.name}. Leave blank to reset to the standard initial password.`,
                          "",
                        );
                        if (entered === null) return;
                        const password = entered.trim();
                        if (password && password.length < 6) {
                          toast.error("The password must be at least 6 characters.");
                          return;
                        }
                        run(
                          () => reset({ data: password ? { staffId: u.id, password } : { staffId: u.id } }),
                          password ? "Password updated." : "Password reset to the standard initial password.",
                        );
                      }}
                    >
                      Reset Password
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="rounded-full text-destructive"
                      onClick={() => {
                        if (window.confirm(`Delete ${u.name}? This cannot be undone.`)) {
                          run(() => remove({ data: { staffId: u.id } }), "Employee deleted.");
                        }
                      }}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Panel>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Edit {editing?.name}</DialogTitle>
          </DialogHeader>
          <EmployeeFields form={editForm} set={setEdit} idPrefix="edit" mode="edit" />
          {editing ? <SalaryHistory staffId={editing.id} /> : null}
          <div className="flex items-center gap-3">
            <Switch checked={editForm.active} onCheckedChange={(v) => setEdit("active", v)} />
            <Label>Active employee</Label>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button className="rounded-2xl bubble-gradient font-bold" onClick={saveEdit}>
              Save Changes
            </Button>
            <Button variant="secondary" className="rounded-2xl" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              variant="ghost"
              className="rounded-2xl text-destructive"
              onClick={async () => {
                if (!editing) return;
                if (!window.confirm(`Delete ${editing.name}? This cannot be undone.`)) return;
                const ok = await run(() => remove({ data: { staffId: editing.id } }), "Employee deleted.");
                if (ok) setEditing(null);
              }}
            >
              Delete Employee
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Salary revisions with the month each amount takes effect from. */
function SalaryHistory({ staffId }: { staffId: string }) {
  const load = useServerFn(getSalaryHistory);
  const remove = useServerFn(deleteSalaryHistory);
  const q = useQuery({
    queryKey: ["salary-history", staffId],
    queryFn: () => load({ data: { staffId } }),
  });
  const rows = q.data?.history ?? [];

  return (
    <div className="rounded-2xl border border-border/70 p-4">
      <p className="font-display text-sm font-bold">Salary Revisions</p>
      <p className="mb-2 text-xs text-muted-foreground">
        Each amount applies from the 1st of its effective month. Earlier months keep their original salary.
      </p>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No revisions recorded yet.</p>
      ) : (
        <ul className="space-y-1">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 text-sm">
              <span>
                <span className="font-semibold">{inr(Number(r.monthly_salary))}</span>{" "}
                <span className="text-muted-foreground">from {monthLabel(r.effective_month)}</span>
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="rounded-full text-destructive"
                onClick={async () => {
                  if (!window.confirm(`Remove the ${monthLabel(r.effective_month)} salary revision?`)) return;
                  try {
                    await remove({ data: { id: r.id } });
                    toast.success("Revision removed.");
                    q.refetch();
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Action failed.");
                  }
                }}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const clockTime = (v: string | null) =>
  v ? new Date(v).toLocaleTimeString("en-GB", { timeZone: "Asia/Kolkata", hour12: true, hour: "2-digit", minute: "2-digit" }) : "—";

const duration = (m: number) => (m > 0 ? `${Math.floor(m / 60)}h ${m % 60}m` : "—");

/**
 * Permanent login / logout history. Every session is stored separately, so a
 * staff member logging in and out several times a day shows several rows.
 */
function ActivityPanel() {
  const load = useServerFn(getActivityLog);
  const [search, setSearch] = useState("");
  const [branch, setBranch] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [filters, setFilters] = useState({ search: "", branch: "all", from: "", to: "" });

  const q = useQuery({
    queryKey: ["activity", filters],
    queryFn: () =>
      load({
        data: {
          ...(filters.search ? { search: filters.search } : {}),
          branch: filters.branch,
          ...(filters.from ? { from: filters.from } : {}),
          ...(filters.to ? { to: filters.to } : {}),
        },
      }),
  });


  const rows = q.data?.rows ?? [];
  const totals = q.data?.totals;

  return (
    <Panel
      title="Employee Login / Logout History"
      description="Every session is stored permanently. Search by employee name, branch and date range — filters work alone or together."
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-1">
          <Label htmlFor="activity-search">Employee Name</Label>
          <Input
            id="activity-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name"
            className="rounded-2xl"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="activity-branch">Branch</Label>
          <Select value={branch} onValueChange={setBranch}>
            <SelectTrigger id="activity-branch" className="rounded-2xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              {BRANCHES.map((b) => (
                <SelectItem key={b} value={b}>
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="activity-from">From Date</Label>
          <Input id="activity-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-2xl" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="activity-to">To Date</Label>
          <Input id="activity-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-2xl" />
        </div>
        <div className="flex items-end gap-2">
          <Button
            className="rounded-2xl bubble-gradient font-bold"
            onClick={() => setFilters({ search, branch, from, to })}
          >
            Search
          </Button>
          <Button
            variant="secondary"
            className="rounded-2xl"
            onClick={() => {
              setSearch("");
              setBranch("all");
              setFrom("");
              setTo("");
              setFilters({ search: "", branch: "all", from: "", to: "" });
            }}
          >
            Clear
          </Button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Stat label="Sessions" value={totals?.sessions ?? 0} />
        <Stat label="Employees" value={totals?.employees ?? 0} />
        <Stat label="Total Time" value={duration(totals?.minutes ?? 0)} />
      </div>

      <div className="mt-4 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Employee</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead>Login Time</TableHead>
              <TableHead>Logout Time</TableHead>
              <TableHead>Session Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-sm text-muted-foreground">
                  No login records for these filters.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap">{r.workDate}</TableCell>
                  <TableCell className="font-semibold">
                    {r.name}
                    <span className="block text-xs text-muted-foreground">{r.staffCode}</span>
                  </TableCell>
                  <TableCell>{r.branch || "—"}</TableCell>
                  <TableCell>{clockTime(r.loginTime)}</TableCell>
                  <TableCell>{r.logoutTime ? clockTime(r.logoutTime) : "Still logged in"}</TableCell>
                  <TableCell>{duration(r.minutes)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </Panel>
  );
}

