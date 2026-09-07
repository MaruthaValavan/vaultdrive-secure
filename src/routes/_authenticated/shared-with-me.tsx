import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileGrid } from "@/components/FileGrid/FileGrid";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import type { FileRow, FolderRow } from "@/lib/drive-api";
import { useAuthStore } from "@/store/authStore";

export const Route = createFileRoute("/_authenticated/shared-with-me")({
  head: () => ({
    meta: [
      { title: "Shared with me — VaultDrive" },
      { name: "description", content: "Files and folders other people shared with your account." },
      { property: "og:title", content: "Shared with me — VaultDrive" },
      { property: "og:description", content: "Files and folders other people shared with your account." },
    ],
  }),
  component: SharedWithMe,
});

function SharedWithMe() {
  const user = useAuthStore((s) => s.user);

  const query = useQuery({
    queryKey: ["shared-with-me", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data: shares } = await supabase
        .from("shares")
        .select("resource_type, resource_id")
        .eq("shared_with_user_id", user!.id);

      const fileIds = (shares ?? []).filter((s) => s.resource_type === "file").map((s) => s.resource_id);
      const folderIds = (shares ?? []).filter((s) => s.resource_type === "folder").map((s) => s.resource_id);

      const [files, folders] = await Promise.all([
        fileIds.length
          ? supabase
              .from("files")
              .select("id, owner_id, folder_id, original_name, mime_type, size_bytes, storage_path, created_at, updated_at")
              .in("id", fileIds)
              .eq("is_deleted", false)
          : Promise.resolve({ data: [] as FileRow[] }),
        folderIds.length
          ? supabase
              .from("folders")
              .select("id, owner_id, parent_id, name, path, created_at, updated_at")
              .in("id", folderIds)
              .eq("is_deleted", false)
          : Promise.resolve({ data: [] as FolderRow[] }),
      ]);

      return {
        files: (files.data ?? []) as FileRow[],
        folders: (folders.data ?? []) as FolderRow[],
      };
    },
  });

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5">
      <h1 className="font-display text-2xl font-semibold tracking-tight">Shared with me</h1>
      {query.isLoading ? (
        <Skeleton className="h-40 rounded-xl" />
      ) : (
        <FileGrid
          readOnly
          folders={query.data?.folders ?? []}
          files={query.data?.files ?? []}
          emptyLabel="Nobody has shared anything with you yet."
        />
      )}
    </div>
  );
}
