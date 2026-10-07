// Antrean transaksi offline yang disimpan di HP (localStorage) sampai terkirim.
// Hanya pemasukan/pengeluaran; transfer & biaya admin wajib dicatat saat online.
// Setiap item membawa id (UUID) sejak dibuat di HP, sehingga pengiriman ulang
// tidak membuat transaksi ganda (database menolak id yang sama).

export const KUNCI_ANTREAN = "keuangan:antrean-offline";
export const KUNCI_OPSI = "keuangan:opsi-offline";

export type ItemOffline = {
  id: string;
  type: "expense" | "income";
  amount: string; // teks seperti yang diketik ("35.000"); divalidasi server
  accountId: string;
  categoryId: string;
  occurredOn: string;
  note: string;
  createdAt: string;
  error?: string; // alasan gagal kirim terakhir (mis. akun diarsipkan)
};

export type OpsiOffline = {
  accounts: { value: string; label: string }[];
  categories: { value: string; label: string; type: "income" | "expense" }[];
  savedAt: string;
};

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

function validItem(v: unknown): v is ItemOffline {
  return (
    isObj(v) &&
    typeof v.id === "string" &&
    (v.type === "expense" || v.type === "income") &&
    ["amount", "accountId", "categoryId", "occurredOn", "note", "createdAt"].every((k) => typeof v[k] === "string")
  );
}

// Baca antrean dengan aman: data rusak/asing diabaikan, tidak membuat aplikasi error.
export function parseAntrean(raw: string | null): ItemOffline[] {
  if (!raw) return [];
  try {
    const data: unknown = JSON.parse(raw);
    return Array.isArray(data) ? data.filter(validItem) : [];
  } catch {
    return [];
  }
}

export function parseOpsi(raw: string | null): OpsiOffline | null {
  if (!raw) return null;
  try {
    const d: unknown = JSON.parse(raw);
    if (isObj(d) && Array.isArray(d.accounts) && Array.isArray(d.categories) && typeof d.savedAt === "string") {
      return d as OpsiOffline;
    }
  } catch {
    // abaikan data rusak
  }
  return null;
}

export function tambahItem(antrean: ItemOffline[], item: ItemOffline): ItemOffline[] {
  return antrean.some((i) => i.id === item.id) ? antrean : [...antrean, item];
}

// Terapkan hasil sinkron: yang terkirim dibuang, yang gagal ditandai alasannya.
export function terapkanHasil(antrean: ItemOffline[], hasil: { terkirim: string[]; gagal: { id: string; pesan: string }[] }) {
  const terkirim = new Set(hasil.terkirim);
  const gagal = new Map(hasil.gagal.map((g) => [g.id, g.pesan]));
  return antrean.filter((i) => !terkirim.has(i.id)).map((i) => (gagal.has(i.id) ? { ...i, error: gagal.get(i.id) } : i));
}
