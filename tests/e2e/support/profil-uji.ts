// Ubah kolom profil akun uji E2E lewat REST API Supabase biasa (login akun uji + RLS:
// hanya profil miliknya yang bisa diubah). Tidak memakai service_role.

type KolomProfil = Partial<{
  display_name: string | null;
  onboarding_completed_at: string | null;
  checklist_dismissed_at: string | null;
}>;

async function sesi() {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // CI tanpa .env.local: test yang memakai ini sudah di-skip.
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const r = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anon!, "Content-Type": "application/json" },
    body: JSON.stringify({ email: process.env.E2E_EMAIL, password: process.env.E2E_PASSWORD }),
  });
  if (!r.ok) throw new Error(`Login akun uji gagal: HTTP ${r.status}`);
  const { access_token, user } = (await r.json()) as { access_token: string; user: { id: string } };
  return { url, h: { apikey: anon!, Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" }, id: user.id };
}

export async function bacaProfilUji(): Promise<Required<KolomProfil>> {
  const { url, h, id } = await sesi();
  const r = await fetch(`${url}/rest/v1/profiles?id=eq.${id}&select=display_name,onboarding_completed_at,checklist_dismissed_at`, { headers: h });
  if (!r.ok) throw new Error(`Baca profil gagal: HTTP ${r.status}`);
  return ((await r.json()) as Required<KolomProfil>[])[0]!;
}

export async function ubahProfilUji(kolom: KolomProfil) {
  const { url, h, id } = await sesi();
  const r = await fetch(`${url}/rest/v1/profiles?id=eq.${id}`, { method: "PATCH", headers: h, body: JSON.stringify(kolom) });
  if (!r.ok) throw new Error(`Ubah profil gagal: HTTP ${r.status}`);
}
