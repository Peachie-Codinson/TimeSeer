import { createHash, randomBytes } from "node:crypto";
import { hash as argonHash, verify as argonVerify } from "@node-rs/argon2";
import { and, eq, isNull, ne } from "drizzle-orm";
import { config } from "../../config.js";
import { db } from "../../db/connection.js";
import { owners, sessions, setupTokens } from "../../db/schema.js";

const SESSION_TOKEN_BYTES = 32;
const SETUP_TOKEN_BYTES = 32;
const SETUP_TOKEN_TTL_MS = 60 * 60 * 1000; // one hour
const SESSION_RENEW_THRESHOLD_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const LAST_SEEN_UPDATE_INTERVAL_MS = 60 * 60 * 1000; // one hour
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

const hashToken = (rawToken: string) => createHash("sha256").update(rawToken).digest("hex");

const generateToken = (bytes: number) => randomBytes(bytes).toString("base64url");

// --- Passwords ---------------------------------------------------------------

export const hashPassword = (password: string) => argonHash(password);

export const verifyPassword = (hash: string, password: string) => argonVerify(hash, password);

// --- Setup tokens --------------------------------------------------------------

export function createSetupToken() {
  const rawToken = generateToken(SETUP_TOKEN_BYTES);
  const now = Date.now();

  db.insert(setupTokens)
    .values({
      tokenHash: hashToken(rawToken),
      expiresAt: now + SETUP_TOKEN_TTL_MS,
      createdAt: now,
    })
    .run();

  return rawToken;
}

export function consumeSetupToken(rawToken: string): boolean {
  const tokenHash = hashToken(rawToken);
  const now = Date.now();

  const result = db
    .update(setupTokens)
    .set({ consumedAt: now })
    .where(
      and(
        eq(setupTokens.tokenHash, tokenHash),
        isNull(setupTokens.consumedAt),
      ),
    )
    .run();

  if (result.changes === 0) {
    return false;
  }

  const row = db.select().from(setupTokens).where(eq(setupTokens.tokenHash, tokenHash)).get();
  return row !== undefined && row.expiresAt >= now;
}

export function ownerExists(): boolean {
  return db.select({ id: owners.id }).from(owners).get() !== undefined;
}

export class SetupError extends Error {
  constructor(public code: "invalid_token" | "owner_exists") {
    super(code);
  }
}

export interface ClaimSetupInput {
  rawToken: string;
  email: string;
  passwordHash: string;
  timezone: string;
  deviceName?: string;
  userAgent?: string;
}

/** Atomically consumes the setup token and creates the singleton owner + first session. */
export function claimSetup(input: ClaimSetupInput) {
  return db.transaction((tx) => {
    const now = Date.now();
    const tokenHash = hashToken(input.rawToken);

    const tokenRow = tx.select().from(setupTokens).where(eq(setupTokens.tokenHash, tokenHash)).get();
    if (!tokenRow || tokenRow.consumedAt !== null || tokenRow.expiresAt < now) {
      throw new SetupError("invalid_token");
    }

    if (tx.select({ id: owners.id }).from(owners).get()) {
      throw new SetupError("owner_exists");
    }

    tx.update(setupTokens).set({ consumedAt: now }).where(eq(setupTokens.id, tokenRow.id)).run();

    const owner = tx
      .insert(owners)
      .values({
        email: input.email,
        passwordHash: input.passwordHash,
        timezone: input.timezone,
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .get();

    const rawSessionToken = generateToken(SESSION_TOKEN_BYTES);
    const session = tx
      .insert(sessions)
      .values({
        tokenHash: hashToken(rawSessionToken),
        deviceName: input.deviceName,
        userAgent: input.userAgent,
        createdAt: now,
        lastSeenAt: now,
        expiresAt: now + config.sessionMaxAgeDays * 24 * 60 * 60 * 1000,
      })
      .returning()
      .get();

    return { owner, session, rawSessionToken };
  }, { behavior: "immediate" });
}

// --- Owner and login throttling -------------------------------------------------

export function getOwner() {
  return db.select().from(owners).get();
}

export function isOwnerLocked(owner: typeof owners.$inferSelect): boolean {
  return owner.lockedUntil !== null && owner.lockedUntil > Date.now();
}

export function recordFailedLogin(ownerId: string, currentAttempts: number) {
  const attempts = currentAttempts + 1;
  const now = Date.now();

  db.update(owners)
    .set({
      failedLoginAttempts: attempts,
      lockedUntil: attempts >= MAX_LOGIN_ATTEMPTS ? now + LOCKOUT_DURATION_MS : null,
      updatedAt: now,
    })
    .where(eq(owners.id, ownerId))
    .run();
}

export function resetLoginAttempts(ownerId: string) {
  db.update(owners)
    .set({ failedLoginAttempts: 0, lockedUntil: null, updatedAt: Date.now() })
    .where(eq(owners.id, ownerId))
    .run();
}

export function updateOwnerPassword(ownerId: string, passwordHash: string) {
  db.update(owners)
    .set({ passwordHash, updatedAt: Date.now() })
    .where(eq(owners.id, ownerId))
    .run();
}

export function invalidateAllSessions(exceptSessionId?: string) {
  const now = Date.now();
  db.update(sessions)
    .set({ revokedAt: now })
    .where(
      exceptSessionId
        ? and(isNull(sessions.revokedAt), ne(sessions.id, exceptSessionId))
        : isNull(sessions.revokedAt),
    )
    .run();
}

// --- Sessions --------------------------------------------------------------------

export interface CreateSessionInput {
  deviceName?: string;
  userAgent?: string;
}

export function createSession(input: CreateSessionInput) {
  const rawToken = generateToken(SESSION_TOKEN_BYTES);
  const now = Date.now();
  const expiresAt = now + config.sessionMaxAgeDays * 24 * 60 * 60 * 1000;

  const session = db
    .insert(sessions)
    .values({
      tokenHash: hashToken(rawToken),
      deviceName: input.deviceName,
      userAgent: input.userAgent,
      createdAt: now,
      lastSeenAt: now,
      expiresAt,
    })
    .returning()
    .get();

  return { rawToken, session };
}

export function validateSessionToken(rawToken: string) {
  const tokenHash = hashToken(rawToken);
  const session = db.select().from(sessions).where(eq(sessions.tokenHash, tokenHash)).get();

  if (!session || session.revokedAt !== null) return null;

  const now = Date.now();
  if (session.expiresAt <= now) return null;

  const updates: Partial<typeof sessions.$inferInsert> = {};

  if (now - session.lastSeenAt >= LAST_SEEN_UPDATE_INTERVAL_MS) {
    updates.lastSeenAt = now;
  }
  if (session.expiresAt - now < SESSION_RENEW_THRESHOLD_MS) {
    updates.expiresAt = now + config.sessionMaxAgeDays * 24 * 60 * 60 * 1000;
  }

  if (Object.keys(updates).length > 0) {
    db.update(sessions).set(updates).where(eq(sessions.id, session.id)).run();
    Object.assign(session, updates);
  }

  return session;
}

export function revokeSession(sessionId: string) {
  db.update(sessions)
    .set({ revokedAt: Date.now() })
    .where(and(eq(sessions.id, sessionId), isNull(sessions.revokedAt)))
    .run();
}

export function listActiveSessions() {
  return db.select().from(sessions).where(isNull(sessions.revokedAt)).all();
}
