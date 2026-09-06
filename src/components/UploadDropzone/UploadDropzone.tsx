import { useRef, useState } from "react";
import { UploadCloud } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { createUploadUrl } from "@/lib/vault.functions";
import { confirmUpload, uploadToSignedUrl } from "@/lib/drive-api";
import { useAuthStore } from "@/store/authStore";
import { formatBytes } from "@/lib/format";

type Job = { name: string; size: number; percent: number; error?: string };

export function UploadDropzone({ folderId }: { folderId: string | null }) {
  const [dragging, setDragging] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const getUploadUrl = useServerFn(createUploadUrl);
  const queryClient = useQueryClient();
  const refreshProfile = useAuthStore((s) => s.refreshProfile);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    const files = Array.from(fileList);
    setJobs(files.map((f) => ({ name: f.name, size: f.size, percent: 0 })));

    for (const [index, file] of files.entries()) {
      try {
        const signed = await getUploadUrl({ data: { fileName: file.name } });
        await uploadToSignedUrl(signed.signedUrl, file, (percent) =>
          setJobs((prev) => prev.map((j, i) => (i === index ? { ...j, percent } : j))),
        );
        await confirmUpload({
          storagePath: signed.storagePath,
          name: file.name,
          mime: file.type,
          size: file.size,
          folderId,
        });
        setJobs((prev) => prev.map((j, i) => (i === index ? { ...j, percent: 100 } : j)));
      } catch (error) {
        const message = error instanceof Error ? error.message : "Upload failed";
        const friendly = message.includes("QUOTA_EXCEEDED")
          ? "Not enough storage left in your quota"
          : message;
        setJobs((prev) => prev.map((j, i) => (i === index ? { ...j, error: friendly } : j)));
        toast.error(`${file.name}: ${friendly}`);
      }
    }

    await refreshProfile();
    queryClient.invalidateQueries({ queryKey: ["folder"] });
    setTimeout(() => setJobs([]), 2500);
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
      className={`rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
        dragging ? "border-primary bg-brand-soft" : "border-border bg-card/60"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <UploadCloud className="mx-auto size-8 text-primary" />
      <p className="mt-2 text-sm font-medium">Drop files here to upload</p>
      <p className="text-xs text-muted-foreground">or</p>
      <Button variant="outline" size="sm" className="mt-2" onClick={() => inputRef.current?.click()}>
        Choose files
      </Button>

      {jobs.length > 0 && (
        <div className="mt-4 space-y-2 text-left">
          {jobs.map((job) => (
            <div key={job.name} className="rounded-lg border bg-card p-3">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate font-medium">{job.name}</span>
                <span className="text-muted-foreground">{formatBytes(job.size)}</span>
              </div>
              <Progress value={job.percent} className="mt-2" />
              {job.error && <p className="mt-1 text-xs text-destructive">{job.error}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
