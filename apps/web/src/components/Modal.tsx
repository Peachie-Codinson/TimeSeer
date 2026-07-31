import type { ReactNode } from "react";
import "../styles/nocturne.css";

export function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="nc-shell nc-dialog-backdrop" style={{ zIndex: 40 }} onClick={onClose}>
      <div className="nc-dialog nc-elev-lg" style={{ width: wide ? "min(560px, 100%)" : "min(380px, 100%)" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div className="nc-dialog-title">{title}</div>
          <button type="button" className="nc-btn nc-hover" style={{ width: 32, padding: 0 }} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
