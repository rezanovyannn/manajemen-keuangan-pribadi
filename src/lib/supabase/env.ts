// Akses langsung `process.env.NEXT_PUBLIC_*` agar Next.js bisa meng-inline nilainya ke bundle klien.
export function getSupabaseEnv() {
  return readSupabaseEnv(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function readSupabaseEnv(url: string | undefined, anonKey: string | undefined) {
  const missing = [
    !url && "NEXT_PUBLIC_SUPABASE_URL",
    !anonKey && "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  ].filter(Boolean);

  if (!url || !anonKey) {
    throw new Error(
      `Konfigurasi Supabase belum lengkap: ${missing.join(", ")}. Isi di .env.local (lihat .env.example).`,
    );
  }

  return { url: url.trim(), anonKey: anonKey.trim() };
}
