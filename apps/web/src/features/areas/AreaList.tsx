import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { type Area, createArea, fetchAreas } from "./api";

const KIND_OPTIONS: Area["kind"][] = ["course", "research", "teaching", "administration", "personal", "other"];
const DEFAULT_COLORS = ["#9184d9", "#84d9c0", "#d99184", "#d9c184", "#84a8d9", "#a884d9"];

export function AreaList() {
  const queryClient = useQueryClient();
  const { data: areas = [] } = useQuery({ queryKey: ["areas"], queryFn: fetchAreas });
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<Area["kind"]>("course");

  const submit = async () => {
    if (!name.trim()) return;
    const color = DEFAULT_COLORS[areas.length % DEFAULT_COLORS.length];
    await createArea({ name: name.trim(), kind, color });
    setName("");
    setAdding(false);
    queryClient.invalidateQueries({ queryKey: ["areas"] });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
          Areas
        </div>
        <button
          type="button"
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11.5, color: "var(--color-accent)" }}
          onClick={() => setAdding((v) => !v)}
        >
          {adding ? "Cancel" : "+ New"}
        </button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
        {areas.map((area) => (
          <div key={area.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ display: "inline-block", width: 8, height: 8, flex: "none", borderRadius: "50%", background: area.color ?? "var(--color-neutral-600)" }} />
            {area.name}
          </div>
        ))}
        {areas.length === 0 && !adding && (
          <div style={{ color: "color-mix(in srgb, var(--color-text) 45%, transparent)" }}>No areas yet.</div>
        )}
      </div>
      {adding && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 8, border: "1px solid var(--color-divider)", borderRadius: "var(--radius-md)" }}>
          <input
            autoFocus
            placeholder="Area name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="nc-input"
            style={{ fontSize: 13 }}
          />
          <select value={kind} onChange={(e) => setKind(e.target.value as Area["kind"])} className="nc-input" style={{ fontSize: 13 }}>
            {KIND_OPTIONS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
          <button type="button" className="nc-btn nc-btn-primary" style={{ width: "100%" }} onClick={() => void submit()}>
            Add area
          </button>
        </div>
      )}
    </div>
  );
}
