import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { HALAMAN_MASUK, safeNextPath } from "@/lib/auth/routes";
import { createClient } from "@/lib/supabase/server";

// Tujuan link konfirmasi email dari Supabase.
// Mendukung dua format link: ?code= (PKCE, bawaan template) dan ?token_hash=&type=.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeNextPath(searchParams.get("next"));

  const supabase = await createClient();
  let error: { code?: string; status?: number } | null = null;

  if (code) {
    ({ error } = await supabase.auth.exchangeCodeForSession(code));
  } else if (tokenHash && type) {
    ({ error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash }));
  } else {
    error = { code: "missing_params" };
  }

  if (error) {
    console.error("[auth] konfirmasi gagal", { code: error.code, status: error.status });
    return NextResponse.redirect(new URL(`${HALAMAN_MASUK}?konfirmasi=gagal`, origin));
  }

  return NextResponse.redirect(new URL(next, origin));
}
