import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { clearSessionCookie, requireSession, setSessionCookie, withOptionalSession } from "../../middleware/auth.js";
import {
  SetupError,
  claimSetup,
  createSession,
  getOwner,
  hashPassword,
  invalidateAllSessions,
  isOwnerLocked,
  listActiveSessions,
  ownerExists,
  recordFailedLogin,
  resetLoginAttempts,
  revokeSession,
  updateOwnerPassword,
  verifyPassword,
} from "./service.js";

const sessionSummary = (session: { id: string; deviceName: string | null; userAgent: string | null; createdAt: number; lastSeenAt: number; expiresAt: number }, currentId: string) => ({
  id: session.id,
  deviceName: session.deviceName,
  userAgent: session.userAgent,
  createdAt: session.createdAt,
  lastSeenAt: session.lastSeenAt,
  expiresAt: session.expiresAt,
  isCurrent: session.id === currentId,
});

export const authRoutes = new Hono()
  .get("/status", withOptionalSession, (c) => {
    const session = c.get("session");
    return c.json({
      ownerExists: ownerExists(),
      authenticated: session !== null,
    });
  })

  .post(
    "/setup",
    zValidator(
      "json",
      z.object({
        token: z.string().min(1),
        email: z.string().email(),
        password: z.string().min(12),
        timezone: z.string().min(1),
      }),
    ),
    async (c) => {
      const { token, email, password, timezone } = c.req.valid("json");
      const passwordHash = await hashPassword(password);

      let result: ReturnType<typeof claimSetup>;
      try {
        result = claimSetup({
          rawToken: token,
          email,
          passwordHash,
          timezone,
          userAgent: c.req.header("User-Agent"),
        });
      } catch (err) {
        if (err instanceof SetupError) {
          const status = err.code === "owner_exists" ? 409 : 400;
          return c.json({ error: err.code }, status);
        }
        throw err;
      }

      setSessionCookie(c, result.rawSessionToken);
      return c.json({ email: result.owner.email, timezone: result.owner.timezone }, 201);
    },
  )

  .post(
    "/login",
    zValidator(
      "json",
      z.object({
        email: z.string().email(),
        password: z.string().min(1),
        deviceName: z.string().optional(),
      }),
    ),
    async (c) => {
      const { email, password, deviceName } = c.req.valid("json");
      const owner = getOwner();

      if (!owner) {
        return c.json({ error: "owner_not_configured" }, 400);
      }

      if (isOwnerLocked(owner)) {
        return c.json({ error: "too_many_attempts" }, 429);
      }

      const valid = owner.email === email && (await verifyPassword(owner.passwordHash, password));

      if (!valid) {
        recordFailedLogin(owner.id, owner.failedLoginAttempts);
        return c.json({ error: "invalid_credentials" }, 401);
      }

      resetLoginAttempts(owner.id);

      const { rawToken, session } = createSession({
        deviceName,
        userAgent: c.req.header("User-Agent"),
      });

      setSessionCookie(c, rawToken);
      return c.json({ email: owner.email, timezone: owner.timezone, sessionId: session.id });
    },
  )

  .post("/logout", withOptionalSession, (c) => {
    const session = c.get("session");
    if (session) revokeSession(session.id);
    clearSessionCookie(c);
    return c.body(null, 204);
  })

  .get("/sessions", requireSession, (c) => {
    const current = c.get("session");
    return c.json(listActiveSessions().map((s) => sessionSummary(s, current.id)));
  })

  .delete("/sessions/:sessionId", requireSession, (c) => {
    revokeSession(c.req.param("sessionId"));
    return c.body(null, 204);
  })

  .post("/sessions/revoke-others", requireSession, (c) => {
    const current = c.get("session");
    invalidateAllSessions(current.id);
    return c.body(null, 204);
  })

  .post(
    "/change-password",
    requireSession,
    zValidator(
      "json",
      z.object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(12),
      }),
    ),
    async (c) => {
      const { currentPassword, newPassword } = c.req.valid("json");
      const owner = getOwner();
      if (!owner) throw new HTTPException(500, { message: "Owner missing" });

      const valid = await verifyPassword(owner.passwordHash, currentPassword);
      if (!valid) {
        return c.json({ error: "invalid_credentials" }, 401);
      }

      updateOwnerPassword(owner.id, await hashPassword(newPassword));
      invalidateAllSessions();
      clearSessionCookie(c);
      return c.body(null, 204);
    },
  );
