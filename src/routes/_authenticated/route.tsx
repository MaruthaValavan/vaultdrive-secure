import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell/AppShell";
import { useAuthStore } from "@/store/authStore";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/login" });
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const refreshProfile = useAuthStore((s) => s.refreshProfile);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      useAuthStore.getState().setSession(data.session);
      refreshProfile();
    });
  }, [refreshProfile]);

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
