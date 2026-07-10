/**
 * Smoke test for the security/multi-tenancy fix batch.
 *
 * Calls every directly-callable function from the change set and prints
 * pass/fail. Doesn't touch the DB and doesn't need Clerk — anything that
 * does (vector-search routes, tenant resolver, the embedding-omit reads)
 * needs the dev server with a real session, called out at the bottom.
 *
 * Usage:
 *   pnpm exec ts-node --project tsconfig.scripts.json scripts/verify-fixes.ts
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { createHmac } from 'crypto';

const results: { name: string; ok: boolean; detail?: string }[] = [];

function check(name: string, fn: () => void | Promise<void>): Promise<void> {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      results.push({ name, ok: true });
      console.log(`  ✓ ${name}`);
    })
    .catch((err) => {
      results.push({ name, ok: false, detail: err?.message ?? String(err) });
      console.log(`  ✗ ${name}\n      ${err?.message ?? err}`);
    });
}

function assert<T>(actual: T, predicate: (v: T) => boolean, message: string): void {
  if (!predicate(actual)) {
    throw new Error(`${message} — got ${JSON.stringify(actual)}`);
  }
}

async function main() {
  // ─── 1. rate-limit (the original request-rate limiter) ───────────────
  console.log('\nrate-limit: request bucket');
  const rl = await import('../lib/rate-limit');

  await check('rateLimit allows under-limit requests', () => {
    for (let i = 0; i < 5; i++) {
      const r = rl.rateLimit('rl-test-1', 5, 10_000);
      assert(r, (v) => v.allowed, `iteration ${i} should allow`);
    }
  });

  await check('rateLimit blocks once limit is hit', () => {
    const r = rl.rateLimit('rl-test-1', 5, 10_000);
    assert(r, (v) => v.allowed === false && v.remaining === 0, 'should be blocked');
  });

  await check('rateLimit window rolls over', async () => {
    rl.rateLimit('rl-test-2', 1, 50); // burn the bucket
    rl.rateLimit('rl-test-2', 1, 50);
    await new Promise((r) => setTimeout(r, 60));
    const r = rl.rateLimit('rl-test-2', 1, 50);
    assert(r, (v) => v.allowed, 'should be allowed after window expires');
  });

  // ─── 2. rate-limit (failure bucket) ──────────────────────────────────
  console.log('\nrate-limit: failure/lockout bucket');

  await check('getLockoutState is clean for unseen key', () => {
    const s = rl.getLockoutState('lock-test-1');
    assert(s, (v) => v.locked === false && v.lockedUntil === 0, 'should be clean');
  });

  await check('recordFailedAttempt increments, locks at threshold', () => {
    // First 4 failures: not locked
    for (let i = 0; i < 4; i++) {
      const r = rl.recordFailedAttempt('lock-test-2', 5, 60_000, 60_000);
      assert(r, (v) => v.locked === false, `attempt ${i + 1} should NOT lock`);
    }
    // 5th failure: locks
    const r5 = rl.recordFailedAttempt('lock-test-2', 5, 60_000, 60_000);
    assert(r5, (v) => v.locked === true && v.lockedUntil > Date.now(), 'attempt 5 should lock');
  });

  await check('getLockoutState reports active lock', () => {
    const s = rl.getLockoutState('lock-test-2');
    assert(s, (v) => v.locked === true, 'lock-test-2 should be locked');
  });

  await check('resetFailures clears the bucket on success', () => {
    rl.resetFailures('lock-test-2');
    const s = rl.getLockoutState('lock-test-2');
    assert(s, (v) => v.locked === false, 'should be clean after reset');
  });

  await check('lockout auto-expires when lockoutMs passes', async () => {
    // Trip the lock fast
    for (let i = 0; i < 5; i++) {
      rl.recordFailedAttempt('lock-test-3', 5, 1_000, 50);
    }
    assert(rl.getLockoutState('lock-test-3'), (v) => v.locked, 'should be locked');
    await new Promise((r) => setTimeout(r, 70));
    const s = rl.getLockoutState('lock-test-3');
    assert(s, (v) => v.locked === false, 'lock should have expired');
  });

  await check('failures within window roll over after windowMs', async () => {
    rl.recordFailedAttempt('lock-test-4', 5, 50, 10_000);
    rl.recordFailedAttempt('lock-test-4', 5, 50, 10_000);
    await new Promise((r) => setTimeout(r, 70));
    // Window rolled over → count resets, this is failure #1 again, not lockout
    const r = rl.recordFailedAttempt('lock-test-4', 5, 50, 10_000);
    assert(r, (v) => v.locked === false && v.remaining === 4, 'window should have rolled over');
  });

  await check('getRequestIP picks x-forwarded-for first', () => {
    const h = new Headers({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8', 'x-real-ip': '9.9.9.9' });
    assert(rl.getRequestIP(h), (v) => v === '1.2.3.4', 'should pick first forwarded IP');
  });

  await check('getRequestIP falls back to x-real-ip', () => {
    const h = new Headers({ 'x-real-ip': '9.9.9.9' });
    assert(rl.getRequestIP(h), (v) => v === '9.9.9.9', 'should fall back to x-real-ip');
  });

  await check('getRequestIP falls back to "unknown"', () => {
    assert(rl.getRequestIP(new Headers()), (v) => v === 'unknown', 'should be unknown');
  });

  // ─── 3. console-auth ─────────────────────────────────────────────────
  console.log('\nconsole-auth');

  // Set known-good env first
  const KNOWN_SECRET = 'A'.repeat(40); // ≥32
  const KNOWN_PW = 'B'.repeat(20); // ≥16
  process.env.CONSOLE_SESSION_SECRET = KNOWN_SECRET;
  process.env.CONSOLE_PASSWORD = KNOWN_PW;

  const ca = await import('../lib/console-auth');

  await check('exports CONSOLE_PASSWORD_MIN_LENGTH=16', () => {
    assert(ca.CONSOLE_PASSWORD_MIN_LENGTH, (v) => v === 16, 'min pw length should be 16');
  });
  await check('exports CONSOLE_SESSION_SECRET_MIN_LENGTH=32', () => {
    assert(ca.CONSOLE_SESSION_SECRET_MIN_LENGTH, (v) => v === 32, 'min secret length should be 32');
  });

  await check('consoleCookieOptions has sameSite=strict, httpOnly, path=/', () => {
    assert(ca.consoleCookieOptions.sameSite, (v) => v === 'strict', 'sameSite');
    assert(ca.consoleCookieOptions.httpOnly, (v) => v === true, 'httpOnly');
    assert(ca.consoleCookieOptions.path, (v) => v === '/', 'path');
    // secure: NODE_ENV is 'test' here so it should be true (only false in development)
    assert(ca.consoleCookieOptions.secure, (v) => typeof v === 'boolean', 'secure is a bool');
  });

  await check('isConsolePasswordCorrect: accepts correct password', () => {
    assert(ca.isConsolePasswordCorrect(KNOWN_PW), (v) => v === true, 'should accept');
  });
  await check('isConsolePasswordCorrect: rejects wrong password', () => {
    assert(ca.isConsolePasswordCorrect('wrong-password-1234'), (v) => v === false, 'should reject');
  });
  await check('isConsolePasswordCorrect: rejects empty', () => {
    assert(ca.isConsolePasswordCorrect(''), (v) => v === false, 'should reject empty');
  });

  await check('issue+verify token roundtrip', () => {
    const t = ca.issueConsoleToken();
    assert(t.split('.'), (parts) => parts.length === 3, 'token shape <nonce>.<exp>.<mac>');
    assert(ca.verifyConsoleToken(t), (v) => v === true, 'should verify');
  });

  await check('verifyConsoleToken: rejects tampered token', () => {
    const t = ca.issueConsoleToken();
    const tampered = t.slice(0, -2) + 'ff'; // flip last byte of mac
    assert(ca.verifyConsoleToken(tampered), (v) => v === false, 'should reject tampered');
  });

  await check('verifyConsoleToken: rejects null/empty', () => {
    assert(ca.verifyConsoleToken(null), (v) => v === false, 'null');
    assert(ca.verifyConsoleToken(undefined), (v) => v === false, 'undefined');
    assert(ca.verifyConsoleToken(''), (v) => v === false, 'empty');
    assert(ca.verifyConsoleToken('a.b'), (v) => v === false, 'wrong segment count');
  });

  await check('verifyConsoleToken: rejects expired token', () => {
    // Manually craft an expired token using the same secret.
    const nonce = 'deadbeef';
    const expiry = String(Math.floor(Date.now() / 1000) - 1); // already expired
    const body = `${nonce}.${expiry}`;
    const mac = createHmac('sha256', KNOWN_SECRET).update(body).digest('hex');
    assert(ca.verifyConsoleToken(`${body}.${mac}`), (v) => v === false, 'should reject expired');
  });

  await check('getPassword throws if too short', async () => {
    // Re-import via a fresh process.env to trip the length guard
    process.env.CONSOLE_PASSWORD = 'too-short';
    try {
      ca.isConsolePasswordCorrect('anything');
      throw new Error('asserted throw, got no throw');
    } catch (e: any) {
      assert(e.message, (m) => m.includes('too short'), 'error mentions length');
    } finally {
      process.env.CONSOLE_PASSWORD = KNOWN_PW;
    }
  });

  await check('getSecret throws if too short', async () => {
    process.env.CONSOLE_SESSION_SECRET = 'short';
    try {
      ca.issueConsoleToken();
      throw new Error('asserted throw, got no throw');
    } catch (e: any) {
      assert(e.message, (m) => m.includes('too short'), 'error mentions length');
    } finally {
      process.env.CONSOLE_SESSION_SECRET = KNOWN_SECRET;
    }
  });

  // ─── 4. instrumentation register() ───────────────────────────────────
  console.log('\ninstrumentation');

  await check('register() in nodejs runtime with valid env: no throw', async () => {
    process.env.NEXT_RUNTIME = 'nodejs';
    process.env.CONSOLE_PASSWORD = KNOWN_PW;
    process.env.CONSOLE_SESSION_SECRET = KNOWN_SECRET;
    const { register } = await import('../instrumentation');
    await register();
  });

  await check('register() in edge runtime is a no-op', async () => {
    process.env.NEXT_RUNTIME = 'edge';
    delete process.env.CONSOLE_PASSWORD; // would trip the check if it ran
    const mod = await import('../instrumentation');
    await mod.register(); // no throw → no-op
  });

  await check('register() warns on short password in dev, no throw', async () => {
    process.env.NEXT_RUNTIME = 'nodejs';
    const prevNodeEnv = process.env.NODE_ENV;
    (process.env as any).NODE_ENV = 'development';
    process.env.CONSOLE_PASSWORD = 'short';
    process.env.CONSOLE_SESSION_SECRET = KNOWN_SECRET;
    const mod = await import('../instrumentation');
    let warned = false;
    const origWarn = console.warn;
    console.warn = (msg: any) => {
      if (typeof msg === 'string' && msg.includes('too short')) warned = true;
    };
    try {
      await mod.register();
    } finally {
      console.warn = origWarn;
      (process.env as any).NODE_ENV = prevNodeEnv;
      process.env.CONSOLE_PASSWORD = KNOWN_PW;
    }
    assert(warned, (v) => v === true, 'should have warned');
  });

  // ─── Summary ─────────────────────────────────────────────────────────
  const failed = results.filter((r) => !r.ok);
  console.log(`\n──────── ${results.length - failed.length}/${results.length} passed ────────`);
  if (failed.length > 0) {
    console.log('\nFailures:');
    for (const f of failed) console.log(`  • ${f.name}: ${f.detail}`);
    process.exit(1);
  }

  console.log('\nNot covered by this script (need running dev server + real Clerk session):');
  console.log('  • lib/auth/tenant.ts — requires Clerk currentUser()');
  console.log('  • lib/ai/vector-search.ts — uses next/headers cookies()');
  console.log('  • /api/vector-search routes — need MongoDB + tenant in session');
  console.log('  • Fix 3 reads (getShadowCaseDetail, getPublicIssues) — need Clerk + Prisma');
}

main().catch((err) => {
  console.error('\nverify-fixes crashed:', err);
  process.exit(1);
});
