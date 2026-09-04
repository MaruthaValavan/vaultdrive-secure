import { create } from "zustand";

export type ViewMode = "grid" | "list";

type DriveState = {
  view: ViewMode;
  selected: string[];
  clipboard: { type: "file" | "folder"; id: string; name: string } | null;
  setView: (view: ViewMode) => void;
  toggleSelected: (id: string) => void;
  clearSelection: () => void;
  setClipboard: (item: DriveState["clipboard"]) => void;
};

export const useDriveStore = create<DriveState>((set) => ({
  view: "grid",
  selected: [],
  clipboard: null,
  setView: (view) => set({ view }),
  toggleSelected: (id) =>
    set((s) => ({
      selected: s.selected.includes(id) ? s.selected.filter((x) => x !== id) : [...s.selected, id],
    })),
  clearSelection: () => set({ selected: [] }),
  setClipboard: (clipboard) => set({ clipboard }),
}));
