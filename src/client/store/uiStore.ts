import { create } from 'zustand';

interface UiStore {
  draggingPlayerId: string | null;
  draftPlayerIds: string[];
  setDraggingPlayerId: (id: string | null) => void;
  setDraftPlayerIds: (ids: string[]) => void;
}

export const useUiStore = create<UiStore>((set) => ({
  draggingPlayerId: null,
  draftPlayerIds: [],
  setDraggingPlayerId: (id) => set({ draggingPlayerId: id }),
  setDraftPlayerIds: (ids) => set({ draftPlayerIds: ids }),
}));
