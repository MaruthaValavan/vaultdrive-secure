import { create } from "zustand";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  email: string | null;
  is_suspended: boolean;
  storage_quota_bytes: number;
  storage_used_bytes: number;
};

type AuthState = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
  setSession: (session: Session | null) => void;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  isAdmin: false,
  loading: true,
  setSession: (session) => set({ session, user: session?.user ?? null, loading: false }),
  refreshProfile: async () => {
    const user = get().user;
    if (!user) {
      set({ profile: null, isAdmin: false });
      return;
    }
    const [{ data: profile }, { data: roles }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, display_name, avatar_url, email, is_suspended, storage_quota_bytes, storage_used_bytes")
        .eq("id", user.id)
        .maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", user.id),
    ]);
    set({
      profile: (profile as Profile | null) ?? null,
      isAdmin: Boolean(roles?.some((r) => r.role === "admin")),
    });
  },
  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null, profile: null, isAdmin: false });
  },
}));
