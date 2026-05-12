'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  CONSOLE_COOKIE_NAME,
  consoleCookieOptions,
  isConsolePasswordCorrect,
  issueConsoleToken,
} from '@/lib/console-auth';

/**
 * Login server action for the Aura console.
 *
 * Compares the submitted password against `CONSOLE_PASSWORD`. On match,
 * sets a signed HMAC session cookie and redirects to `/console`. On
 * mismatch, returns an error so the form can show it inline.
 */
export async function consoleLogin(
  _prev: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string }> {
  const password = (formData.get('password') as string | null)?.trim() ?? '';

  if (!password) {
    return { error: 'Password is required.' };
  }

  if (!isConsolePasswordCorrect(password)) {
    return { error: 'Wrong password.' };
  }

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
