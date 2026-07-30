export type ToastKind = 'success' | 'error';

export interface ToastMessage {
  id: number;
  kind: ToastKind;
  text: string;
}

type Listener = (toast: ToastMessage) => void;

let listeners: Listener[] = [];
let sequence = 0;

/**
 * Notification non bloquante : remplace les window.alert() qui obligeaient
 * le coach à cliquer sur OK en pleine séance.
 */
export const showToast = (kind: ToastKind, text: string) => {
  sequence += 1;
  const toast: ToastMessage = { id: sequence, kind, text };
  listeners.forEach((listener) => listener(toast));
};

export const subscribeToast = (listener: Listener) => {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
};
