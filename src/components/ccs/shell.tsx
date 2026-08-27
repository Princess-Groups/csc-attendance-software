import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, Sparkles } from "lucide-react";
import { STATUS_LABEL } from "@/lib/ccs-constants";

import type { ReactNode } from "react";

export type Role = "staff" | "admin" | "super_admin";

const roleLabel: Record<Role, string> = {
  staff: "Staff Portal",
  admin: "Admin Portal",
  super_admin: "Super Admin Portal",
};

export function Shell({
  role,
  name,
  children,
}: {
  role: Role;
  name: string;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-card/80 backdrop-blur-xl">
        <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:flex sm:justify-between sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bubble-gradient shadow-[var(--shadow-bubble)]">
              <Sparkles className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate font-display text-lg font-bold leading-tight">CSC Attendance</p>
              <p className="truncate text-xs text-muted-foreground">{roleLabel[role]}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <nav className="hidden items-center gap-1 md:flex">
              {role === "staff" && <NavLink to="/staff">My Dashboard</NavLink>}
              {role !== "staff" && <NavLink to="/admin">Admin</NavLink>}
              {role === "super_admin" && <NavLink to="/super">Super Admin</NavLink>}
            </nav>
            <span className="hidden rounded-full bg-bubble-tint px-3 py-1.5 text-sm font-semibold sm:inline">
              {name}
            </span>
            <Button variant="ghost" size="icon" className="rounded-full" onClick={signOut} aria-label="Sign out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <nav className="flex items-center gap-1 overflow-x-auto px-4 pb-2 md:hidden">
          {role === "staff" && <NavLink to="/staff">My Dashboard</NavLink>}
          {role !== "staff" && <NavLink to="/admin">Admin</NavLink>}
          {role === "super_admin" && <NavLink to="/super">Super Admin</NavLink>}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}

function NavLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-bubble-tint hover:text-foreground"
      activeProps={{ className: "bg-primary text-primary-foreground hover:bg-primary" }}
    >
      {children}
    </Link>
  );
}

export function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <div className="stat-pill">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold">{value}</p>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function Panel({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="bubble-card p-5 sm:p-6">
      <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:flex sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="font-display text-lg font-bold">{title}</h2>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    present: "bg-success/15 text-success",
    half_day: "bg-warning/25 text-warning-foreground",
    leave: "bg-primary/15 text-primary",
    permission: "bg-warning/20 text-warning-foreground",
    absent: "bg-destructive/15 text-destructive",
    holiday: "bg-bubble-tint text-foreground",
    week_off: "bg-muted text-muted-foreground",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${map[status] ?? "bg-muted text-muted-foreground"}`}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

