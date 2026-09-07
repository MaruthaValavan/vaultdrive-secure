import { createFileRoute } from "@tanstack/react-router";
import { DrivePage } from "@/components/DrivePage/DrivePage";

export const Route = createFileRoute("/_authenticated/drive/$folderId")({
  head: () => ({
    meta: [
      { title: "Folder — VaultDrive" },
      { name: "description", content: "Files and subfolders inside this VaultDrive folder." },
      { property: "og:title", content: "Folder — VaultDrive" },
      { property: "og:description", content: "Files and subfolders inside this VaultDrive folder." },
    ],
  }),
  component: FolderRoute,
});

function FolderRoute() {
  const { folderId } = Route.useParams();
  return <DrivePage key={folderId} folderId={folderId} />;
}
