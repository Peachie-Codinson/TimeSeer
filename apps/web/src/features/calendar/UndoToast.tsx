import { useEffect } from "react";
import "../../styles/nocturne.css";

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
    <div
      className="nc-shell nc-card nc-elev-lg nc-toast"
      style={{
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 50,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: "10px 16px",
      }}
    >
      <span style={{ fontSize: 13 }}>{toast.message}</span>
      <button
        type="button"
        style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "var(--color-accent)", fontWeight: 600, fontSize: 13 }}
        onClick={() => {
          toast.onUndo();
          onDismiss();
        }}
      >
        Undo
      </button>
      <button
        type="button"
        style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "color-mix(in srgb, var(--color-text) 50%, transparent)" }}
        onClick={onDismiss}
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}
