import { supabase } from "@/integrations/supabase/client";

export type FolderRow = {
  id: string;
  owner_id: string;
  parent_id: string | null;
  name: string;
  path: string;
  created_at: string;
  updated_at: string;
};

export type FileRow = {
  id: string;
  owner_id: string;
  folder_id: string | null;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  storage_path: string;
  created_at: string;
  updated_at: string;
};

export async function listFolderContents(folderId: string | null) {
  const foldersQuery = supabase
    .from("folders")
    .select("id, owner_id, parent_id, name, path, created_at, updated_at")
    .eq("is_deleted", false)
    .order("name");
  const filesQuery = supabase
    .from("files")
    .select("id, owner_id, folder_id, original_name, mime_type, size_bytes, storage_path, created_at, updated_at")
    .eq("is_deleted", false)
    .order("original_name");

  const [folders, files] = await Promise.all([
    folderId ? foldersQuery.eq("parent_id", folderId) : foldersQuery.is("parent_id", null),
    folderId ? filesQuery.eq("folder_id", folderId) : filesQuery.is("folder_id", null),
  ]);
  if (folders.error) throw folders.error;
  if (files.error) throw files.error;
  return {
    folders: (folders.data ?? []) as FolderRow[],
    files: (files.data ?? []) as FileRow[],
  };
}

export async function getBreadcrumb(folderId: string | null) {
  if (!folderId) return [] as { id: string; name: string }[];
  const { data: current } = await supabase
    .from("folders")
    .select("id, name, path")
    .eq("id", folderId)
    .maybeSingle();
  if (!current) return [];
  const ids = current.path.split("/").filter(Boolean);
  const { data } = await supabase.from("folders").select("id, name, path").in("id", ids);
  const byId = new Map((data ?? []).map((f) => [f.id, f]));
  return ids
    .map((id) => byId.get(id))
    .filter(Boolean)
    .map((f) => ({ id: f!.id, name: f!.name }));
}

export async function createFolder(name: string, parentId: string | null, ownerId: string) {
  const { error } = await supabase
    .from("folders")
    .insert({ name, parent_id: parentId, owner_id: ownerId });
  if (error) throw error;
}

export async function renameFolder(id: string, name: string) {
  const { error } = await supabase.from("folders").update({ name }).eq("id", id);
  if (error) throw error;
}

export async function moveFolder(id: string, parentId: string | null) {
  const { error } = await supabase.from("folders").update({ parent_id: parentId }).eq("id", id);
  if (error) throw error;
}

export async function deleteFolder(id: string) {
  const { error } = await supabase.rpc("delete_folder_cascade", { p_folder_id: id });
  if (error) throw error;
}

export async function renameFile(id: string, name: string) {
  const { error } = await supabase.from("files").update({ original_name: name }).eq("id", id);
  if (error) throw error;
}

export async function moveFile(id: string, folderId: string | null) {
  const { error } = await supabase.from("files").update({ folder_id: folderId }).eq("id", id);
  if (error) throw error;
}

export async function deleteFile(id: string) {
  const { error } = await supabase.rpc("soft_delete_file", { p_file_id: id });
  if (error) throw error;
}

export async function confirmUpload(args: {
  storagePath: string;
  name: string;
  mime: string;
  size: number;
  folderId: string | null;
}) {
  const { error } = await supabase.rpc("confirm_upload", {
    p_storage_path: args.storagePath,
    p_original_name: args.name,
    p_mime_type: args.mime || "application/octet-stream",
    p_size_bytes: args.size,
    ...(args.folderId ? { p_folder_id: args.folderId } : {}),
  });
  if (error) throw error;
}

/** PUT the binary straight to storage with progress reporting. */
export function uploadToSignedUrl(
  signedUrl: string,
  file: File,
  onProgress: (percent: number) => void,
): Promise<void> {
  const base = import.meta.env["VITE_SUPABASE_URL"] as string;
  const url = signedUrl.startsWith("http") ? signedUrl : `${base}/storage/v1${signedUrl}`;
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url, true);
    xhr.setRequestHeader("x-upsert", "true");
    if (file.type) xhr.setRequestHeader("content-type", file.type);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(xhr.responseText)));
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(file);
  });
}

export async function searchItems(params: {
  q: string;
  type?: string | undefined;
  from?: string | undefined;
  to?: string | undefined;
  owner?: string | undefined;
}) {
  const term = `%${params.q}%`;
  let files = supabase
    .from("files")
    .select("id, owner_id, folder_id, original_name, mime_type, size_bytes, storage_path, created_at, updated_at")
    .eq("is_deleted", false)
    .ilike("original_name", term)
    .limit(100);
  let folders = supabase
    .from("folders")
    .select("id, owner_id, parent_id, name, path, created_at, updated_at")
    .eq("is_deleted", false)
    .ilike("name", term)
    .limit(100);

  if (params.from) {
    files = files.gte("created_at", params.from);
    folders = folders.gte("created_at", params.from);
  }
  if (params.to) {
    files = files.lte("created_at", `${params.to}T23:59:59`);
    folders = folders.lte("created_at", `${params.to}T23:59:59`);
  }
  if (params.owner) {
    files = files.eq("owner_id", params.owner);
    folders = folders.eq("owner_id", params.owner);
  }
  if (params.type && params.type !== "all") {
    files = params.type === "other" ? files : files.ilike("mime_type", `${params.type}%`);
  }

  const [f, d] = await Promise.all([files, folders]);
  if (f.error) throw f.error;
  if (d.error) throw d.error;
  return {
    files: (f.data ?? []) as FileRow[],
    folders: (params.type && params.type !== "all" ? [] : ((d.data ?? []) as FolderRow[])),
  };
}
