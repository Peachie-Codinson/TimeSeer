import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import { config } from "../config.js";
import { validateSessionToken } from "../modules/auth/service.js";

type Session = ReturnType<typeof validateSessionToken>;

export const setSessionCookie = (c: Context, rawToken: string) => {
  setCookie(c, config.sessionCookieName, rawToken, {
    httpOnly: true,
    secure: config.nodeEnv === "production",
    sameSite: "Lax",
    path: "/",
    maxAge: config.sessionMaxAgeDays * 24 * 60 * 60,
  });
};

export const clearSessionCookie = (c: Context) => {
  deleteCookie(c, config.sessionCookieName, { path: "/" });
};

/** Attaches `session` to the context when a valid session cookie is present; does not reject. */
export const withOptionalSession = createMiddleware<{
  Variables: { session: Session };
}>(async (c, next) => {
  const rawToken = getCookie(c, config.sessionCookieName);
  c.set("session", rawToken ? validateSessionToken(rawToken) : null);
  await next();
});

/** Rejects with 401 unless a valid session cookie is present. */
export const requireSession = createMiddleware<{
  Variables: { session: NonNullable<Session> };
}>(async (c, next) => {
  const rawToken = getCookie(c, config.sessionCookieName);
  const session = rawToken ? validateSessionToken(rawToken) : null;

  if (!session) {
    return c.json({ error: "Authentication required" }, 401);
  }

  c.set("session", session);
  await next();
});
