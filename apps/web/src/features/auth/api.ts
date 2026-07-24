import { apiClient } from "../../api/client";

export async function fetchAuthStatus() {
  const res = await apiClient.auth.status.$get();
  if (!res.ok) throw new Error("Failed to load auth status");
  return res.json();
}

export async function fetchSessions() {
  const res = await apiClient.auth.sessions.$get();
  if (!res.ok) throw new Error("Failed to load sessions");
  return res.json();
}

export async function completeSetup(input: {
  token: string;
  email: string;
  password: string;
  timezone: string;
}) {
  const res = await apiClient.auth.setup.$post({ json: input });
  if (!res.ok) {
    throw new Error(await readErrorCode(res, "setup_failed"));
  }
  return res.json();
}

export async function login(input: { email: string; password: string; deviceName?: string }) {
  const res = await apiClient.auth.login.$post({ json: input });
  if (!res.ok) {
    throw new Error(await readErrorCode(res, "login_failed"));
  }
  return res.json();
}

export async function logout() {
  const res = await apiClient.auth.logout.$post();
  if (!res.ok) throw new Error("Failed to log out");
}

export async function revokeSession(sessionId: string) {
  const res = await apiClient.auth.sessions[":sessionId"].$delete({ param: { sessionId } });
  if (!res.ok) throw new Error("Failed to revoke session");
}

export async function revokeOtherSessions() {
  const res = await apiClient.auth.sessions["revoke-others"].$post();
  if (!res.ok) throw new Error("Failed to revoke other sessions");
}

export async function changePassword(input: { currentPassword: string; newPassword: string }) {
  const res = await apiClient.auth["change-password"].$post({ json: input });
  if (!res.ok) {
    throw new Error(await readErrorCode(res, "change_password_failed"));
  }
}

async function readErrorCode(res: Response, fallback: string): Promise<string> {
  try {
    const body: unknown = await res.json();
    if (body && typeof body === "object" && "error" in body && typeof body.error === "string") {
      return body.error;
    }
  } catch {
    // ignore parse failures, fall through to the default message
  }
  return fallback;
}
