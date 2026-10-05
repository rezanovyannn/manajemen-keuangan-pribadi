import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseEnv } from "./env";

// Perbarui sesi Supabase (refresh token) di setiap request dan kembalikan
// response yang membawa cookie terbaru beserta pengguna yang sedang login.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, anonKey } = getSupabaseEnv();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Jangan taruh kode lain di antara createServerClient dan getUser():
  // getUser() memvalidasi token ke server Supabase dan me-refresh sesi.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user };
}
