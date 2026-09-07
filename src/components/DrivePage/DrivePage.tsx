import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FolderPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { FileGrid } from "@/components/FileGrid/FileGrid";
import { FolderBreadcrumb } from "@/components/FolderBreadcrumb/FolderBreadcrumb";
import { UploadDropzone } from "@/components/UploadDropzone/UploadDropzone";
import { createFolder, getBreadcrumb, listFolderContents } from "@/lib/drive-api";
import { useAuthStore } from "@/store/authStore";

export function DrivePage({ folderId }: { folderId: string | null }) {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [open, setOpen] = useState(false);

  const contents = useQuery({
    queryKey: ["folder", folderId],
    queryFn: () => listFolderContents(folderId),
  });

  const trail = useQuery({
    queryKey: ["breadcrumb", folderId],
    queryFn: () => getBreadcrumb(folderId),
  });

  const create = useMutation({
    mutationFn: () => createFolder(name.trim(), folderId, user!.id),
    onSuccess: () => {
      setName("");
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["folder"] });
    },
    onError: () => toast.error("Could not create that folder"),
  });

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">My Files</h1>
          <FolderBreadcrumb trail={trail.data ?? []} />
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <FolderPlus className="mr-2 size-4" />
              New folder
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>New folder</DialogTitle>
            </DialogHeader>
            <Input
              value={name}
              placeholder="Folder name"
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && name.trim() && create.mutate()}
            />
            <DialogFooter>
              <Button disabled={!name.trim() || create.isPending} onClick={() => create.mutate()}>
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <UploadDropzone folderId={folderId} />

      {contents.isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : (
        <FileGrid folders={contents.data?.folders ?? []} files={contents.data?.files ?? []} />
      )}
    </div>
  );
}
