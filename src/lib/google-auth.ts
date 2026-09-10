import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

// The Lovable OAuth broker lives at the relative path `/~oauth/initiate`, which only
// exists on Lovable-hosted domains. Anywhere else (e.g. Vercel) that path 404s, so we
// fall back to Supabase's own Google OAuth flow.
function isLovableHosted(): boolean {
  const host = window.location.hostname;
  return (
    host.endsWith(".lovable.app") ||
    host.endsWith(".lovable.dev") ||
    host === "localhost" ||
    host === "127.0.0.1"
  );
}

export type GoogleSignInResult = { error: Error | null; redirected: boolean };

export async function signInWithGoogle(): Promise<GoogleSignInResult> {
  if (isLovableHosted()) {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    return {
      error: result.error ?? null,
      redirected: Boolean((result as { redirected?: boolean }).redirected),
    };
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${window.location.origin}/auth/callback` },
  });
  if (error) return { error, redirected: false };
  return { error: null, redirected: true };
}
