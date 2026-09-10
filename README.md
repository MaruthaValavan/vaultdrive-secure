# VaultDrive Secure

Spec Driven Development

Building a Cloud-Based Media Files Storage Service (VaultDrive) with SDD

This specification follows the Spec Driven Development (SDD) format: specification first, code second. It is written to be handed directly to an AI coding agent (Codex Chat, GitHub Copilot Chat, Claude Code, etc.) as spec.md, with implementation generated phase by phase against it as the single source of truth.

Table of Contents

Project Overview & Tech Stack

Authentication & Core Features

Sharing, Search, Upload Engine & Real-Time Layer

Frontend Pages

Backend Architecture & Database Collections

API Endpoints

Folder Structure & Development Phases

UI, Security, Outcome, and Codex Instructions

1. Project Overview & Tech Stack

Project Overview

Build a full-stack cloud file storage and sharing web application called VaultDrive. It must let a user sign up, organize files inside nested folders, upload and download media of any common type, search across their files, and share individual files or entire folders with specific collaborators or via a public link — with strong, enforced access control at every layer. The MVP is scoped for reliability and simplicity: it must not include Office-style document editors, real-time co-editing, complex organizational hierarchies, or a desktop sync client. Versioning, previews/thumbnails, and activity logs are explicitly deferred to post-MVP phases.

Primary personas:

End user (individual or team member) — uploads, organizes, shares, and retrieves files.

Admin (platform owner) — monitors usage, manages accounts, enforces quotas.

Tech Stack

The stack is locked explicitly below to remove ambiguity for AI coding agents. Do not substitute unlisted packages.

Frontend: Next.js (App Router), React 19, Tailwind CSS, TypeScript, a client-side state layer (Zustand), Axios (or the Supabase JS client directly for auth/storage calls).

Backend: Python + FastAPI (async), Pydantic for schema validation, python-jose for JWT verification against Supabase's JWKS, httpx for outbound calls.

Database & Auth & Object Storage: Supabase — Postgres (with Row Level Security), Supabase Auth (JWT-based), Supabase Storage (S3-compatible) for the binary files themselves.

Repository Layout: Frontend and backend must live in two separate repositories (vaultdrive-frontend, vaultdrive-backend), each with independent CI/CD, connected only through a versioned REST contract.

2. Authentication & Core Features

Authentication

The authentication system must support registration (email/password via Supabase Auth), login, Google OAuth login, JWT-based session handling, protected routes, a /me profile endpoint, role separation between admin and user, and persistent login state on the client via Zustand backed by the Supabase session. Password rules and email verification are delegated to Supabase Auth's built-in flows — the backend must never handle raw passwords directly.

Folder Management

Users must be able to create nested folders (materialized path, capped at 20 levels deep for MVP), rename folders, move folders (drag-and-drop or cut/paste), and delete folders. Deleting a folder must cascade to its full contents, gated behind a confirmation step. Every folder view must render a breadcrumb reflecting the current path.

File Management

Users must be able to upload single or multiple files via drag-and-drop or a file picker, see per-file upload progress, and upload large files via chunked/resumable upload. Users must be able to download a single file or download multiple selected files as a zipped bundle, rename files, move files between folders, and delete files (soft-delete, is_deleted flag — hard purge is a post-MVP job). Every file record stores name, size, MIME type, owner, folder_id, and timestamps. Each user has an enforced storage_quota_bytes (default 5 GB); uploads that would exceed quota must be rejected with a clear QUOTA_EXCEEDED error before the binary is accepted.

3. Sharing, Search, Upload Engine & Real-Time Layer

Sharing & Permissions

Users must be able to share a file or folder with a specific collaborator by email, assigning a role of viewer or editor. Users must be able to generate a public/unlisted share link with an optional expiry timestamp and an optional password, and revoke that link at any time. Folder-level shares must propagate to child items unless explicitly overridden at a deeper level. A dedicated "Shared with Me" view must list every item shared to the current user, distinct from "My Files."

Search

Search must match file and folder names (case-insensitive substring) and support filtering by file type, date range, and owner. Search results must be scoped to items the requesting user can see — "My Files" plus "Shared with Me" — never the full platform.

Upload / Download Engine

Binary transfer must never proxy through the FastAPI application process. The required pattern is:

Client requests a signed upload URL from the backend (POST /files/upload-url).

Client uploads the binary directly to Supabase Storage using that signed URL.

Client calls the backend to confirm the upload (POST /files), at which point the backend persists file metadata and increments storage_used_bytes atomically.

Downloads follow the mirror pattern: the backend issues a short-lived signed download URL (GET /files/:id/download-url) rather than streaming bytes itself.

Real-Time & Notifications Layer

On share creation, share revocation, and quota-warning events, the backend must emit a notification record. The frontend must poll or subscribe (Supabase Realtime on the notifications/shares tables is acceptable for MVP in place of a custom WebSocket layer) and surface these in a notifications drawer. A full live activity timeline (per-action event stream) is a post-MVP feature — MVP only requires notification delivery for share and quota events.

4. Frontend Pages

The application uses the Next.js App Router. The root / route redirects authenticated users to /drive and unauthenticated users to /login.

/ — Landing page: product introduction, feature highlights, CTA buttons, responsive layout with light/dark theme support.

/login — Email/password and Google OAuth login form, session persistence via Zustand, validation and error states.

/register — Registration form with password validation and post-signup redirect to email verification notice.

/drive and /drive/[folderId] — Main workspace: breadcrumb navigation, folder/file grid or list view, drag-and-drop upload zone, right-click / toolbar actions (rename, move, delete, share, download).

/shared-with-me — Items shared to the current user, grouped by shared-by user, with role badges (Viewer/Editor).

/search — Search results with type/date/owner filters.

/share/[token] — Public link landing page (outside the authenticated app shell), prompts for a password if the link is protected, then shows a read-only preview/download view.

/settings — Profile management, storage quota usage bar, connected OAuth providers, account deletion.

/admin — Admin-only dashboard: user list, per-user storage usage, suspend/delete account, global quota configuration.

5. Backend Architecture & Database Collections

Backend Architecture

Routers: FastAPI routers handle HTTP routing, request validation via Pydantic models, and dependency-injected auth middleware. Routers must never contain business logic.

Services: Own all business logic — folder/file CRUD, share creation and revocation, quota accounting, search query building, signed-URL issuance. Routers call services; services never construct HTTP responses.

Repositories: Thin data-access layer wrapping Supabase Postgres queries (via supabase-py or direct asyncpg), isolating SQL/RLS-aware queries from service logic.

Storage Layer: Wraps the Supabase Storage SDK for signed URL generation; no other module may call Supabase Storage directly.

Config Layer: Centralizes environment variables (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, JWT_JWKS_URL, DATABASE_URL, CORS_ORIGINS) and app startup (DB pool, CORS, logging).

Database Collections (Supabase Postgres tables)

profiles — extends auth.users: id, display_name, avatar_url, role (admin | user), storage_quota_bytes, storage_used_bytes, created_at.

folders — id, owner_id, parent_id (nullable = root), name, path, is_deleted, created_at, updated_at.

files — id, owner_id, folder_id (nullable = root), storage_path, original_name, mime_type, size_bytes, checksum, is_deleted, created_at, updated_at.

shares — id, resource_type (file | folder), resource_id, shared_by, shared_with_user_id (nullable), role (viewer | editor), link_token (nullable, unique), link_expires_at, link_password_hash, created_at.

notifications — id, owner_id, type (share_created | share_revoked | quota_warning), resource_id, message, is_read, created_at.

audit_log (post-MVP stub, schema reserved now) — id, actor_id, action, resource_id, metadata (jsonb), created_at.

All tables must have Row Level Security enabled. Ownership-based policies (owner_id = auth.uid()) plus a shares-lookup policy govern SELECT/UPDATE/DELETE on folders and files. Public link resolution must go through the backend using the service-role key after validating link_token, expiry, and password — never through client-side RLS — so link tokens remain revocable and unguessable.

6. API Endpoints

Health & Auth

GET /api/health — System heartbeat.

GET /api/me — Current user profile and quota usage.

Folders

GET /api/folders/:id — Folder contents (subfolders + files); :id omitted or root for top level.

POST /api/folders — Create folder.

PATCH /api/folders/:id — Rename or move folder.

DELETE /api/folders/:id — Delete folder (cascades to contents).

Files

POST /api/files/upload-url — Request a signed direct-upload URL.

POST /api/files — Confirm upload, persist file metadata, update quota usage.

GET /api/files/:id/download-url — Signed, time-limited download URL.

PATCH /api/files/:id — Rename or move file.

DELETE /api/files/:id — Soft-delete file.

Search

GET /api/search?q=&type=&from=&to= — Search files/folders scoped to the caller.

Shares

POST /api/shares — Share a resource with a user, or generate a public link.

GET /api/shares/shared-with-me — List items shared to the current user.

DELETE /api/shares/:id — Revoke a share or disable a public link.

GET /api/public/share/:token — Resolve a public link (validates password/expiry server-side).

Notifications

GET /api/notifications — List notifications for the current user.

PATCH /api/notifications/:id — Mark as read.

Admin

GET /api/admin/users — List users with storage usage.

PATCH /api/admin/users/:id — Suspend account or adjust quota.

7. Folder Structure & Development Phases

Frontend Repository (vaultdrive-frontend)

vaultdrive-frontend/
└── src/
    ├── app/
    │   ├── (public)/login/page.tsx
    │   ├── (public)/register/page.tsx
    │   ├── (public)/share/[token]/page.tsx
    │   ├── (app)/drive/[[...folderId]]/page.tsx
    │   ├── (app)/shared-with-me/page.tsx
    │   ├── (app)/search/page.tsx
    │   ├── (app)/settings/page.tsx
    │   └── (app)/admin/page.tsx
    ├── components/
    │   ├── AppShell/
    │   ├── FileGrid/
    │   ├── FolderBreadcrumb/
    │   ├── UploadDropzone/
    │   ├── ShareDialog/
    │   └── NotificationsDrawer/
    ├── store/
    │   ├── authStore.ts
    │   └── driveStore.ts
    └── services/
        ├── api.ts
        └── supabaseClient.ts

Backend Repository (vaultdrive-backend)

vaultdrive-backend/
└── app/
    ├── config/
    │   ├── settings.py
    │   ├── db.py
    │   └── auth.py          # JWT/JWKS verification
    ├── routers/
    │   ├── auth_router.py
    │   ├── folder_router.py
    │   ├── file_router.py
    │   ├── search_router.py
    │   ├── share_router.py
    │   ├── notification_router.py
    │   └── admin_router.py
    ├── services/
    │   ├── folder_service.py
    │   ├── file_service.py
    │   ├── share_service.py
    │   ├── search_service.py
    │   ├── quota_service.py
    │   └── notification_service.py
    ├── repositories/
    │   ├── folder_repo.py
    │   ├── file_repo.py
    │   └── share_repo.py
    ├── storage/
    │   └── supabase_storage.py
    └── models/
        └── schemas.py         # Pydantic request/response models

Development Phases

Phase 1: Repo scaffolding (both repos), Supabase project setup, RLS policies, JWT auth end-to-end (register/login//me), AppShell layout.

Phase 2: Folder CRUD, breadcrumb navigation, folder RLS-backed access checks.

Phase 3: File upload/download engine (signed URLs), quota enforcement, soft-delete.

Phase 4: Search endpoint and UI filters.

Phase 5: Sharing (user-based roles + public links with expiry/password), "Shared with Me" view, notifications.

Phase 6: Admin dashboard, hardening, accessibility pass, deploy.

Post-MVP: File versioning, thumbnail/preview generation, full activity/audit log, trash with auto-purge.

8. UI, Security, Outcome, and Codex Instructions

UI and UX Requirements

The UI must use a clean, light-themed file-manager aesthetic with Tailwind, be fully responsive down to mobile web widths, include loading states and skeleton loaders for folder listings, support drag-and-drop for both uploads and moving items between folders, show real-time upload progress bars, surface a share dialog with a clear toggle between "Invite people" and "Get link," and provide a notifications drawer accessible from the AppShell.

Security Requirements

The application must verify every backend request's JWT against Supabase's JWKS, enforce Row Level Security as the authoritative access-control layer (never trust client-supplied owner_id), issue only short-lived signed URLs for all storage reads/writes, hash public-link passwords, rate-limit auth and upload endpoints, validate every request body with Pydantic, restrict CORS to the known frontend origin(s), never log signed URLs or tokens, and surface quota/permission failures as explicit error codes (QUOTA_EXCEEDED, FORBIDDEN, LINK_EXPIRED) rather than generic 500s.

Final Expected Outcome

The completed platform must let a user sign up, organize files in nested folders, upload and download media reliably at scale, find anything via search, and share precisely what they intend to — with a stranger unable to see anything not explicitly shared. The result should feel like a focused, reliable "Google Drive core": fast, clean, and trustworthy, without the complexity of collaborative document editing.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/44f1adf1-d6aa-49dc-b150-ec9ff0bebaa7).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
