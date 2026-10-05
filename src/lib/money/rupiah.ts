// Nominal uang selalu bilangan bulat dalam satuan Rupiah (tanpa desimal).
// Di database disimpan sebagai bigint; di TypeScript sebagai number bulat yang aman
// (|n| <= Number.MAX_SAFE_INTEGER, ±9 kuadriliun). Jangan pernah memakai float.

export function isValidAmount(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value);
}

export function assertAmount(value: number): number {
  if (!isValidAmount(value)) {
    throw new RangeError("Nominal harus bilangan bulat Rupiah tanpa desimal.");
  }
  return value;
}

// Contoh: 1250000 -> "Rp 1.250.000", -35000 -> "-Rp 35.000".
export function formatRupiah(amount: number): string {
  assertAmount(amount);
  const sign = amount < 0 ? "-" : "";
  const digits = String(Math.abs(amount)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${sign}Rp ${digits}`;
}

// Ubah teks input pengguna menjadi nominal. Mengembalikan null jika tidak valid.
// Diterima: "1250000", "1.250.000", "Rp 1.250.000", "-35.000".
// Ditolak: desimal ("1,5" / "1.5"), pemisah ribuan yang salah ("1.25.000"), teks kosong.
export function parseRupiah(input: string): number | null {
  const cleaned = input.trim().replace(/^(-?)\s*rp\.?\s*/i, "$1").replace(/\s+/g, "");
  if (!/^-?(\d{1,3}(\.\d{3})+|\d+)$/.test(cleaned)) return null;

  const value = Number(cleaned.replace(/\./g, ""));
  if (!isValidAmount(value)) return null;
  return value === 0 ? 0 : value; // hindari -0
}

// Label ringkas untuk sumbu grafik saja, contoh 1250000 -> "1,3 jt".
// Hanya untuk tampilan; jangan dipakai untuk perhitungan atau menampilkan nominal transaksi.
export function formatRupiahRingkas(amount: number): string {
  assertAmount(amount);
  return new Intl.NumberFormat("id-ID", { notation: "compact", maximumFractionDigits: 1 }).format(amount);
}
