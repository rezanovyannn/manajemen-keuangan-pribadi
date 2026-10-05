import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseEnv } from "./env";

// Klien Supabase untuk Client Component (berjalan di browser).
export function createClient() {
  const { url, anonKey } = getSupabaseEnv();
  return createBrowserClient(url, anonKey);
}
