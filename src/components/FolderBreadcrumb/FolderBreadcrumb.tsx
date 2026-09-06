import { Link } from "@tanstack/react-router";
import { ChevronRight, HardDrive } from "lucide-react";

export function FolderBreadcrumb({ trail }: { trail: { id: string; name: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-sm">
      <Link
        to="/drive"
        className="flex items-center gap-1.5 rounded-md px-2 py-1 font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <HardDrive className="size-4" />
        My Files
      </Link>
      {trail.map((crumb, i) => (
        <span key={crumb.id} className="flex items-center gap-1">
          <ChevronRight className="size-4 text-muted-foreground" />
          {i === trail.length - 1 ? (
            <span className="rounded-md px-2 py-1 font-medium">{crumb.name}</span>
          ) : (
            <Link
              to="/drive/$folderId"
              params={{ folderId: crumb.id }}
              className="rounded-md px-2 py-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              {crumb.name}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
