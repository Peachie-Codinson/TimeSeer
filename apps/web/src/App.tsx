import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router";
import { ArchivePage } from "./features/archive/ArchivePage";
import { AreasPage } from "./features/areas/AreasPage";
import { LoginPage } from "./features/auth/LoginPage";
import { SessionsPage } from "./features/auth/SessionsPage";
import { SetupPage } from "./features/auth/SetupPage";
import { useAuthStatus } from "./features/auth/useAuthStatus";
import { DashboardPage } from "./features/dashboard/DashboardPage";
import { QuotasPage } from "./features/quotas/QuotasPage";
import { TaskBoardPage } from "./features/tasks/TaskBoardPage";

function Centered({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
      <p className="max-w-sm text-center text-sm text-slate-400">{children}</p>
    </div>
  );
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { data, isLoading } = useAuthStatus();

  if (isLoading) return <Centered>Loading...</Centered>;
  if (!data?.ownerExists) {
    return <Centered>No owner account exists yet. Run the bootstrap script to get a setup link.</Centered>;
  }
  if (!data.authenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <RequireAuth>
            <DashboardPage />
          </RequireAuth>
        }
      />
      <Route
        path="/tasks"
        element={
          <RequireAuth>
            <TaskBoardPage />
          </RequireAuth>
        }
      />
      <Route
        path="/archive"
        element={
          <RequireAuth>
            <ArchivePage />
          </RequireAuth>
        }
      />
      <Route
        path="/quotas"
        element={
          <RequireAuth>
            <QuotasPage />
          </RequireAuth>
        }
      />
      <Route
        path="/areas"
        element={
          <RequireAuth>
            <AreasPage />
          </RequireAuth>
        }
      />
      <Route
        path="/sessions"
        element={
          <RequireAuth>
            <SessionsPage />
          </RequireAuth>
        }
      />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/setup" element={<SetupPage />} />
    </Routes>
  );
}
