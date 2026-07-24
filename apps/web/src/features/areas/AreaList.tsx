import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { type Area, createArea, fetchAreas } from "./api";

const KIND_OPTIONS: Area["kind"][] = ["course", "research", "teaching", "administration", "personal", "other"];
const DEFAULT_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#a855f7", "#06b6d4"];

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
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Areas</h3>
        <button className="text-xs text-slate-400 hover:text-white" onClick={() => setAdding((v) => !v)}>
          {adding ? "Cancel" : "+ New"}
        </button>
      </div>
      <ul className="space-y-1 text-sm">
        {areas.map((area) => (
          <li key={area.id} className="flex items-center gap-2 text-slate-300">
            <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: area.color ?? "#64748b" }} />
            {area.name}
          </li>
        ))}
        {areas.length === 0 && !adding && <li className="text-slate-500">No areas yet.</li>}
      </ul>
      {adding && (
        <div className="space-y-2 rounded-md border border-slate-800 p-2">
          <input
            autoFocus
            placeholder="Area name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input py-1 text-sm"
          />
          <select value={kind} onChange={(e) => setKind(e.target.value as Area["kind"])} className="input py-1 text-sm">
            {KIND_OPTIONS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
          <button className="btn-primary py-1 text-sm" onClick={submit}>
            Add area
          </button>
        </div>
      )}
    </div>
  );
}
