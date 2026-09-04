export function formatBytes(bytes: number | null | undefined): string {
  const value = Number(bytes ?? 0);
  if (value <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  const n = value / Math.pow(1024, i);
  return `${n >= 100 || i === 0 ? Math.round(n) : n.toFixed(1)} ${units[i]}`;
}

export function formatDate(input: string | null | undefined): string {
  if (!input) return "—";
  return new Date(input).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export type FileKind = "image" | "video" | "audio" | "pdf" | "archive" | "text" | "other";

export function fileKind(mime: string | null | undefined): FileKind {
  const m = (mime ?? "").toLowerCase();
  if (m.startsWith("image/")) return "image";
  if (m.startsWith("video/")) return "video";
  if (m.startsWith("audio/")) return "audio";
  if (m.includes("pdf")) return "pdf";
  if (m.includes("zip") || m.includes("tar") || m.includes("rar") || m.includes("7z")) return "archive";
  if (m.startsWith("text/") || m.includes("json") || m.includes("xml")) return "text";
  return "other";
}
