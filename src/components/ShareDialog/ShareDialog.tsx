import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, Link2, Trash2, UserPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createShare } from "@/lib/vault.functions";
import { supabase } from "@/integrations/supabase/client";

export type ShareTarget = { type: "file" | "folder"; id: string; name: string };

const ERRORS: Record<string, string> = {
  USER_NOT_FOUND: "No VaultDrive account uses that email yet.",
  CANNOT_SHARE_WITH_SELF: "That's your own account.",
  FORBIDDEN: "You can only share items you own.",
};

export function ShareDialog({
  target,
  onOpenChange,
}: {
  target: ShareTarget | null;
  onOpenChange: (open: boolean) => void;
}) {
  const share = useServerFn(createShare);
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"viewer" | "editor">("viewer");
  const [password, setPassword] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: existing = [] } = useQuery({
    queryKey: ["shares", target?.id],
    enabled: Boolean(target),
    queryFn: async () => {
      const { data } = await supabase
        .from("shares")
        .select("id, role, shared_with_user_id, link_token, link_expires_at, created_at")
        .eq("resource_id", target!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["shares", target?.id] });
  }

  async function invite() {
    if (!target) return;
    setBusy(true);
    try {
      await share({
        data: { resourceType: target.type, resourceId: target.id, mode: "user", email, role },
      });
      toast.success(`Shared with ${email}`);
      setEmail("");
      refresh();
    } catch (error) {
      const key = error instanceof Error ? error.message : "";
      toast.error(ERRORS[key] ?? "Could not share this item");
    } finally {
      setBusy(false);
    }
  }

  async function makeLink() {
    if (!target) return;
    setBusy(true);
    try {
      const result = await share({
        data: {
          resourceType: target.type,
          resourceId: target.id,
          mode: "link",
          role,
          password: password || undefined,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
        },
      });
      if (result.kind === "link") {
        const url = `${window.location.origin}/share/${result.token}`;
        await navigator.clipboard.writeText(url).catch(() => undefined);
        toast.success("Link created and copied to clipboard");
      }
      setPassword("");
      setExpiresAt("");
      refresh();
    } catch {
      toast.error("Could not create the link");
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    await supabase.from("shares").delete().eq("id", id);
    toast.success("Access revoked");
    refresh();
  }

  return (
    <Dialog open={Boolean(target)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Share “{target?.name}”</DialogTitle>
          <DialogDescription>
            Invite specific people, or create a link anyone can open.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="people">
          <TabsList className="w-full">
            <TabsTrigger value="people" className="flex-1">
              <UserPlus className="mr-2 size-4" />
              Invite people
            </TabsTrigger>
            <TabsTrigger value="link" className="flex-1">
              <Link2 className="mr-2 size-4" />
              Get link
            </TabsTrigger>
          </TabsList>

          <TabsContent value="people" className="space-y-3 pt-4">
            <div className="space-y-2">
              <Label htmlFor="share-email">Email address</Label>
              <Input
                id="share-email"
                type="email"
                placeholder="teammate@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <RoleSelect role={role} setRole={setRole} />
            <Button className="w-full" disabled={busy || !email} onClick={invite}>
              Send invite
            </Button>
          </TabsContent>

          <TabsContent value="link" className="space-y-3 pt-4">
            <RoleSelect role={role} setRole={setRole} />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="share-expiry">Expires (optional)</Label>
                <Input
                  id="share-expiry"
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="share-password">Password (optional)</Label>
                <Input
                  id="share-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
            <Button className="w-full" disabled={busy} onClick={makeLink}>
              <Copy className="mr-2 size-4" />
              Create link
            </Button>
          </TabsContent>
        </Tabs>

        {existing.length > 0 && (
          <div className="space-y-2 border-t pt-4">
            <p className="text-xs font-medium text-muted-foreground">Current access</p>
            {existing.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-2 rounded-lg border p-2">
                <div className="min-w-0 text-sm">
                  <p className="truncate">
                    {s.link_token ? "Public link" : "Invited person"}
                    {s.link_expires_at ? ` · expires ${new Date(s.link_expires_at).toLocaleDateString()}` : ""}
                  </p>
                  {s.link_token && (
                    <button
                      className="truncate text-xs text-primary underline"
                      onClick={() =>
                        navigator.clipboard.writeText(`${window.location.origin}/share/${s.link_token}`)
                      }
                    >
                      Copy link
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{s.role}</Badge>
                  <Button variant="ghost" size="icon" onClick={() => revoke(s.id)} aria-label="Revoke">
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function RoleSelect({
  role,
  setRole,
}: {
  role: "viewer" | "editor";
  setRole: (r: "viewer" | "editor") => void;
}) {
  return (
    <div className="space-y-2">
      <Label>Permission</Label>
      <Select value={role} onValueChange={(v) => setRole(v as "viewer" | "editor")}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="viewer">Viewer — can view and download</SelectItem>
          <SelectItem value="editor">Editor — can also rename and move</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
