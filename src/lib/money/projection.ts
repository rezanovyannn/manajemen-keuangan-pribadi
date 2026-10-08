import { addDays } from "@/lib/dates";
import { daysUntil, nextOccurrenceAfter, type Frequency } from "@/lib/recurring/schedule";

import { addAmounts } from "./balance";
import { goalSplit } from "./planning";
import { assertAmount } from "./rupiah";

// Proyeksi arus kas dan "aman dibelanjakan". Hanya memakai data pasti:
// saldo akun saat ini, jadwal berulang, dan sisa budget bulan berjalan.

export type ProjectionRule = {
  id: string;
  name: string;
  type: "income" | "expense";
  amount: number;
  account_id: string;
  category_id: string;
  frequency: Frequency;
  start_date: string;
  end_date: string | null;
  next_due_date: string;
  paused: boolean;
};

export type Occurrence = {
  ruleId: string;
  name: string;
  type: "income" | "expense";
  amount: number;
  accountId: string;
  categoryId: string;
  dueDate: string; // tanggal jatuh tempo asli
  date: string; // tanggal dihitung di proyeksi (jadwal terlambat = hari ini)
  overdue: boolean;
};

// Batas kemunculan per jadwal agar jadwal mingguan yang lama terlambat tidak membuat daftar tak terbatas.
const MAKS_PER_JADWAL = 60;

// Semua kemunculan jadwal aktif yang belum dicatat sampai `until` (inklusif).
// Jadwal yang terlambat (belum dicatat) tetap dihitung, ditaruh di hari ini.
export function upcomingOccurrences(rules: ProjectionRule[], today: string, until: string): Occurrence[] {
  const hasil: Occurrence[] = [];
  for (const r of rules) {
    if (r.paused) continue;
    let due = r.next_due_date;
    for (let i = 0; i < MAKS_PER_JADWAL && due <= until && (r.end_date === null || due <= r.end_date); i++) {
      const overdue = due < today;
      hasil.push({
        ruleId: r.id,
        name: r.name,
        type: r.type,
        amount: assertAmount(r.amount),
        accountId: r.account_id,
        categoryId: r.category_id,
        dueDate: due,
        date: overdue ? today : due,
        overdue,
      });
      due = nextOccurrenceAfter(r.start_date, r.frequency, due);
    }
  }
  return hasil.sort((a, b) => a.date.localeCompare(b.date) || a.dueDate.localeCompare(b.dueDate) || a.name.localeCompare(b.name, "id"));
}

const tanda = (o: Pick<Occurrence, "type" | "amount">) => (o.type === "income" ? o.amount : -o.amount);

export type ProjectionPoint = { date: string; balance: number; items: Occurrence[] };

export type AccountShortfall = { accountId: string; date: string; balance: number };

export type CashflowProjection = {
  start: number;
  end: number;
  income: number;
  expense: number;
  // Satu titik per hari dari hari ini sampai `until`.
  points: ProjectionPoint[];
  lowest: { date: string; balance: number };
  // Akun yang saldonya diperkirakan minus (tanggal pertama kali minus).
  shortfalls: AccountShortfall[];
};

export function projectCashflow(input: {
  accounts: { id: string; balance: number }[];
  occurrences: Occurrence[];
  today: string;
  until: string;
}): CashflowProjection {
  const { accounts, today, until } = input;
  if (until < today) throw new RangeError("Akhir proyeksi tidak boleh sebelum hari ini.");
  const aktif = new Set(accounts.map((a) => a.id));
  // Jadwal di akun yang tidak aktif (diarsipkan/dihapus) tidak memengaruhi saldo aktif.
  const occ = input.occurrences.filter((o) => aktif.has(o.accountId) && o.date <= until);

  const start = accounts.reduce((s, a) => addAmounts(s, a.balance), 0);
  const perTanggal = new Map<string, Occurrence[]>();
  for (const o of occ) perTanggal.set(o.date, [...(perTanggal.get(o.date) ?? []), o]);

  const points: ProjectionPoint[] = [];
  let saldo = start;
  let lowest = { date: today, balance: start };
  for (let d = today; d <= until; d = addDays(d, 1)) {
    const items = perTanggal.get(d) ?? [];
    saldo = items.reduce((s, o) => addAmounts(s, tanda(o)), saldo);
    points.push({ date: d, balance: saldo, items });
    if (saldo < lowest.balance) lowest = { date: d, balance: saldo };
  }

  const saldoAkun = new Map(accounts.map((a) => [a.id, a.balance]));
  const shortfalls: AccountShortfall[] = accounts
    .filter((a) => a.balance < 0)
    .map((a) => ({ accountId: a.id, date: today, balance: a.balance }));
  const sudahMinus = new Set(shortfalls.map((s) => s.accountId));
  for (const o of occ) {
    const baru = addAmounts(saldoAkun.get(o.accountId) ?? 0, tanda(o));
    saldoAkun.set(o.accountId, baru);
    if (baru < 0 && !sudahMinus.has(o.accountId)) {
      sudahMinus.add(o.accountId);
      shortfalls.push({ accountId: o.accountId, date: o.date, balance: baru });
    }
  }

  const jumlah = (type: Occurrence["type"]) => occ.filter((o) => o.type === type).reduce((s, o) => addAmounts(s, o.amount), 0);
  return { start, end: saldo, income: jumlah("income"), expense: jumlah("expense"), points, lowest, shortfalls };
}

export type SafeToSpend = {
  balance: number;
  goalSavings: number; // saldo yang disisihkan untuk tujuan tabungan (tidak boleh dipakai belanja)
  bills: number; // tagihan terjadwal sampai akhir bulan
  budgetReserve: number; // sisa budget yang belum terpakai (di luar tagihan terjadwal)
  safe: number; // bisa minus = kekurangan
  days: number; // sisa hari termasuk hari ini
  perDay: number; // 0 jika safe <= 0
};

// aman dibelanjakan = saldo - tabungan tujuan - tagihan terjadwal - sisa budget yang belum terpakai.
// - Saldo akun yang terhubung ke tujuan tabungan aktif dianggap tabungan SAMPAI TARGET-nya
//   (lihat goalSplit); kelebihan di atas target bebas dipakai. Semua tagihan terjadwal tetap
//   dikurangkan, termasuk dari akun tabungan (konservatif).
// - Pemasukan terjadwal sengaja TIDAK dihitung (konservatif: gaji bisa terlambat).
// - Tagihan terjadwal yang kategorinya punya budget mengurangi cadangan budget itu,
//   agar tidak terhitung dua kali.
export function safeToSpend(input: {
  balance: number;
  goalAccounts: { accountId: string; balance: number; target: number }[];
  occurrences: Occurrence[];
  budgets: { categoryIds: string[]; remaining: number }[];
  today: string;
  monthEnd: string;
}): SafeToSpend {
  const { balance, today, monthEnd } = input;
  if (monthEnd < today) throw new RangeError("Akhir bulan tidak boleh sebelum hari ini.");
  const goalSavings = input.goalAccounts.reduce((s, g) => addAmounts(s, goalSplit(g.balance, g.target).saved), 0);
  const tagihan = input.occurrences.filter((o) => o.type === "expense" && o.date <= monthEnd);
  const bills = tagihan.reduce((s, o) => addAmounts(s, o.amount), 0);

  const budgetReserve = input.budgets.reduce((s, b) => {
    if (b.remaining <= 0) return s;
    const ids = new Set(b.categoryIds);
    const terjadwal = tagihan.filter((o) => ids.has(o.categoryId)).reduce((t, o) => addAmounts(t, o.amount), 0);
    return addAmounts(s, Math.max(0, addAmounts(b.remaining, -terjadwal)));
  }, 0);

  const safe = [goalSavings, bills, budgetReserve].reduce((s, x) => addAmounts(s, -x), assertAmount(balance));
  const days = daysUntil(monthEnd, today) + 1;
  const perDay = safe > 0 ? Number(BigInt(safe) / BigInt(days)) : 0;
  return { balance, goalSavings, bills, budgetReserve, safe, days, perDay };
}
