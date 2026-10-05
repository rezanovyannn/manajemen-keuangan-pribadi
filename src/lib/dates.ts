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

// --- Bulan ("YYYY-MM") untuk navigasi daftar transaksi ---

export function isValidMonthString(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export function currentMonthInJakarta(now: Date = new Date()): string {
  return todayInJakarta(now).slice(0, 7);
}

// Geser bulan: shiftMonth("2026-01", -1) -> "2025-12".
export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number) as [number, number];
  const total = y * 12 + (m - 1) + delta;
  const year = Math.floor(total / 12);
  const mon = (total % 12) + 1;
  return `${String(year).padStart(4, "0")}-${String(mon).padStart(2, "0")}`;
}

// Rentang tanggal setengah terbuka: start <= tanggal < end.
export function monthRange(month: string): { start: string; end: string } {
  return { start: `${month}-01`, end: `${shiftMonth(month, 1)}-01` };
}

// "2026-10" -> "Oktober 2026"
export function formatBulan(month: string): string {
  const [y, m] = month.split("-").map(Number) as [number, number];
  return new Intl.DateTimeFormat("id-ID", { timeZone: "UTC", month: "long", year: "numeric" }).format(
    new Date(Date.UTC(y, m - 1, 1)),
  );
}
