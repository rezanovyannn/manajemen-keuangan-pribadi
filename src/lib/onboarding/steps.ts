// Urutan wizard /mulai. Intro punya 3 layar (?layar=1..3); langkah lain satu layar.

export const LANGKAH = ["intro", "nama", "akun", "budget", "tagihan", "tujuan", "selesai"] as const;
export type Langkah = (typeof LANGKAH)[number];

export const JUDUL_LANGKAH: Record<Langkah, string> = {
  intro: "Kenalan",
  nama: "Nama",
  akun: "Akun",
  budget: "Budget",
  tagihan: "Tagihan rutin",
  tujuan: "Tujuan tabungan",
  selesai: "Selesai",
};

export const JUMLAH_LAYAR_INTRO = 3;

// Langkah yang boleh dilewati (akun pertama wajib agar aplikasi bisa dipakai).
export const BISA_DILEWATI: ReadonlySet<Langkah> = new Set(["intro", "budget", "tagihan", "tujuan"]);

export function parseLangkah(v: unknown): Langkah {
  return typeof v === "string" && (LANGKAH as readonly string[]).includes(v) ? (v as Langkah) : "intro";
}

export function parseLayar(v: unknown): number {
  const n = typeof v === "string" ? Number(v) : NaN;
  return Number.isInteger(n) && n >= 1 && n <= JUMLAH_LAYAR_INTRO ? n : 1;
}

export function langkahBerikutnya(l: Langkah): Langkah {
  const i = LANGKAH.indexOf(l);
  return LANGKAH[Math.min(i + 1, LANGKAH.length - 1)]!;
}

export function langkahSebelumnya(l: Langkah): Langkah | null {
  const i = LANGKAH.indexOf(l);
  return i <= 0 ? null : LANGKAH[i - 1]!;
}

export const hrefLangkah = (l: Langkah, layar?: number) => `/mulai?langkah=${l}${layar ? `&layar=${layar}` : ""}`;

// Pengguna baru (wizard belum selesai/dilewati) diarahkan dari Beranda ke /mulai.
export function perluOnboarding(profile: { onboarding_completed_at: string | null } | null): boolean {
  return profile !== null && profile.onboarding_completed_at === null;
}
