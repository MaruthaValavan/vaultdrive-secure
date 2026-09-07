import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/store/authStore";
import { formatBytes } from "@/lib/format";
import { deleteMyAccount } from "@/lib/vault.functions";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — VaultDrive" },
      { name: "description", content: "Update your profile, review storage use and manage your account." },
      { property: "og:title", content: "Settings — VaultDrive" },
      { property: "og:description", content: "Update your profile, review storage use and manage your account." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { profile, user, refreshProfile } = useAuthStore();
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const removeAccount = useServerFn(deleteMyAccount);

  useEffect(() => {
    setDisplayName(profile?.display_name ?? "");
  }, [profile?.display_name]);

  const used = Number(profile?.storage_used_bytes ?? 0);
  const quota = Number(profile?.storage_quota_bytes ?? 1);

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName })
      .eq("id", user!.id);
    setSaving(false);
    if (error) toast.error("Could not save your profile");
    else {
      toast.success("Profile saved");
      refreshProfile();
    }
  }

  async function destroy() {
    try {
      await removeAccount({ data: {} });
      await supabase.auth.signOut();
      navigate({ to: "/", replace: true });
    } catch {
      toast.error("Could not delete the account");
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold tracking-tight">Settings</h1>

      <section className="space-y-4 rounded-xl border bg-card p-5">
        <h2 className="text-base font-semibold">Profile</h2>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={profile?.email ?? user?.email ?? ""} disabled />
        </div>
        <div className="space-y-2">
          <Label htmlFor="name">Display name</Label>
          <Input id="name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </div>
        <Button onClick={save} disabled={saving}>
          Save changes
        </Button>
      </section>

      <section className="space-y-3 rounded-xl border bg-card p-5">
        <h2 className="text-base font-semibold">Storage</h2>
        <Progress value={Math.min(100, Math.round((used / quota) * 100))} />
        <p className="text-sm text-muted-foreground">
          {formatBytes(used)} used of {formatBytes(quota)}
        </p>
      </section>

      <section className="space-y-3 rounded-xl border border-destructive/40 bg-card p-5">
        <h2 className="text-base font-semibold text-destructive">Delete account</h2>
        <p className="text-sm text-muted-foreground">
          This permanently removes your account and every file you have stored.
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive">Delete my account</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete your account?</AlertDialogTitle>
              <AlertDialogDescription>
                Everything you uploaded will be erased. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={destroy}>Delete permanently</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </section>
    </div>
  );
}
