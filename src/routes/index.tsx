import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { bootstrapSystem, getMe } from "@/lib/ccs.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { PasswordInput } from "@/components/ui/password-input";
import { Loader2, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CSC Attendance & Salary Management | Secure Staff Login" },
      {
        name: "description",
        content:
          "Sign in to the CSC attendance and salary system: staff attendance, leave, late tracking and automatic 30-day salary calculation.",
      },
      { property: "og:title", content: "CSC Attendance & Salary Management | Secure Staff Login" },
      {
        property: "og:description",
        content:
          "Sign in to the CSC attendance and salary system: staff attendance, leave, late tracking and automatic 30-day salary calculation.",
      },
    ],
  }),
  component: LoginPage,
});

const roleHome = { staff: "/staff", admin: "/admin", super_admin: "/super" } as const;

function LoginPage() {
  const navigate = useNavigate();
  const me = useServerFn(getMe);
  const bootstrap = useServerFn(bootstrapSystem);
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!alive) return;
      if (data.session) {
        try {
          const res = await me({});
          navigate({ to: roleHome[res.role], replace: true });
          return;
        } catch {
          /* fall through to the login form */
        }
      }
      setChecking(false);
    })();
    return () => {
      alive = false;
    };
  }, [me, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = userId.trim();
    if (id.length < 3 || password.length < 4) {
      toast.error("Please enter a valid User ID and password.");
      return;
    }
    setBusy(true);
    try {
      await bootstrap({});
      const { error } = await supabase.auth.signInWithPassword({
        email: `${id.toLowerCase()}@ccs.local`,
        password,
      });
      if (error) {
        toast.error("Incorrect User ID or password.");
        return;
      }
      const res = await me({});
      if (res.profile && res.profile.active === false) {
        await supabase.auth.signOut();
        toast.error("Your account has been deactivated. Please contact the Admin.");
        return;
      }
      toast.success(`Welcome back, ${res.profile?.name ?? id}!`);
      navigate({ to: roleHome[res.role], replace: true });
    } catch {
      toast.error("Something went wrong while signing in. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (checking) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="grid min-h-screen items-center justify-items-center px-4 py-10">
      <div className="w-full max-w-5xl overflow-hidden bubble-card">
        <div className="grid md:grid-cols-2">
          <div className="bubble-gradient relative hidden flex-col justify-center p-10 md:flex">
            <span className="grid h-14 w-14 place-items-center rounded-3xl bg-card/25">
              <Sparkles className="h-7 w-7" />
            </span>
            <h1 className="mt-6 font-display text-4xl font-extrabold leading-tight">
              CSC Attendance &amp; Salary
            </h1>
          </div>

          <div className="p-8 sm:p-10">
            <h2 className="font-display text-2xl font-bold">Sign in</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter the User ID given to you by your Admin.
            </p>


            <form className="mt-6 space-y-4" onSubmit={submit}>
              <div className="space-y-2">
                <Label htmlFor="userId">User ID</Label>
                <Input
                  id="userId"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="Your User ID"
                  autoComplete="username"
                  maxLength={60}
                  className="rounded-2xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <PasswordInput
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  maxLength={72}
                  className="rounded-2xl"
                />
              </div>
              <Button
                type="submit"
                disabled={busy}
                className="w-full rounded-2xl bubble-gradient py-6 text-base font-bold shadow-[var(--shadow-bubble)] hover:opacity-95"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enter Portal"}
              </Button>
            </form>

            <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
              Forgot your password? Please contact your Admin — they can reset it for you.
            </p>

          </div>

        </div>
      </div>
    </div>
  );
}
