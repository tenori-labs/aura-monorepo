import { createBrowserClient } from '@supabase/ssr';

/**
 * Initializes a Supabase client for browser environments.
 * Uses public environment variables to establish the connection.
 *
 * @returns An initialized Supabase browser client instance
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
  );
}
