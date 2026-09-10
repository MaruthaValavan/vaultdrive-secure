import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/store/authStore";

export const Route = createFileRoute("/auth/callback")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Signing you in — VaultDrive" },
      { name: "description", content: "Finishing your VaultDrive sign-in." },
      { property: "og:title", content: "Signing you in — VaultDrive" },
      { property: "og:description", content: "Finishing your VaultDrive sign-in." },
    ],
  }),
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("Signing you in…");

  useEffect(() => {
    let cancelled = false;

    async function finish() {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      const errorDescription =
        url.searchParams.get("error_description") ?? url.searchParams.get("error");

      if (errorDescription) {
        if (!cancelled) setMessage("Google sign-in didn't complete. Redirecting you back…");
        setTimeout(() => navigate({ to: "/login" }), 1500);
        return;
      }

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          if (!cancelled) setMessage("We couldn't finish signing you in. Redirecting…");
          setTimeout(() => navigate({ to: "/login" }), 1500);
          return;
        }
      }

      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        if (!cancelled) setMessage("No sign-in found. Redirecting…");
        setTimeout(() => navigate({ to: "/login" }), 1200);
        return;
      }

      useAuthStore.getState().setSession(data.session);
      await useAuthStore.getState().refreshProfile();
      if (!cancelled) navigate({ to: "/drive" });
    }

    void finish();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        {message}
      </div>
    </div>
  );
}
