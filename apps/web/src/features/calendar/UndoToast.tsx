import { useEffect } from "react";

export interface ToastState {
  message: string;
  onUndo: () => void;
}

export function UndoToast({ toast, onDismiss }: { toast: ToastState | null; onDismiss: () => void }) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(onDismiss, 6000);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  if (!toast) return null;

  return (
    <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-md border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-100 shadow-lg">
      <span>{toast.message}</span>
      <button
        className="font-medium text-emerald-400 hover:text-emerald-300"
        onClick={() => {
          toast.onUndo();
          onDismiss();
        }}
      >
        Undo
      </button>
      <button className="text-slate-500 hover:text-slate-300" onClick={onDismiss} aria-label="Dismiss">
        ×
      </button>
    </div>
  );
}
