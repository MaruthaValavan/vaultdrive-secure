import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import JSZip from "jszip";
import {
  Download,
  File as FileIcon,
  FileText,
  Folder,
  Grid2X2,
  Image as ImageIcon,
  List,
  Music,
  MoreVertical,
  Pencil,
  Share2,
  Trash2,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ShareDialog, type ShareTarget } from "@/components/ShareDialog/ShareDialog";
import { useDriveStore } from "@/store/driveStore";
import { formatBytes, formatDate, fileKind } from "@/lib/format";
import {
  deleteFile,
  deleteFolder,
  moveFile,
  moveFolder,
  renameFile,
  renameFolder,
  type FileRow,
  type FolderRow,
} from "@/lib/drive-api";
import { getDownloadUrl, getDownloadUrls } from "@/lib/vault.functions";
import { useAuthStore } from "@/store/authStore";

const ICONS = {
  image: ImageIcon,
  video: Video,
  audio: Music,
  pdf: FileText,
  text: FileText,
  archive: FileIcon,
  other: FileIcon,
} as const;

export function FileGrid({
  folders,
  files,
  readOnly = false,
  emptyLabel = "This folder is empty.",
}: {
  folders: FolderRow[];
  files: FileRow[];
  readOnly?: boolean;
  emptyLabel?: string;
}) {
  const { view, setView, selected, toggleSelected, clearSelection } = useDriveStore();
  const [shareTarget, setShareTarget] = useState<ShareTarget | null>(null);
  const [renaming, setRenaming] = useState<{ type: "file" | "folder"; id: string; name: string } | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const queryClient = useQueryClient();
  const download = useServerFn(getDownloadUrl);
  const downloadMany = useServerFn(getDownloadUrls);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["folder"] });
    queryClient.invalidateQueries({ queryKey: ["search"] });
  }

  async function handleDownload(file: FileRow) {
    try {
      const { url } = await download({ data: { fileId: file.id } });
      const a = document.createElement("a");
      a.href = url;
      a.download = file.original_name;
      a.click();
    } catch {
      toast.error("Could not prepare that download");
    }
  }

  async function handleZip() {
    const ids = files.filter((f) => selected.includes(f.id)).map((f) => f.id);
    if (!ids.length) return;
    toast.info("Preparing your ZIP…");
    try {
      const items = await downloadMany({ data: { fileIds: ids } });
      const zip = new JSZip();
      await Promise.all(
        items.map(async (item) => {
          const blob = await fetch(item.url).then((r) => r.blob());
          zip.file(item.name, blob);
        }),
      );
      const blob = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "vaultdrive.zip";
      a.click();
      URL.revokeObjectURL(a.href);
      clearSelection();
    } catch {
      toast.error("Could not build the ZIP file");
    }
  }

  async function handleDelete(type: "file" | "folder", id: string) {
    try {
      if (type === "file") await deleteFile(id);
      else await deleteFolder(id);
      toast.success("Moved to trash");
      await refreshProfile();
      refresh();
    } catch {
      toast.error("Could not delete that item");
    }
  }

  async function submitRename() {
    if (!renaming || !renameValue.trim()) return;
    try {
      if (renaming.type === "file") await renameFile(renaming.id, renameValue.trim());
      else await renameFolder(renaming.id, renameValue.trim());
      setRenaming(null);
      refresh();
    } catch {
      toast.error("Could not rename that item");
    }
  }

  async function handleDropOnFolder(folderId: string, payload: string) {
    const [type, id] = payload.split(":");
    if (!type || !id || id === folderId) return;
    try {
      if (type === "file") await moveFile(id, folderId);
      else await moveFolder(id, folderId);
      toast.success("Moved");
      refresh();
    } catch {
      toast.error("Could not move that item");
    }
  }

  const isEmpty = folders.length === 0 && files.length === 0;
  const selectedFiles = files.filter((f) => selected.includes(f.id)).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {folders.length} folders · {files.length} files
        </p>
        <div className="flex items-center gap-2">
          {selectedFiles > 0 && (
            <Button size="sm" variant="outline" onClick={handleZip}>
              <Download className="mr-2 size-4" />
              Download {selectedFiles} as ZIP
            </Button>
          )}
          <div className="flex rounded-lg border p-0.5">
            <Button
              variant={view === "grid" ? "secondary" : "ghost"}
              size="icon"
              className="size-8"
              onClick={() => setView("grid")}
              aria-label="Grid view"
            >
              <Grid2X2 className="size-4" />
            </Button>
            <Button
              variant={view === "list" ? "secondary" : "ghost"}
              size="icon"
              className="size-8"
              onClick={() => setView("list")}
              aria-label="List view"
            >
              <List className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      {isEmpty ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
          {emptyLabel}
        </div>
      ) : (
        <div
          className={
            view === "grid"
              ? "grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4"
              : "flex flex-col divide-y rounded-xl border bg-card"
          }
        >
          {folders.map((folder) => (
            <ItemCard
              key={folder.id}
              view={view}
              icon={<Folder className="size-5 text-primary" />}
              title={folder.name}
              subtitle={`Folder · ${formatDate(folder.updated_at)}`}
              href={{ to: "/drive/$folderId", params: { folderId: folder.id } }}
              draggableId={`folder:${folder.id}`}
              onDropPayload={(payload) => handleDropOnFolder(folder.id, payload)}
              actions={
                readOnly ? null : (
                  <ItemMenu
                    onShare={() => setShareTarget({ type: "folder", id: folder.id, name: folder.name })}
                    onRename={() => {
                      setRenaming({ type: "folder", id: folder.id, name: folder.name });
                      setRenameValue(folder.name);
                    }}
                    onDelete={() => handleDelete("folder", folder.id)}
                  />
                )
              }
            />
          ))}

          {files.map((file) => {
            const Icon = ICONS[fileKind(file.mime_type)];
            return (
              <ItemCard
                key={file.id}
                view={view}
                icon={<Icon className="size-5 text-muted-foreground" />}
                title={file.original_name}
                subtitle={`${formatBytes(Number(file.size_bytes))} · ${formatDate(file.updated_at)}`}
                draggableId={`file:${file.id}`}
                selected={selected.includes(file.id)}
                onSelect={() => toggleSelected(file.id)}
                onOpen={() => handleDownload(file)}
                actions={
                  <ItemMenu
                    onDownload={() => handleDownload(file)}
                    onShare={
                      readOnly
                        ? undefined
                        : () => setShareTarget({ type: "file", id: file.id, name: file.original_name })
                    }
                    onRename={
                      readOnly
                        ? undefined
                        : () => {
                            setRenaming({ type: "file", id: file.id, name: file.original_name });
                            setRenameValue(file.original_name);
                          }
                    }
                    onDelete={readOnly ? undefined : () => handleDelete("file", file.id)}
                  />
                }
              />
            );
          })}
        </div>
      )}

      <ShareDialog target={shareTarget} onOpenChange={(open) => !open && setShareTarget(null)} />

      <Dialog open={Boolean(renaming)} onOpenChange={(open) => !open && setRenaming(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename</DialogTitle>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitRename()}
          />
          <DialogFooter>
            <Button onClick={submitRename}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ItemCard({
  view,
  icon,
  title,
  subtitle,
  href,
  actions,
  selected,
  onSelect,
  onOpen,
  draggableId,
  onDropPayload,
}: {
  view: "grid" | "list";
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  href?: { to: "/drive/$folderId"; params: { folderId: string } };
  actions?: React.ReactNode;
  selected?: boolean;
  onSelect?: () => void;
  onOpen?: () => void;
  draggableId: string;
  onDropPayload?: (payload: string) => void;
}) {
  const base =
    view === "grid"
      ? "group relative flex flex-col gap-2 rounded-xl border bg-card p-4 shadow-panel transition-shadow hover:shadow-md"
      : "group relative flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/40";

  const body = (
    <>
      <div className="flex items-center gap-3">
        {onSelect && (
          <Checkbox
            checked={selected ?? false}
            onCheckedChange={onSelect}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Select ${title}`}
          />
        )}
        {icon}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{title}</p>
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        </div>
        {actions}
      </div>
    </>
  );

  const dragProps = {
    draggable: true,
    onDragStart: (e: React.DragEvent) => e.dataTransfer.setData("text/plain", draggableId),
    onDragOver: onDropPayload ? (e: React.DragEvent) => e.preventDefault() : undefined,
    onDrop: onDropPayload
      ? (e: React.DragEvent) => {
          e.preventDefault();
          onDropPayload(e.dataTransfer.getData("text/plain"));
        }
      : undefined,
  };

  if (href) {
    return (
      <div className={base} {...dragProps}>
        <Link to={href.to} params={href.params} className="absolute inset-0" aria-label={title} />
        <div className="relative pointer-events-none [&_button]:pointer-events-auto">{body}</div>
      </div>
    );
  }

  return (
    <div className={base} {...dragProps} onDoubleClick={onOpen}>
      {body}
    </div>
  );
}

function ItemMenu({
  onDownload,
  onShare,
  onRename,
  onDelete,
}: {
  onDownload?: (() => void) | undefined;
  onShare?: (() => void) | undefined;
  onRename?: (() => void) | undefined;
  onDelete?: (() => void) | undefined;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8" aria-label="More actions">
          <MoreVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {onDownload && (
          <DropdownMenuItem onClick={onDownload}>
            <Download className="mr-2 size-4" />
            Download
          </DropdownMenuItem>
        )}
        {onShare && (
          <DropdownMenuItem onClick={onShare}>
            <Share2 className="mr-2 size-4" />
            Share
          </DropdownMenuItem>
        )}
        {onRename && (
          <DropdownMenuItem onClick={onRename}>
            <Pencil className="mr-2 size-4" />
            Rename
          </DropdownMenuItem>
        )}
        {onDelete && (
          <DropdownMenuItem onClick={onDelete} className="text-destructive">
            <Trash2 className="mr-2 size-4" />
            Delete
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
