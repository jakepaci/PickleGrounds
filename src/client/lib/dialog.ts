import { useDialogStore, type DialogRequest } from '../store/dialogStore';

function openDialog(request: DialogRequest): Promise<boolean> {
  return new Promise((resolve) => {
    useDialogStore.setState({
      current: request,
      resolve: (value) => {
        useDialogStore.setState({ current: null, resolve: null });
        resolve(value);
      },
    });
  });
}

export function showAlert(message: string, title = 'Notice'): Promise<void> {
  return openDialog({ type: 'alert', title, message }).then(() => undefined);
}

export function showConfirm(
  message: string,
  options: {
    title?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    destructive?: boolean;
  } = {},
): Promise<boolean> {
  return openDialog({
    type: 'confirm',
    title: options.title ?? 'Confirm',
    message,
    confirmLabel: options.confirmLabel,
    cancelLabel: options.cancelLabel,
    destructive: options.destructive,
  });
}
