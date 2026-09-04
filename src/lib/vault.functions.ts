import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BUCKET = "vault";

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
}

/** Signed direct-upload URL — binaries never pass through the app server. */
export const createUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ fileName: z.string().min(1).max(255) }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const storagePath = `${context.userId}/${crypto.randomUUID()}-${safeName(data.fileName)}`;
    const { data: signed, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUploadUrl(storagePath);
    if (error || !signed) throw new Error("UPLOAD_URL_FAILED");
    return { storagePath, token: signed.token, signedUrl: signed.signedUrl };
  });

/** Short-lived signed download URL, gated by RLS visibility. */
export const getDownloadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ fileId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: file } = await context.supabase
      .from("files")
      .select("id, storage_path, original_name")
      .eq("id", data.fileId)
      .maybeSingle();
    if (!file) throw new Error("FORBIDDEN");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUrl(file.storage_path, 300, { download: file.original_name });
    if (error || !signed) throw new Error("DOWNLOAD_URL_FAILED");
    return { url: signed.signedUrl, name: file.original_name };
  });

export const getDownloadUrls = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ fileIds: z.array(z.string().uuid()).min(1).max(50) }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: files } = await context.supabase
      .from("files")
      .select("id, storage_path, original_name")
      .in("id", data.fileIds);
    if (!files?.length) throw new Error("FORBIDDEN");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const out: { id: string; name: string; url: string }[] = [];
    for (const f of files) {
      const { data: signed } = await supabaseAdmin.storage
        .from(BUCKET)
        .createSignedUrl(f.storage_path, 300);
      if (signed) out.push({ id: f.id, name: f.original_name, url: signed.signedUrl });
    }
    return out;
  });

const shareInput = z.object({
  resourceType: z.enum(["file", "folder"]),
  resourceId: z.string().uuid(),
  mode: z.enum(["user", "link"]),
  email: z.string().email().optional(),
  role: z.enum(["viewer", "editor"]).default("viewer"),
  expiresAt: z.string().optional(),
  password: z.string().min(1).max(200).optional(),
});

export const createShare = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => shareInput.parse(input))
  .handler(async ({ data, context }) => {
    const table = data.resourceType === "file" ? "files" : "folders";
    const { data: resource } = await context.supabase
      .from(table)
      .select("id, owner_id")
      .eq("id", data.resourceId)
      .maybeSingle();
    if (!resource || resource.owner_id !== context.userId) throw new Error("FORBIDDEN");

    if (data.mode === "user") {
      if (!data.email) throw new Error("EMAIL_REQUIRED");
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: target } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .ilike("email", data.email)
        .maybeSingle();
      if (!target) throw new Error("USER_NOT_FOUND");
      if (target.id === context.userId) throw new Error("CANNOT_SHARE_WITH_SELF");
      const { error } = await context.supabase.from("shares").insert({
        resource_type: data.resourceType,
        resource_id: data.resourceId,
        shared_by: context.userId,
        shared_with_user_id: target.id,
        role: data.role,
      });
      if (error) throw new Error(error.message);
      return { kind: "user" as const };
    }

    const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().slice(0, 8);
    const { error } = await context.supabase.from("shares").insert({
      resource_type: data.resourceType,
      resource_id: data.resourceId,
      shared_by: context.userId,
      role: data.role,
      link_token: token,
      link_expires_at: data.expiresAt ?? null,
      link_password_hash: data.password ? await sha256(`${token}:${data.password}`) : null,
    });
    if (error) throw new Error(error.message);
    return { kind: "link" as const, token };
  });

/** Public link resolution — validated server-side with the service role. */
export const resolvePublicShare = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ token: z.string().min(8).max(80), password: z.string().max(200).optional() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: share } = await supabaseAdmin
      .from("shares")
      .select("id, resource_type, resource_id, link_expires_at, link_password_hash, role")
      .eq("link_token", data.token)
      .maybeSingle();
    if (!share) return { status: "LINK_INVALID" as const };
    if (share.link_expires_at && new Date(share.link_expires_at) < new Date())
      return { status: "LINK_EXPIRED" as const };
    if (share.link_password_hash) {
      if (!data.password) return { status: "PASSWORD_REQUIRED" as const };
      if ((await sha256(`${data.token}:${data.password}`)) !== share.link_password_hash)
        return { status: "INVALID_PASSWORD" as const };
    }

    const items: { id: string; name: string; size: number; mime: string; url: string }[] = [];
    let title = "Shared items";

    if (share.resource_type === "file") {
      const { data: file } = await supabaseAdmin
        .from("files")
        .select("id, original_name, size_bytes, mime_type, storage_path, is_deleted")
        .eq("id", share.resource_id)
        .maybeSingle();
      if (!file || file.is_deleted) return { status: "LINK_INVALID" as const };
      const { data: signed } = await supabaseAdmin.storage
        .from(BUCKET)
        .createSignedUrl(file.storage_path, 600);
      title = file.original_name;
      items.push({
        id: file.id,
        name: file.original_name,
        size: Number(file.size_bytes),
        mime: file.mime_type,
        url: signed?.signedUrl ?? "",
      });
    } else {
      const { data: folder } = await supabaseAdmin
        .from("folders")
        .select("id, name, is_deleted")
        .eq("id", share.resource_id)
        .maybeSingle();
      if (!folder || folder.is_deleted) return { status: "LINK_INVALID" as const };
      title = folder.name;
      const { data: files } = await supabaseAdmin
        .from("files")
        .select("id, original_name, size_bytes, mime_type, storage_path")
        .eq("folder_id", folder.id)
        .eq("is_deleted", false)
        .limit(200);
      for (const f of files ?? []) {
        const { data: signed } = await supabaseAdmin.storage
          .from(BUCKET)
          .createSignedUrl(f.storage_path, 600);
        items.push({
          id: f.id,
          name: f.original_name,
          size: Number(f.size_bytes),
          mime: f.mime_type,
          url: signed?.signedUrl ?? "",
        });
      }
    }

    return { status: "OK" as const, title, kind: share.resource_type, items };
  });

async function assertAdmin(context: { supabase: { rpc: Function }; userId: string }) {
  const { data } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!data) throw new Error("FORBIDDEN");
}

export const adminListUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("profiles")
      .select("id, display_name, email, is_suspended, storage_quota_bytes, storage_used_bytes, created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    return data ?? [];
  });

export const adminUpdateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        userId: z.string().uuid(),
        isSuspended: z.boolean().optional(),
        quotaBytes: z.number().int().min(0).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: Record<string, unknown> = {};
    if (data.isSuspended !== undefined) patch["is_suspended"] = data.isSuspended;
    if (data.quotaBytes !== undefined) patch["storage_quota_bytes"] = data.quotaBytes;
    const { error } = await supabaseAdmin.from("profiles").update(patch).eq("id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: files } = await supabaseAdmin
      .from("files")
      .select("storage_path")
      .eq("owner_id", context.userId);
    if (files?.length) {
      await supabaseAdmin.storage.from(BUCKET).remove(files.map((f) => f.storage_path));
    }
    const { error } = await supabaseAdmin.auth.admin.deleteUser(context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
