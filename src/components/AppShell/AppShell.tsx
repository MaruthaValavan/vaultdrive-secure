import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  HardDrive,
  Users2,
  Search,
  Settings,
  ShieldCheck,
  LogOut,
  Menu,
  CloudUpload,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { NotificationsDrawer } from "@/components/NotificationsDrawer/NotificationsDrawer";
import { useAuthStore } from "@/store/authStore";
import { formatBytes } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";

const NAV = [
  { to: "/drive", label: "My Files", icon: HardDrive },
  { to: "/shared-with-me", label: "Shared with me", icon: Users2 },
  { to: "/search", label: "Search", icon: Search },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { profile, isAdmin } = useAuthStore();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const used = Number(profile?.storage_used_bytes ?? 0);
  const quota = Number(profile?.storage_quota_bytes ?? 1);
  const pct = Math.min(100, Math.round((used / quota) * 100));

  return (
    <div className="flex h-full flex-col gap-6 p-5">
      <Link to="/drive" className="flex items-center gap-2" onClick={onNavigate}>
        <span className="brand-gradient flex size-9 items-center justify-center rounded-xl text-primary-foreground">
          <CloudUpload className="size-5" />
        </span>
        <span className="font-display text-lg font-semibold tracking-tight">VaultDrive</span>
      </Link>

      <nav className="flex flex-1 flex-col gap-1">
        {NAV.map((item) => {
          const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
              }`}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
        {isAdmin && (
          <Link
            to="/admin"
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              pathname === "/admin"
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
            }`}
          >
            <ShieldCheck className="size-4" />
            Admin
          </Link>
        )}
      </nav>

      <div className="rounded-xl border bg-card p-4">
        <p className="text-xs font-medium text-muted-foreground">Storage</p>
        <Progress value={pct} className="mt-2" />
        <p className="mt-2 text-xs text-muted-foreground">
          {formatBytes(used)} of {formatBytes(quota)} used
        </p>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { profile, user } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 border-r bg-sidebar lg:block">
        <SidebarContent />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b bg-background/80 px-4 py-3 backdrop-blur">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 bg-sidebar p-0">
              <SidebarContent onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {profile?.display_name ?? user?.email ?? "Your drive"}
            </p>
          </div>

          <NotificationsDrawer />
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="size-4" />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </header>

        <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
