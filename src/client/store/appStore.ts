import { create } from 'zustand';
import type { AppState } from '../../shared/types';

const emptyState: AppState = {
  players: [],
  courts: [],
  stack: [],
  finances: { totalIncome: 0 },
  serverTime: new Date().toISOString(),
};

interface AppStore {
  state: AppState;
  connected: boolean;
  setState: (state: AppState) => void;
  setConnected: (connected: boolean) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  state: emptyState,
  connected: false,
  setState: (state) => set({ state }),
  setConnected: (connected) => set({ connected }),
}));
