/**
 * Next.js `register()` hook — runs once per server boot.
 *
 * We use it to fail fast if security-critical env vars are misconfigured.
 * Catching this at boot is much better than catching it at the first
 * `/console/login` request, which would just throw a 500 to whoever was
 * unlucky enough to be that first user.
 *
 * Validations:
 *   - CONSOLE_PASSWORD must be ≥16 chars (admin password)
 *   - CONSOLE_SESSION_SECRET must be ≥32 chars (HMAC secret)
 *
 * Both are only required when the console feature is actually deployed —
 * for local dev without the console you can skip them, but in production
 * the boot fails loudly. This file runs in the Node.js runtime only.
 */

export async function register() {
  // Next.js sets NEXT_RUNTIME='nodejs' in the Node runtime and 'edge' in Edge.
  // We only validate in Node — Edge has no need to call console-auth and
  // doesn't see these env vars anyway.
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const {
    CONSOLE_PASSWORD_MIN_LENGTH,
    CONSOLE_SESSION_SECRET_MIN_LENGTH,
  } = await import('@/lib/console-auth');

  const problems: string[] = [];

  const password = process.env.CONSOLE_PASSWORD;
  if (password !== undefined) {
    if (password.length < CONSOLE_PASSWORD_MIN_LENGTH) {
      problems.push(
        `CONSOLE_PASSWORD is too short (${password.length} chars, need ≥${CONSOLE_PASSWORD_MIN_LENGTH}).`
      );
    }
  } else if (process.env.NODE_ENV === 'production') {
    problems.push('CONSOLE_PASSWORD is not set.');
  }

  const secret = process.env.CONSOLE_SESSION_SECRET;
  if (secret !== undefined) {
    if (secret.length < CONSOLE_SESSION_SECRET_MIN_LENGTH) {
      problems.push(
        `CONSOLE_SESSION_SECRET is too short (${secret.length} chars, need ≥${CONSOLE_SESSION_SECRET_MIN_LENGTH}).`
      );
    }
  } else if (process.env.NODE_ENV === 'production') {
    problems.push('CONSOLE_SESSION_SECRET is not set.');
  }

  if (problems.length > 0) {
    const message =
      '[instrumentation] Console auth env is misconfigured:\n  - ' +
      problems.join('\n  - ');
    if (process.env.NODE_ENV === 'production') {
      // In prod, refuse to start. Better a clear boot failure than a
      // silent vulnerability.
      throw new Error(message);
    }
    console.warn(message);
  }
}
