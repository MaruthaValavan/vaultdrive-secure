import { createFileRoute } from "@tanstack/react-router";
import { DrivePage } from "@/components/DrivePage/DrivePage";

export const Route = createFileRoute("/_authenticated/drive/")({
  head: () => ({
    meta: [
      { title: "My Files — VaultDrive" },
      { name: "description", content: "Browse, upload and organise your files in VaultDrive." },
      { property: "og:title", content: "My Files — VaultDrive" },
      { property: "og:description", content: "Browse, upload and organise your files in VaultDrive." },
    ],
  }),
  component: () => <DrivePage folderId={null} />,
});
