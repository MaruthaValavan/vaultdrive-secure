import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { adminListUsers, adminUpdateUser } from "@/lib/vault.functions";
import { formatBytes } from "@/lib/format";
import { useAuthStore } from "@/store/authStore";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — VaultDrive" },
      { name: "description", content: "Manage VaultDrive accounts, storage quotas and suspensions." },
      { property: "og:title", content: "Admin — VaultDrive" },
      { property: "og:description", content: "Manage VaultDrive accounts, storage quotas and suspensions." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const list = useServerFn(adminListUsers);
  const update = useServerFn(adminUpdateUser);
  const queryClient = useQueryClient();
  const [quotaDraft, setQuotaDraft] = useState<Record<string, string>>({});

  const users = useQuery({
    queryKey: ["admin-users"],
    enabled: isAdmin,
    queryFn: () => list(),
  });

  async function apply(
    userId: string,
    payload: { isSuspended?: boolean | undefined; quotaBytes?: number | undefined },
  ) {
    try {
      await update({ data: { userId, ...payload } });
      toast.success("Account updated");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch {
      toast.error("Could not update that account");
    }
  }

  if (!isAdmin) {
    return (
      <p className="mx-auto max-w-2xl rounded-xl border bg-card p-6 text-sm text-muted-foreground">
        You don't have permission to view this page.
      </p>
    );
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5">
      <h1 className="font-display text-2xl font-semibold tracking-tight">Admin</h1>

      {users.isLoading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account</TableHead>
                <TableHead>Storage</TableHead>
                <TableHead>Quota (GB)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(users.data ?? []).map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <p className="font-medium">{u.display_name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </TableCell>
                  <TableCell className="text-sm">{formatBytes(Number(u.storage_used_bytes))}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Input
                        className="w-20"
                        inputMode="decimal"
                        value={
                          quotaDraft[u.id] ??
                          String(Math.round((Number(u.storage_quota_bytes) / 1024 ** 3) * 10) / 10)
                        }
                        onChange={(e) => setQuotaDraft({ ...quotaDraft, [u.id]: e.target.value })}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const value = Number(quotaDraft[u.id]);
                          if (!Number.isFinite(value) || value <= 0) {
                            toast.error("Enter a valid size");
                            return;
                          }
                          apply(u.id, { quotaBytes: Math.round(value * 1024 ** 3) });
                        }}
                      >
                        Set
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.is_suspended ? "destructive" : "secondary"}>
                      {u.is_suspended ? "Suspended" : "Active"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant={u.is_suspended ? "outline" : "destructive"}
                      onClick={() => apply(u.id, { isSuspended: !u.is_suspended })}
                    >
                      {u.is_suspended ? "Reinstate" : "Suspend"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
