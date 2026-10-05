// Tanggal transaksi disimpan sebagai "YYYY-MM-DD" (tanpa jam), mengikuti zona waktu WIB.

export const ZONA_WAKTU = "Asia/Jakarta";

export function todayInJakarta(now: Date = new Date()): string {
  // en-CA menghasilkan format YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA_WAKTU }).format(now);
}

// Validasi tanggal kalender sungguhan (menolak 2026-02-30).
export function isValidDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number) as [number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

// "2026-10-05" -> "Senin, 5 Oktober 2026"
export function formatTanggal(value: string, options: { weekday?: boolean } = {}): string {
  const [y, m, d] = value.split("-").map(Number) as [number, number, number];
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
    year: "numeric",
    ...(options.weekday ? { weekday: "long" } : {}),
  }).format(new Date(Date.UTC(y, m - 1, d)));
}
