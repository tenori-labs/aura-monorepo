'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  CONSOLE_COOKIE_NAME,
  consoleCookieOptions,
  isConsolePasswordCorrect,
  issueConsoleToken,
} from '@/lib/console-auth';
import {
  getLockoutState,
  getRequestIP,
  recordFailedAttempt,
  resetFailures,
} from '@/lib/rate-limit';

/**
 * Login server action for the Aura console.
 *
 * Compares the submitted password against `CONSOLE_PASSWORD`. On match,
 * sets a signed HMAC session cookie and redirects to `/console`. On
 * mismatch, returns an error so the form can show it inline.
 *
 * Brute-force defense: 5 failures per IP per minute trigger a 60s lockout.
 * Successful login wipes the bucket so legitimate users aren't punished
 * for a single typo.
 */
export async function consoleLogin(
  _prev: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string }> {
  const password = (formData.get('password') as string | null)?.trim() ?? '';

  const headerStore = await headers();
  const ip = getRequestIP(headerStore);
  const bucketKey = `console-login:${ip}`;

  // Check for active lockout BEFORE doing any password work.
  const lockout = getLockoutState(bucketKey);
  if (lockout.locked) {
    const seconds = Math.max(1, Math.ceil((lockout.lockedUntil - Date.now()) / 1000));
    return { error: `Too many attempts. Try again in ${seconds}s.` };
  }

  if (!password) {
    return { error: 'Password is required.' };
  }

  if (!isConsolePasswordCorrect(password)) {
    const result = recordFailedAttempt(bucketKey);
    if (result.locked) {
      return { error: 'Too many attempts. Try again in 60s.' };
    }
    return { error: 'Wrong password.' };
  }

  // Success — clear the bucket so a future typo doesn't accumulate against
  // a legitimate user.
  resetFailures(bucketKey);

  const token = issueConsoleToken();
  const cookieStore = await cookies();
  cookieStore.set(CONSOLE_COOKIE_NAME, token, consoleCookieOptions);

  redirect('/console');
}

/** Clears the console session cookie. */
export async function consoleLogout(): Promise<never> {
  const cookieStore = await cookies();
  cookieStore.delete(CONSOLE_COOKIE_NAME);
  redirect('/console/login');
}
