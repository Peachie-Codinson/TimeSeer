import { useState } from "react";
import { useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { login } from "./api";
import { authStatusQueryKey } from "./useAuthStatus";

export function LoginPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login({ email, password, deviceName: navigator.userAgent.split(" ")[0] });
      // Write the known-fresh state directly instead of invalidating: the target
      // route mounts a brand-new query observer, which would otherwise read the
      // stale cached "unauthenticated" value before a background refetch resolves.
      queryClient.setQueryData(authStatusQueryKey, { ownerExists: true, authenticated: true });
      navigate("/", { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "login_failed";
      setError(
        message === "too_many_attempts"
          ? "Too many failed attempts. Try again in a few minutes."
          : "Invalid email or password.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
      <div className="w-full max-w-sm rounded-lg border border-slate-800 bg-slate-900 p-6">
        <h1 className="mb-4 text-lg font-semibold">Sign in</h1>
        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block text-sm">
            <span className="mb-1 block text-slate-400">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-400">Password</span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
            />
          </label>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
