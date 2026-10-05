import { addDays, isValidDateString } from "@/lib/dates";

export type Frequency = "weekly" | "monthly" | "yearly";

export const FREKUENSI: { value: Frequency; label: string }[] = [
  { value: "weekly", label: "Mingguan" },
  { value: "monthly", label: "Bulanan" },
  { value: "yearly", label: "Tahunan" },
];

export const FREQUENCY_VALUES = ["weekly", "monthly", "yearly"] as const satisfies readonly Frequency[];

export function frequencyLabel(f: Frequency) {
  return FREKUENSI.find((x) => x.value === f)?.label ?? f;
}

function parts(date: string) {
  return date.split("-").map(Number) as [number, number, number];
}

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function iso(year: number, month: number, day: number) {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// Kemunculan ke-n (n = 0 adalah tanggal mulai). Selalu dihitung dari tanggal mulai
// agar jadwal tanggal 31 kembali ke 31 setelah Februari (tidak "terseret" ke 28).
export function occurrenceAt(start: string, frequency: Frequency, n: number): string {
  if (!isValidDateString(start)) throw new RangeError("Tanggal mulai tidak valid.");
  if (!Number.isInteger(n) || n < 0) throw new RangeError("Urutan jadwal tidak valid.");
  if (frequency === "weekly") return addDays(start, n * 7);

  const [y, m, d] = parts(start);
  const totalBulan = y * 12 + (m - 1) + (frequency === "monthly" ? n : n * 12);
  const year = Math.floor(totalBulan / 12);
  const month = (totalBulan % 12) + 1;
  return iso(year, month, Math.min(d, daysInMonth(year, month)));
}

// Perkiraan urutan kemunculan di sekitar `date`, lalu dikoreksi maju/mundur.
function perkiraanUrutan(start: string, frequency: Frequency, date: string) {
  const [y1, m1, d1] = parts(start);
  const [y2, m2, d2] = parts(date);
  if (frequency === "weekly") {
    const hari = (Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000;
    return Math.max(0, Math.floor(hari / 7));
  }
  const bulan = (y2 - y1) * 12 + (m2 - m1);
  return Math.max(0, frequency === "monthly" ? bulan : Math.floor(bulan / 12));
}

// Kemunculan pertama yang >= `date` (atau tanggal mulai jika `date` lebih awal).
export function firstOccurrenceOnOrAfter(start: string, frequency: Frequency, date: string): string {
  if (date <= start) return start;
  let n = perkiraanUrutan(start, frequency, date);
  while (n > 0 && occurrenceAt(start, frequency, n - 1) >= date) n--;
  while (occurrenceAt(start, frequency, n) < date) n++;
  return occurrenceAt(start, frequency, n);
}

// Kemunculan berikutnya setelah `date` (dipakai setelah dicatat/dilewati).
export function nextOccurrenceAfter(start: string, frequency: Frequency, date: string): string {
  return firstOccurrenceOnOrAfter(start, frequency, addDays(date, 1));
}

export type RuleSchedule = {
  frequency: Frequency;
  start_date: string;
  end_date: string | null;
  next_due_date: string;
  paused: boolean;
};

// Jadwal sudah selesai jika jatuh tempo berikutnya melewati tanggal berakhir.
export function isFinished(rule: Pick<RuleSchedule, "end_date" | "next_due_date">) {
  return rule.end_date !== null && rule.next_due_date > rule.end_date;
}

// Hari menuju jatuh tempo: negatif = terlambat, 0 = hari ini.
export function daysUntil(due: string, today: string) {
  const [y1, m1, d1] = parts(today);
  const [y2, m2, d2] = parts(due);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000);
}

export const HARI_SARAN = 7;

// Saran pencatatan: aktif, belum selesai, dan jatuh tempo <= hari ini + 7 hari.
export function isSuggested(rule: RuleSchedule, today: string, windowDays = HARI_SARAN) {
  return !rule.paused && !isFinished(rule) && rule.next_due_date <= addDays(today, windowDays);
}

// "terlambat 3 hari" / "hari ini" / "besok" / "dalam 5 hari"
export function dueLabel(due: string, today: string) {
  const n = daysUntil(due, today);
  if (n < 0) return `terlambat ${-n} hari`;
  if (n === 0) return "jatuh tempo hari ini";
  if (n === 1) return "jatuh tempo besok";
  return `jatuh tempo dalam ${n} hari`;
}
