// "Belajar" dari riwayat transaksi pengguna untuk Catat kilat (tanpa AI, tanpa tabel baru):
// - tebakan kategori dari kata di catatan ("gojek" → Transportasi)
// - urutan kategori paling sering dipakai
// - favorit: transaksi yang sering diulang (catatan + nominal + akun + kategori sama)
// - akun terakhir dipakai

export type HistoryRow = {
  type: "expense" | "income";
  amount: number;
  account_id: string;
  category_id: string;
  note: string | null;
  occurred_on: string;
  created_at: string;
};

// Kata umum yang tidak membedakan kategori.
const KATA_UMUM = new Set(["dan", "untuk", "buat", "beli", "bayar", "yang", "dari", "ke", "di", "the", "and"]);

export function tokens(note: string | null): string[] {
  return [
    ...new Set(
      (note ?? "")
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .split(/\s+/)
        .filter((t) => t.length >= 3 && !/^\d+$/.test(t) && !KATA_UMUM.has(t)),
    ),
  ];
}

// Model: kata → (tipe:kategori → jumlah kemunculan). Disusun di server, dipakai di klien.
export type CategoryModel = Record<string, Record<string, number>>;

export function buildCategoryModel(rows: HistoryRow[], maxTokens = 400): CategoryModel {
  const hitung = new Map<string, Map<string, number>>();
  for (const r of rows) {
    for (const t of tokens(r.note)) {
      const m = hitung.get(t) ?? new Map<string, number>();
      const k = `${r.type}:${r.category_id}`;
      m.set(k, (m.get(k) ?? 0) + 1);
      hitung.set(t, m);
    }
  }
  const urut = [...hitung].sort((a, b) => total(b[1]) - total(a[1])).slice(0, maxTokens);
  return Object.fromEntries(urut.map(([t, m]) => [t, Object.fromEntries(m)]));
}

const total = (m: Map<string, number>) => [...m.values()].reduce((s, n) => s + n, 0);

// Tebakan kategori untuk catatan; null jika tidak ada kata yang dikenali.
// Kata cocok persis diutamakan; awalan (mis. "gojek" untuk "gojekk") sebagai cadangan.
export function guessCategory(note: string, type: HistoryRow["type"], model: CategoryModel): string | null {
  const skor = new Map<string, number>();
  for (const t of tokens(note)) {
    const persis = model[t];
    const sumber = persis ? [persis] : Object.entries(model).filter(([k]) => t.length >= 4 && (k.startsWith(t) || t.startsWith(k))).map(([, v]) => v);
    for (const m of sumber) {
      for (const [k, n] of Object.entries(m)) {
        const [tipe, id] = k.split(":") as [string, string];
        if (tipe === type) skor.set(id, (skor.get(id) ?? 0) + n * (persis ? 2 : 1));
      }
    }
  }
  let terbaik: string | null = null;
  let max = 0;
  for (const [id, n] of skor) if (n > max) [terbaik, max] = [id, n];
  return terbaik;
}

// Id kategori urut dari yang paling sering dipakai (per tipe), lalu sisanya sesuai urutan asal.
export function rankCategories(rows: HistoryRow[], categoryIds: string[], type: HistoryRow["type"]): string[] {
  const hitung = new Map<string, number>();
  for (const r of rows) if (r.type === type) hitung.set(r.category_id, (hitung.get(r.category_id) ?? 0) + 1);
  const posisi = new Map(categoryIds.map((id, i) => [id, i]));
  return [...categoryIds].sort((a, b) => (hitung.get(b) ?? 0) - (hitung.get(a) ?? 0) || posisi.get(a)! - posisi.get(b)!);
}

export type Favorite = {
  type: HistoryRow["type"];
  amount: number;
  accountId: string;
  categoryId: string;
  note: string;
  count: number;
};

// Favorit: kombinasi sama muncul >= minCount kali; urut paling sering lalu paling baru.
export function favorites(rows: HistoryRow[], { minCount = 3, max = 6 } = {}): Favorite[] {
  const grup = new Map<string, { f: Favorite; terakhir: string }>();
  for (const r of rows) {
    const note = (r.note ?? "").trim();
    if (!note) continue;
    const k = [r.type, r.amount, r.account_id, r.category_id, note.toLowerCase()].join("|");
    const kapan = `${r.occurred_on} ${r.created_at}`;
    const ada = grup.get(k);
    if (ada) {
      ada.f.count++;
      if (kapan > ada.terakhir) ada.terakhir = kapan;
    } else {
      grup.set(k, { f: { type: r.type, amount: r.amount, accountId: r.account_id, categoryId: r.category_id, note, count: 1 }, terakhir: kapan });
    }
  }
  return [...grup.values()]
    .filter((g) => g.f.count >= minCount)
    .sort((a, b) => b.f.count - a.f.count || b.terakhir.localeCompare(a.terakhir))
    .slice(0, max)
    .map((g) => g.f);
}

// Akun transaksi terbaru (yang masih aktif); null jika belum ada.
export function lastAccountId(rows: HistoryRow[], activeIds: Set<string>): string | null {
  let terbaru: HistoryRow | null = null;
  for (const r of rows) {
    if (!activeIds.has(r.account_id)) continue;
    if (!terbaru || `${r.occurred_on} ${r.created_at}` > `${terbaru.occurred_on} ${terbaru.created_at}`) terbaru = r;
  }
  return terbaru?.account_id ?? null;
}
