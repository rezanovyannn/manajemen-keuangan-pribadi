import { addDays, shiftMonth } from "@/lib/dates";

import { addAmounts } from "./balance";

// Insight tanpa AI: semua aturan di sini sederhana, bisa dijelaskan, dan memakai integer.

export const INSIGHT = {
  // Perubahan pengeluaran per kategori
  bulanPembanding: 3,
  persenBerubah: 40,
  minSelisih: 50_000, // abaikan perubahan kecil (misal Rp 10.000 → Rp 20.000 = +100%)
  // Pengeluaran tidak biasa
  kaliMedian: 3,
  minTidakBiasa: 100_000,
  minSampel: 3,
  // Langganan tersembunyi
  minBulanBerturut: 3,
  maksTampil: 5,
} as const;

export type InsightRow = {
  id: string;
  account_id: string;
  category_id: string | null;
  amount: number;
  occurred_on: string; // YYYY-MM-DD
  note: string | null;
  recurring_rule_id: string | null;
  debt_id: string | null;
  fee_for_id: string | null;
};

const bulanDari = (date: string) => date.slice(0, 7);
const hariDari = (date: string) => Number(date.slice(8, 10));

function hariDalamBulan(month: string) {
  const [y, m] = month.split("-").map(Number) as [number, number];
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

// Persen perubahan dibulatkan menuju nol, dihitung dengan BigInt (tanpa float).
export function percentChange(current: number, base: number): number {
  if (base <= 0) throw new RangeError("Pembanding harus lebih dari 0.");
  return Number(((BigInt(current) - BigInt(base)) * BigInt(100)) / BigInt(base));
}

// ---------------------------------------------------------------------------
// 1. Perubahan pengeluaran per kategori (kategori utama)
// Bulan berjalan s.d. hari ini dibandingkan rata-rata periode yang SAMA (tanggal 1 s.d.
// tanggal yang sama) di bulan-bulan sebelumnya, agar awal bulan tidak selalu "turun".
// Bulan sebelum pengguna mulai mencatat tidak ikut dihitung.
// ---------------------------------------------------------------------------

export type CategoryChange = {
  categoryId: string;
  current: number;
  average: number;
  percent: number; // bisa negatif
  baselineMonths: number;
};

export function categoryChanges(input: {
  rows: Pick<InsightRow, "category_id" | "amount" | "occurred_on">[];
  categories: { id: string; parent_id: string | null }[];
  today: string;
  firstDate: string | null; // transaksi pertama pengguna (jenis apa pun)
}): CategoryChange[] {
  const { rows, categories, today, firstDate } = input;
  if (!firstDate) return [];
  const bulanIni = bulanDari(today);
  const hari = hariDari(today);
  const pembanding = Array.from({ length: INSIGHT.bulanPembanding }, (_, i) => shiftMonth(bulanIni, -(i + 1))).filter(
    (m) => m >= bulanDari(firstDate),
  );
  if (pembanding.length === 0) return [];

  const induk = new Map(categories.map((c) => [c.id, c.parent_id]));
  const kini = new Map<string, number>();
  const lalu = new Map<string, number>();
  for (const r of rows) {
    if (!r.category_id) continue;
    const root = induk.get(r.category_id) ?? r.category_id;
    const m = bulanDari(r.occurred_on);
    if (m === bulanIni && r.occurred_on <= today) {
      kini.set(root, addAmounts(kini.get(root) ?? 0, r.amount));
    } else if (pembanding.includes(m) && hariDari(r.occurred_on) <= Math.min(hari, hariDalamBulan(m))) {
      lalu.set(root, addAmounts(lalu.get(root) ?? 0, r.amount));
    }
  }

  const n = BigInt(pembanding.length);
  const hasil: CategoryChange[] = [];
  for (const id of new Set([...kini.keys(), ...lalu.keys()])) {
    const current = kini.get(id) ?? 0;
    const average = Number(BigInt(lalu.get(id) ?? 0) / n);
    if (average <= 0) continue; // tidak ada pembanding: bukan "naik", hanya kategori baru
    const selisih = Math.abs(addAmounts(current, -average));
    const percent = percentChange(current, average);
    if (selisih < INSIGHT.minSelisih || Math.abs(percent) < INSIGHT.persenBerubah) continue;
    hasil.push({ categoryId: id, current, average, percent, baselineMonths: pembanding.length });
  }
  return hasil
    .sort((a, b) => Math.abs(b.current - b.average) - Math.abs(a.current - a.average))
    .slice(0, INSIGHT.maksTampil);
}

// ---------------------------------------------------------------------------
// 2. Pengeluaran tidak biasa
// Transaksi bulan ini > 3× nilai tengah (median) kategori yang sama dalam 3 bulan
// sebelumnya, minimal Rp 100.000, dan kategori itu punya >= 3 transaksi pembanding.
// ---------------------------------------------------------------------------

// Median bilangan bulat; jumlah genap → rata-rata dua nilai tengah dibulatkan ke bawah.
export function medianAmount(values: number[]): number {
  if (values.length === 0) throw new RangeError("Data kosong.");
  const s = [...values].sort((a, b) => a - b);
  const t = Math.floor(s.length / 2);
  if (s.length % 2 === 1) return s[t]!;
  return Number((BigInt(s[t - 1]!) + BigInt(s[t]!)) / BigInt(2));
}

export type UnusualExpense = { id: string; categoryId: string; amount: number; median: number; times: number; occurredOn: string; note: string | null };

export function unusualExpenses(input: { rows: InsightRow[]; today: string }): UnusualExpense[] {
  const { rows, today } = input;
  const bulanIni = bulanDari(today);
  const awalPembanding = `${shiftMonth(bulanIni, -INSIGHT.bulanPembanding)}-01`;
  const riwayat = new Map<string, number[]>();
  for (const r of rows) {
    if (!r.category_id || r.fee_for_id) continue;
    if (r.occurred_on >= awalPembanding && bulanDari(r.occurred_on) < bulanIni) {
      riwayat.set(r.category_id, [...(riwayat.get(r.category_id) ?? []), r.amount]);
    }
  }

  const hasil: UnusualExpense[] = [];
  for (const r of rows) {
    if (!r.category_id || r.fee_for_id || bulanDari(r.occurred_on) !== bulanIni || r.occurred_on > today) continue;
    if (r.amount < INSIGHT.minTidakBiasa) continue;
    const sampel = riwayat.get(r.category_id) ?? [];
    if (sampel.length < INSIGHT.minSampel) continue;
    const median = medianAmount(sampel);
    if (median <= 0 || BigInt(r.amount) <= BigInt(median) * BigInt(INSIGHT.kaliMedian)) continue;
    hasil.push({
      id: r.id,
      categoryId: r.category_id,
      amount: r.amount,
      median,
      times: Number(BigInt(r.amount) / BigInt(median)),
      occurredOn: r.occurred_on,
      note: r.note,
    });
  }
  return hasil.sort((a, b) => b.amount - a.amount).slice(0, INSIGHT.maksTampil);
}

// ---------------------------------------------------------------------------
// 3. Langganan tersembunyi
// Pengeluaran dengan catatan + nominal yang sama, muncul >= 3 bulan berturut-turut
// (berakhir bulan ini atau bulan lalu), tetapi belum dibuat sebagai jadwal berulang.
// Cicilan utang, biaya admin, dan transaksi dari jadwal diabaikan.
// ---------------------------------------------------------------------------

export const normalizeNote = (s: string | null) => (s ?? "").trim().replace(/\s+/g, " ").toLowerCase();

export type SubscriptionCandidate = {
  latestId: string; // transaksi terakhir (dipakai untuk mengisi form jadwal)
  note: string;
  amount: number;
  categoryId: string;
  accountId: string;
  months: number; // jumlah bulan berturut-turut
  lastDate: string;
  nextDate: string; // perkiraan jatuh tempo berikutnya (tanggal yang sama bulan depan)
};

export function subscriptionCandidates(input: {
  rows: InsightRow[];
  rules: { name: string; note: string | null; amount: number }[];
  today: string;
}): SubscriptionCandidate[] {
  const { rows, rules, today } = input;
  const bulanIni = bulanDari(today);
  const sudahDijadwalkan = new Set(rules.flatMap((r) => [normalizeNote(r.name), normalizeNote(r.note)].filter(Boolean).map((k) => `${k}|${r.amount}`)));

  const grup = new Map<string, InsightRow[]>();
  for (const r of rows) {
    if (!r.category_id || r.recurring_rule_id || r.debt_id || r.fee_for_id || r.occurred_on > today) continue;
    const kunci = normalizeNote(r.note);
    if (!kunci) continue;
    const k = `${kunci}|${r.amount}`;
    grup.set(k, [...(grup.get(k) ?? []), r]);
  }

  const hasil: SubscriptionCandidate[] = [];
  for (const [k, items] of grup) {
    if (sudahDijadwalkan.has(k)) continue;
    const bulan = new Set(items.map((i) => bulanDari(i.occurred_on)));
    const terakhir = [...bulan].sort().at(-1)!;
    if (terakhir !== bulanIni && terakhir !== shiftMonth(bulanIni, -1)) continue;
    let berturut = 0;
    for (let m = terakhir; bulan.has(m); m = shiftMonth(m, -1)) berturut++;
    if (berturut < INSIGHT.minBulanBerturut) continue;

    const last = [...items].sort((a, b) => a.occurred_on.localeCompare(b.occurred_on) || a.id.localeCompare(b.id)).at(-1)!;
    hasil.push({
      latestId: last.id,
      note: last.note!.trim(),
      amount: last.amount,
      categoryId: last.category_id!,
      accountId: last.account_id,
      months: berturut,
      lastDate: last.occurred_on,
      nextDate: nextMonthlyDate(last.occurred_on),
    });
  }
  return hasil.sort((a, b) => b.amount - a.amount).slice(0, INSIGHT.maksTampil);
}

// Tanggal yang sama bulan depan (31 → akhir bulan jika bulan depan lebih pendek).
export function nextMonthlyDate(date: string): string {
  const bulan = shiftMonth(bulanDari(date), 1);
  const hari = Math.min(hariDari(date), hariDalamBulan(bulan));
  return addDays(`${bulan}-01`, hari - 1);
}
