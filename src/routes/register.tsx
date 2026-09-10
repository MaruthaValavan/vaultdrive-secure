import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { signInWithGoogle } from "@/lib/google-auth";
import { AuthLayout } from "@/routes/login";
import { useAuthStore } from "@/store/authStore";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create account — VaultDrive" },
      { name: "description", content: "Create a free VaultDrive account and start storing files securely." },
      { property: "og:title", content: "Create account — VaultDrive" },
      { property: "og:description", content: "Create a free VaultDrive account and start storing files securely." },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Use at least 8 characters for your password.");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/drive`,
        data: { display_name: displayName },
      },
    });
    setBusy(false);
    if (error) {
      if (error.message.toLowerCase().includes("already")) {
        toast.error("That email already has an account. Please sign in instead.");
        navigate({ to: "/login" });
      } else {
        toast.error(error.message);
      }
      return;
    }
    if (!data.session) {
      if (data.user && data.user.identities?.length === 0) {
        toast.error("That email already has an account. Please sign in instead.");
        navigate({ to: "/login" });
        return;
      }
      toast.success("Almost there — check your email and confirm your address to finish.");
      return;
    }
    useAuthStore.getState().setSession(data.session);
    await useAuthStore.getState().refreshProfile();
    toast.success("Welcome to VaultDrive!");
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
    <AuthLayout title="Create your vault" subtitle="5 GB of secure storage, free to start.">
      <form className="space-y-4" onSubmit={signUp}>
        <div className="space-y-2">
          <Label htmlFor="name">Display name</Label>
          <Input id="name" required value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </div>
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
          Create account
        </Button>
      </form>

      <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
      </div>

      <Button variant="outline" className="w-full" onClick={google}>
        Continue with Google
      </Button>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link to="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
