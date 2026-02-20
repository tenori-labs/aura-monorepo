import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Initializes a Supabase client for server environments (Server Components, Actions, Route Handlers).
 * Manages cookie extraction and injection seamlessly during server-side rendering.
 *
 * @returns An awaited Supabase server client instance capable of reading/writing auth cookies
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}
