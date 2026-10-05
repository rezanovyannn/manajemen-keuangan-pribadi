import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getSupabaseEnv } from "./env";

// Klien Supabase untuk Server Component, Server Action, dan Route Handler.
// Buat baru di setiap request, jangan disimpan di variabel global.
export async function createClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = getSupabaseEnv();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Dipanggil dari Server Component (cookie read-only). Aman diabaikan
          // karena sesi diperbarui oleh proxy di setiap request.
        }
      },
    },
  });
}
