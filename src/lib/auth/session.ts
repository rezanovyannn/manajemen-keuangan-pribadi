import "server-only";

import { redirect } from "next/navigation";

import { HALAMAN_MASUK } from "@/lib/auth/routes";
import { createClient } from "@/lib/supabase/server";

// Ambil pengguna yang login untuk halaman terlindungi.
// Proxy sudah mengarahkan tamu ke /masuk; ini lapisan kedua di level halaman.
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(HALAMAN_MASUK);

  return { supabase, user };
}
