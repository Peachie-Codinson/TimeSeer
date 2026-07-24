import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router";
import { logout } from "./features/auth/api";
import { LoginPage } from "./features/auth/LoginPage";
import { SessionsPanel } from "./features/auth/SessionsPanel";
import { SetupPage } from "./features/auth/SetupPage";
import { authStatusQueryKey, useAuthStatus } from "./features/auth/useAuthStatus";

function Centered({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
      <p className="max-w-sm text-center text-sm text-slate-400">{children}</p>
    </div>
  );
}

function Dashboard() {
  const queryClient = useQueryClient();

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Private Academic Planner</h1>
          <button
            className="btn-secondary"
            onClick={async () => {
              await logout();
              await queryClient.invalidateQueries({ queryKey: authStatusQueryKey });
            }}
          >
            Log out
          </button>
        </div>
        <p className="text-sm text-slate-400">
          The calendar and task board land in a later stage. You&apos;re signed in.
        </p>
        <SessionsPanel />
      </div>
    </div>
  );
}

function RootRoute() {
  const { data, isLoading } = useAuthStatus();

  if (isLoading) return <Centered>Loading...</Centered>;
  if (!data?.ownerExists) {
    return <Centered>No owner account exists yet. Run the bootstrap script to get a setup link.</Centered>;
  }
  if (!data.authenticated) return <Navigate to="/login" replace />;
  return <Dashboard />;
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRoute />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/setup" element={<SetupPage />} />
    </Routes>
  );
}
