import { create } from 'zustand';

export type DialogRequest =
  | { type: 'alert'; title: string; message: string }
  | {
      type: 'confirm';
      title: string;
      message: string;
      confirmLabel?: string;
      cancelLabel?: string;
      destructive?: boolean;
    };

interface DialogStore {
  current: DialogRequest | null;
  resolve: ((value: boolean) => void) | null;
}

export const useDialogStore = create<DialogStore>(() => ({
  current: null,
  resolve: null,
}));
