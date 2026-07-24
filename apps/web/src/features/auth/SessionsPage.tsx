import { Link } from "react-router";
import { SessionsPanel } from "./SessionsPanel";

export function SessionsPage() {
  return (
    <div className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Devices &amp; sessions</h1>
          <Link to="/" className="btn-secondary">
            Back to planner
          </Link>
        </div>
        <SessionsPanel />
      </div>
    </div>
  );
}
