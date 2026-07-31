export interface TierInfo {
  tier: 0 | 1 | 2 | 3 | 4;
  barColor: string;
  glow: string;
  tagClass: string;
  label: string;
}

/**
 * Floor-based tiered milestone feedback (design spec: "quota uses a floor-based progress
 * model ... achievement feedback becomes progressively more expressive at 120%, 150%, and
 * 200%, while remaining calm"). `ratio` is completedMinutes / (minimumMinutes || targetMinutes).
 */
export function tierInfo(ratio: number): TierInfo {
  if (ratio >= 2) {
    return {
      tier: 4,
      barColor: "var(--color-accent)",
      glow: "0 0 8px 0 color-mix(in srgb, var(--color-accent) 50%, transparent)",
      tagClass: "nc-tag-accent",
      label: "Doubled",
    };
  }
  if (ratio >= 1.5) {
    return {
      tier: 3,
      barColor: "var(--color-accent-300)",
      glow: "0 0 5px 0 color-mix(in srgb, var(--color-accent-300) 40%, transparent)",
      tagClass: "nc-tag-accent",
      label: "+50%",
    };
  }
  if (ratio >= 1.2) {
    return { tier: 2, barColor: "var(--color-accent-500)", glow: "none", tagClass: "nc-tag-accent", label: "+20%" };
  }
  if (ratio >= 1) {
    return { tier: 1, barColor: "var(--color-accent-700)", glow: "none", tagClass: "nc-tag-neutral", label: "Floor met" };
  }
  return { tier: 0, barColor: "var(--color-neutral-600)", glow: "none", tagClass: "nc-tag-outline", label: "Below floor" };
}

/** Pace-aware status: how completed-so-far compares to what's expected by now in the period. */
export function paceInfo(completedMinutes: number, plannedMinutes: number): { label: string; tagClass: string } {
  if (!plannedMinutes) return { label: "—", tagClass: "nc-tag-neutral" };
  const r = completedMinutes / plannedMinutes;
  if (r >= 1.05) return { label: "Ahead of pace", tagClass: "nc-tag-neutral" };
  if (r >= 0.9) return { label: "On pace", tagClass: "nc-tag-neutral" };
  return { label: "Behind pace", tagClass: "nc-tag-outline" };
}

/**
 * Compresses a 0-∞ ratio onto a fixed 0-100 track: 0-200% maps linearly to 0-85%, and any
 * overflow beyond 200% approaches 100% asymptotically so it always stays visible on the bar.
 */
export function scalePct(ratio: number): number {
  if (ratio <= 2) return Math.max(0, (ratio / 2) * 85);
  return 85 + 15 * (1 - Math.exp(-(ratio - 2) / 1.5));
}
