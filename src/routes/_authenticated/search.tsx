import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search as SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileGrid } from "@/components/FileGrid/FileGrid";
import { searchItems } from "@/lib/drive-api";

export const Route = createFileRoute("/_authenticated/search")({
  head: () => ({
    meta: [
      { title: "Search — VaultDrive" },
      { name: "description", content: "Find files and folders by name, type and date in VaultDrive." },
      { property: "og:title", content: "Search — VaultDrive" },
      { property: "og:description", content: "Find files and folders by name, type and date in VaultDrive." },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const [form, setForm] = useState({ q: "", type: "all", from: "", to: "" });
  const [applied, setApplied] = useState(form);

  const query = useQuery({
    queryKey: ["search", applied],
    enabled: applied.q.trim().length > 0,
    queryFn: () =>
      searchItems({
        q: applied.q.trim(),
        type: applied.type,
        from: applied.from || undefined,
        to: applied.to || undefined,
      }),
  });

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5">
      <h1 className="font-display text-2xl font-semibold tracking-tight">Search</h1>

      <form
        className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-5"
        onSubmit={(e) => {
          e.preventDefault();
          setApplied(form);
        }}
      >
        <div className="space-y-2 lg:col-span-2">
          <Label htmlFor="q">Name contains</Label>
          <Input
            id="q"
            value={form.q}
            placeholder="invoice, holiday, report…"
            onChange={(e) => setForm({ ...form, q: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Type</Label>
          <Select value={form.type} onValueChange={(type) => setForm({ ...form, type })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="image">Images</SelectItem>
              <SelectItem value="video">Videos</SelectItem>
              <SelectItem value="audio">Audio</SelectItem>
              <SelectItem value="application">Documents</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="from">From</Label>
          <Input
            id="from"
            type="date"
            value={form.from}
            onChange={(e) => setForm({ ...form, from: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="to">To</Label>
          <Input
            id="to"
            type="date"
            value={form.to}
            onChange={(e) => setForm({ ...form, to: e.target.value })}
          />
        </div>
        <Button type="submit" className="sm:col-span-2 lg:col-span-5">
          <SearchIcon className="mr-2 size-4" />
          Search
        </Button>
      </form>

      <FileGrid
        folders={query.data?.folders ?? []}
        files={query.data?.files ?? []}
        emptyLabel={applied.q ? "No matches found." : "Type something to start searching."}
      />
    </div>
  );
}
