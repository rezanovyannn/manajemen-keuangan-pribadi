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

// Tambah/kurangi hari pada "YYYY-MM-DD".
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

// --- Periode dashboard ---

export type PeriodKey = "bulan-ini" | "bulan-lalu" | "kustom";

export type Period = {
  key: PeriodKey;
  start: string; // inklusif
  end: string; // eksklusif
  from: string; // inklusif, untuk tampilan/form
  to: string; // inklusif, untuk tampilan/form
  label: string;
  invalid?: boolean; // input kustom tidak valid -> jatuh ke bulan ini
};

export const BATAS_HARI_KUSTOM = 366;

function periodeBulan(key: "bulan-ini" | "bulan-lalu", month: string): Period {
  const { start, end } = monthRange(month);
  return { key, start, end, from: start, to: addDays(end, -1), label: formatBulan(month) };
}

export function resolvePeriod(
  params: { periode?: string; dari?: string; sampai?: string },
  today: string = todayInJakarta(),
): Period {
  const bulanIni = today.slice(0, 7);
  if (params.periode === "bulan-lalu") return periodeBulan("bulan-lalu", shiftMonth(bulanIni, -1));
  if (params.periode === "kustom") {
    const { dari = "", sampai = "" } = params;
    const valid =
      isValidDateString(dari) &&
      isValidDateString(sampai) &&
      dari <= sampai &&
      addDays(dari, BATAS_HARI_KUSTOM) > sampai;
    if (!valid) return { ...periodeBulan("bulan-ini", bulanIni), invalid: true };
    return {
      key: "kustom",
      start: dari,
      end: addDays(sampai, 1),
      from: dari,
      to: sampai,
      label: `${formatTanggal(dari)} – ${formatTanggal(sampai)}`,
    };
  }
  return periodeBulan("bulan-ini", bulanIni);
}

// Daftar n bulan berakhir di `lastMonth`, urut lama -> baru.
export function lastMonths(lastMonth: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => shiftMonth(lastMonth, i - (n - 1)));
}

// "2026-10" -> "Okt 26" (label sumbu grafik)
export function formatBulanPendek(month: string): string {
  const [y, m] = month.split("-").map(Number) as [number, number];
  const bulan = new Intl.DateTimeFormat("id-ID", { timeZone: "UTC", month: "short" }).format(new Date(Date.UTC(y, m - 1, 1)));
  return `${bulan} ${String(y).slice(2)}`;
}
