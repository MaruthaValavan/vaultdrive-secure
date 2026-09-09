import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { CloudUpload, Download, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resolvePublicShare } from "@/lib/vault.functions";
import { formatBytes } from "@/lib/format";

export const Route = createFileRoute("/share/$token")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Shared files — VaultDrive" },
      { name: "description", content: "Someone shared files with you through a VaultDrive link." },
      { property: "og:title", content: "Shared files — VaultDrive" },
      { property: "og:description", content: "Someone shared files with you through a VaultDrive link." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SharePage,
});

const MESSAGES: Record<string, string> = {
  LINK_INVALID: "This link is no longer valid.",
  LINK_EXPIRED: "This link has expired.",
  INVALID_PASSWORD: "That password isn't right.",
};

function SharePage() {
  const { token } = Route.useParams();
  const resolve = useServerFn(resolvePublicShare);
  const [password, setPassword] = useState("");

  const query = useMutation({
    mutationFn: (pwd?: string) => resolve({ data: { token, password: pwd } }),
  });

  const result = query.data;
  const run = query.mutate;
  useEffect(() => {
    run(undefined);
  }, [run, token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-12">
      <div className="w-full max-w-lg rounded-2xl border bg-card p-8 shadow-panel">
        <div className="mb-6 flex items-center gap-2">
          <span className="brand-gradient flex size-9 items-center justify-center rounded-xl text-primary-foreground">
            <CloudUpload className="size-5" />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">VaultDrive</span>
        </div>

        {query.isPending && <p className="text-sm text-muted-foreground">Opening the link…</p>}

        {result?.status === "PASSWORD_REQUIRED" || result?.status === "INVALID_PASSWORD" ? (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              query.mutate(password);
            }}
          >
            <div className="flex items-center gap-2 text-sm font-medium">
              <Lock className="size-4" />
              This link is password protected
            </div>
            <div className="space-y-2">
              <Label htmlFor="pwd">Password</Label>
              <Input id="pwd" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            {result.status === "INVALID_PASSWORD" && (
              <p className="text-sm text-destructive">{MESSAGES["INVALID_PASSWORD"]}</p>
            )}
            <Button type="submit" className="w-full">
              Unlock
            </Button>
          </form>
        ) : null}

        {result && (result.status === "LINK_INVALID" || result.status === "LINK_EXPIRED") && (
          <p className="text-sm text-muted-foreground">{MESSAGES[result.status]}</p>
        )}

        {result?.status === "OK" && (
          <div className="space-y-4">
            <div>
              <h1 className="font-display text-xl font-semibold tracking-tight">{result.title}</h1>
              <p className="text-sm text-muted-foreground">
                {result.items.length} {result.items.length === 1 ? "file" : "files"} shared with you
              </p>
            </div>
            <div className="divide-y rounded-xl border">
              {result.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{formatBytes(item.size)}</p>
                  </div>
                  <Button size="sm" variant="outline" asChild>
                    <a href={item.url} download={item.name}>
                      <Download className="mr-2 size-4" />
                      Download
                    </a>
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
