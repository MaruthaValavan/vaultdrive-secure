import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { CloudUpload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { signInWithGoogle } from "@/lib/google-auth";
import { useAuthStore } from "@/store/authStore";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — VaultDrive" },
      { name: "description", content: "Sign in to VaultDrive to reach your files from anywhere." },
      { property: "og:title", content: "Sign in — VaultDrive" },
      { property: "og:description", content: "Sign in to VaultDrive to reach your files from anywhere." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setBusy(false);
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("confirm")) {
        toast.error("Please confirm your email address first — check your inbox.");
      } else {
        toast.error("That email and password don't match an account.");
      }
      return;
    }
    useAuthStore.getState().setSession(data.session);
    await useAuthStore.getState().refreshProfile();
    navigate({ to: "/drive" });
  }

  async function google() {
    const result = await signInWithGoogle();
    if (result.error) {
      toast.error("Google sign-in didn't work. Please try again.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/drive" });
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to reach your files.">
      <form className="space-y-4" onSubmit={signIn}>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button type="submit" className="w-full" disabled={busy}>
          Sign in
        </Button>
      </form>

      <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
      </div>

      <Button variant="outline" className="w-full" onClick={google}>
        Continue with Google
      </Button>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link to="/register" className="font-medium text-primary hover:underline">
          Create an account
        </Link>
      </p>
    </AuthLayout>
  );
}

export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-panel">
        <div className="mb-6 flex items-center gap-2">
          <span className="brand-gradient flex size-9 items-center justify-center rounded-xl text-primary-foreground">
            <CloudUpload className="size-5" />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">VaultDrive</span>
        </div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mb-6 mt-1 text-sm text-muted-foreground">{subtitle}</p>
        {children}
      </div>
    </div>
  );
}
