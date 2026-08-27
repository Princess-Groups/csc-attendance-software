/** Shared, non-sensitive option lists used across the CSC attendance UI. */

/** The three CSC branches. Branch is a required employee field. */
export const BRANCHES = ["Colachel", "Vadasery", "Nagercoil"] as const;
export type Branch = (typeof BRANCHES)[number];


export const ATTENDANCE_STATUSES = [
  "present",
  "half_day",
  "leave",
  "permission",
  "absent",
  "holiday",
  "week_off",
] as const;

export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export const STATUS_LABEL: Record<string, string> = {
  present: "Present",
  half_day: "Half Day",
  leave: "Leave",
  permission: "Permission",
  absent: "Absent",
  holiday: "Holiday",
  week_off: "Week Off",
};

/** Initial password rule: Employee Name + @2026 (spaces removed). */
export const defaultPasswordFor = (name: string) => `${name.replace(/\s+/g, "")}@2026`;

/** Login User ID rule: Employee Name + 2026 (spaces removed). */
export const loginIdFor = (name: string) => `${name.replace(/\s+/g, "")}2026`;
