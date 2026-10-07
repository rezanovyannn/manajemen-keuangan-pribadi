import { NextResponse, type NextRequest } from "next/server";

import {
  HALAMAN_MASUK,
  HALAMAN_SETELAH_MASUK,
  isGuestOnlyPath,
  isProtectedPath,
} from "@/lib/auth/routes";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname, search } = request.nextUrl;

  if (!user && isProtectedPath(pathname)) {
    return redirectWithCookies(request, response, HALAMAN_MASUK, pathname + search);
  }

  if (user && isGuestOnlyPath(pathname)) {
    return redirectWithCookies(request, response, HALAMAN_SETELAH_MASUK);
  }

  return response;
}

// Redirect sambil membawa cookie sesi yang baru di-refresh oleh updateSession.
function redirectWithCookies(
  request: NextRequest,
  response: NextResponse,
  target: string,
  next?: string,
) {
  const url = request.nextUrl.clone();
  url.pathname = target;
  url.search = "";
  if (next) url.searchParams.set("next", next);

  const redirect = NextResponse.redirect(url);
  for (const cookie of response.cookies.getAll()) {
    redirect.cookies.set(cookie);
  }
  return redirect;
}

export const config = {
  matcher: [
    // Lewati file statis, optimasi gambar, aset publik, dan file PWA (manifest, service worker).
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
