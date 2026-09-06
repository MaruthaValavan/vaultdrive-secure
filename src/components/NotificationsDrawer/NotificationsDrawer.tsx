import { useEffect } from "react";
import { Bell } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/store/authStore";
import { formatDate } from "@/lib/format";

type Notification = {
  id: string;
  type: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

export function NotificationsDrawer() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const { data = [] } = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("id, type, message, is_read, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      return (data ?? []) as Notification[];
    },
  });

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("notifications-feed")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `owner_id=eq.${user.id}` },
        () => queryClient.invalidateQueries({ queryKey: ["notifications", user.id] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const unread = data.filter((n) => !n.is_read).length;

  async function markRead(id: string) {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="size-5" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 size-2 rounded-full bg-destructive" />
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-sm">
        <SheetHeader>
          <SheetTitle>Notifications</SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-6rem)] px-4">
          <div className="flex flex-col gap-2 pb-8">
            {data.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">Nothing here yet.</p>
            )}
            {data.map((n) => (
              <button
                key={n.id}
                onClick={() => markRead(n.id)}
                className={`rounded-lg border p-3 text-left text-sm transition-colors hover:bg-accent/50 ${
                  n.is_read ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="secondary">{n.type.replace(/_/g, " ")}</Badge>
                  <span className="text-xs text-muted-foreground">{formatDate(n.created_at)}</span>
                </div>
                <p className="mt-2">{n.message}</p>
              </button>
            ))}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
