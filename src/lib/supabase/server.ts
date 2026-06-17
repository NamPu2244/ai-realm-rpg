import { createClient } from "@supabase/supabase-js";

// Server-only client that uses the service role key so API routes can read/write
// Supabase without needing the user's session cookie. Never import this in
// client components — the service role key must stay server-side only.
export function getSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not configured"
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}
