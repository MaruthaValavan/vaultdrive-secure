import { createFileRoute, Link } from "@tanstack/react-router";
import { CloudUpload, FolderTree, Search, ShieldCheck, Share2, Users2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "VaultDrive — Secure cloud storage for your files" },
      {
        name: "description",
        content:
          "Store, organise and share files securely. Folders, quotas, expiring links and instant search.",
      },
      { property: "og:title", content: "VaultDrive — Secure cloud storage for your files" },
      {
        property: "og:description",
        content:
          "Store, organise and share files securely. Folders, quotas, expiring links and instant search.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: FolderTree, title: "Nested folders", body: "Organise everything in folders up to 20 levels deep." },
  { icon: CloudUpload, title: "Fast uploads", body: "Drag files straight in; they go directly to secure storage." },
  { icon: Share2, title: "Expiring links", body: "Share a link with an optional password and expiry date." },
  { icon: Users2, title: "Invite people", body: "Give teammates view or edit access to any file or folder." },
  { icon: Search, title: "Instant search", body: "Find anything by name, type or date in seconds." },
  { icon: ShieldCheck, title: "Private by default", body: "Only you can see your files unless you share them." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <span className="brand-gradient flex size-9 items-center justify-center rounded-xl text-primary-foreground">
            <CloudUpload className="size-5" />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">VaultDrive</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" asChild>
            <Link to="/login">Sign in</Link>
          </Button>
          <Button asChild>
            <Link to="/register">Get started</Link>
          </Button>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-6 py-20 text-center">
        <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          Your files, <span className="brand-gradient-text">safe and always with you</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
          VaultDrive keeps your documents, photos and videos in one private place — with sharing you
          fully control and 5 GB free to start.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button size="lg" asChild>
            <Link to="/register">Create your free vault</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link to="/login">I already have an account</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="rounded-2xl border bg-card p-6 shadow-panel">
              <feature.icon className="size-6 text-primary" />
              <h2 className="mt-4 text-base font-semibold">{feature.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{feature.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        VaultDrive — secure cloud storage.
      </footer>
    </div>
  );
}
