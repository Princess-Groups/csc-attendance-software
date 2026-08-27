/**
 * CSC centralized salary calculation engine.
 * Used by the backend (server functions) and re-displayed on the frontend so
 * both always show exactly the same numbers.
 */

export type SalarySettings = {
  cycle_days: number;
  paid_leave_days: number;
  half_day_leave_value: number;
  office_start_time: string;
  late_grace_minutes: number;
  full_day_minutes: number;
};

export type SalaryInput = {
  monthlySalary: number;
  settings: SalarySettings;
  /** Total leave days recorded in the leave register (0.5 / 1 per record). */
  leaveDays: number;
  /** Number of half-day attendance records in the month. */
  halfDays: number;
  /** Leave days waived by Super Admin exceptions. */
  waivedDays: number;
  /** Flat amount waived by Super Admin exceptions. */
  waivedAmount: number;
  /** Approved incentives for the month. */
  incentive: number;
};

export type SalaryResult = {
  monthlySalary: number;
  salaryDays: number;
  dailySalary: number;
  leaveFromRegister: number;
  leaveFromHalfDays: number;
  totalLeave: number;
  paidLeave: number;
  waivedLeave: number;
  deductibleLeave: number;
  salaryDeduction: number;
  waivedAmount: number;
  incentive: number;
  adjustedSalary: number;
  finalSalary: number;
  steps: string[];
};

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function calculateSalary(input: SalaryInput): SalaryResult {
  const monthlySalary = Math.max(0, Number(input.monthlySalary) || 0);
  const salaryDays = Math.max(1, Number(input.settings.cycle_days) || 30);
  const dailySalary = round2(monthlySalary / salaryDays);

  const leaveFromRegister = Math.max(0, Number(input.leaveDays) || 0);
  const leaveFromHalfDays = round2(
    Math.max(0, Number(input.halfDays) || 0) * (Number(input.settings.half_day_leave_value) || 0.5),
  );
  const totalLeave = round2(leaveFromRegister + leaveFromHalfDays);

  const paidLeaveAllowance = Math.max(0, Number(input.settings.paid_leave_days) || 0);
  const paidLeave = round2(Math.min(totalLeave, paidLeaveAllowance));
  const waivedLeave = round2(Math.max(0, Math.min(input.waivedDays || 0, totalLeave - paidLeave)));

  const deductibleLeave = round2(Math.max(0, totalLeave - paidLeave - waivedLeave));
  const rawDeduction = round2(dailySalary * deductibleLeave);
  const waivedAmount = round2(Math.max(0, input.waivedAmount || 0));
  const salaryDeduction = round2(Math.min(monthlySalary, Math.max(0, rawDeduction - waivedAmount)));

  const adjustedSalary = round2(Math.max(0, monthlySalary - salaryDeduction));
  const incentive = round2(Math.max(0, Number(input.incentive) || 0));
  const finalSalary = round2(adjustedSalary + incentive);

  const steps = [
    `Daily Salary = ${monthlySalary} ÷ ${salaryDays} = ${dailySalary}`,
    `Total Leave = ${leaveFromRegister} (leave register) + ${leaveFromHalfDays} (half days) = ${totalLeave}`,
    `Paid Leave = min(Total Leave, ${paidLeaveAllowance}) = ${paidLeave}`,
    `Waived Leave (exceptions) = ${waivedLeave}`,
    `Deductible Leave = ${totalLeave} - ${paidLeave} - ${waivedLeave} = ${deductibleLeave}`,
    `Salary Deduction = ${dailySalary} × ${deductibleLeave} - ${waivedAmount} (waived) = ${salaryDeduction}`,
    `Adjusted Salary = ${monthlySalary} - ${salaryDeduction} = ${adjustedSalary}`,
    `Final Salary = ${adjustedSalary} + ${incentive} (incentive) = ${finalSalary}`,
  ];

  return {
    monthlySalary,
    salaryDays,
    dailySalary,
    leaveFromRegister,
    leaveFromHalfDays,
    totalLeave,
    paidLeave,
    waivedLeave,
    deductibleLeave,
    salaryDeduction,
    waivedAmount,
    incentive,
    adjustedSalary,
    finalSalary,
    steps,
  };
}

export const inr = (n: number) =>
  `₹${(Number(n) || 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

/** Current date in the office timezone (IST), as YYYY-MM-DD. */
export function todayIST(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

/** Current month in the office timezone (IST), as YYYY-MM. */
export function monthIST(): string {
  return todayIST().slice(0, 7);
}

export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, 1).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

export function daysInMonth(month: string): number {
  const [y, m] = month.split("-").map(Number);
  return new Date(y!, m!, 0).getDate();
}

export function formatTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatDate(d: string | null): string {
  if (!d) return "—";
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, day ?? 1).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDuration(minutes: number): string {
  const mins = Math.max(0, Math.round(minutes || 0));
  return `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, "0")}m`;
}

/** Minutes late compared to the employee's official start time (IST). */
export function lateMinutes(
  loginISO: string,
  settings: SalarySettings,
  officialStart?: string | null,
): number {
  const local = new Date(loginISO).toLocaleTimeString("en-GB", {
    timeZone: "Asia/Kolkata",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });
  const [lh, lm] = local.split(":").map(Number);
  const start = officialStart || settings.office_start_time || "09:00";
  const [sh, sm] = start.split(":").map(Number);
  const diff = lh! * 60 + lm! - (sh! * 60 + sm!);
  return Math.max(0, diff - (settings.late_grace_minutes || 0));
}

