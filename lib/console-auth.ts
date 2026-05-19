import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

/**
 * MVP password gate for the super-admin Aura console at `/console/*`.
 *
 * Issues a signed token after successful password match and verifies the
 * cookie on subsequent requests. No DB / no Clerk involved — this is
 * deliberately a thin shim that gets ripped out when real Clerk
 * super-admin auth lands. The interface (`verifyConsoleSession`) stays
 * stable, so the proxy.ts middleware and `/api/console/*` routes don't
 * change when we swap the implementation.
 */

export const CONSOLE_COOKIE_NAME = 'console_session';
const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 hours

function getSecret(): string {
  const secret = process.env.CONSOLE_SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      'CONSOLE_SESSION_SECRET is missing or too short (need ≥16 chars). Set it in your env.'
    );
  }
  return secret;
}

function getPassword(): string {
  const pw = process.env.CONSOLE_PASSWORD;
  if (!pw) {
    throw new Error('CONSOLE_PASSWORD is not set in env.');
  }
  return pw;
}

function sign(payload: string): string {
  return createHmac('sha256', getSecret()).update(payload).digest('hex');
}

/**
 * Constant-time string equality check. Prevents timing attacks against the
 * password comparison (the difference is microscopic for short strings but
 * cheap to do right).
 */
function constantTimeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

/** True if `password` matches the env-configured `CONSOLE_PASSWORD`. */
export function isConsolePasswordCorrect(password: string): boolean {
  return constantTimeEqual(password, getPassword());
}

/**
 * Signs a fresh session token. The token is `<nonce>.<expiry>.<hmac>`
 * (all hex/dec). Verifier just checks the HMAC and the expiry.
 */
export function issueConsoleToken(): string {
  const nonce = randomBytes(16).toString('hex');
  const expiry = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const body = `${nonce}.${expiry}`;
  return `${body}.${sign(body)}`;
}

/** True if the token is valid AND not expired. */
export function verifyConsoleToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [nonce, expiryStr, mac] = parts;
  const expected = sign(`${nonce}.${expiryStr}`);
  if (!constantTimeEqual(mac, expected)) return false;
  const expiry = Number.parseInt(expiryStr, 10);
  if (!Number.isFinite(expiry)) return false;
  if (Date.now() / 1000 > expiry) return false;
  return true;
}

/**
 * The cookie options we set on the console session cookie. Same shape used
 * by the login server action and the logout action.
 */
export const consoleCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: SESSION_TTL_SECONDS,
};
