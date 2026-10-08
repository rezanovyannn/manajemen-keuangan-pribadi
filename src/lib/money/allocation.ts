import { addAmounts } from "./balance";
import { assertAmount, formatRupiah } from "./rupiah";

// Tabungan disisihkan manual (tabel goal_allocations).
// - Tabungan tujuan     = jumlah semua setoran tujuan itu (sisihkan +, ambil −).
// - Disisihkan di akun  = jumlah setoran dari akun itu untuk tujuan aktif.
// - Bebas dipakai       = saldo akun − yang disisihkan di akun itu (bisa minus jika
//                         saldo turun di bawah tabungan, misalnya terpakai belanja).
// Tidak ada uang yang berpindah; saldo akun tetap dihitung dari transaksi.

export type AllocationRow = { goal_id: string; account_id: string; amount: number };

const kunci = (goalId: string, accountId: string) => `${goalId}|${accountId}`;

export function allocationTotals(rows: AllocationRow[]) {
  const byGoal = new Map<string, number>();
  const byAccount = new Map<string, number>();
  const byGoalAccount = new Map<string, number>();
  for (const r of rows) {
    assertAmount(r.amount);
    byGoal.set(r.goal_id, addAmounts(byGoal.get(r.goal_id) ?? 0, r.amount));
    byAccount.set(r.account_id, addAmounts(byAccount.get(r.account_id) ?? 0, r.amount));
    const k = kunci(r.goal_id, r.account_id);
    byGoalAccount.set(k, addAmounts(byGoalAccount.get(k) ?? 0, r.amount));
  }
  return {
    byGoal,
    byAccount,
    goalAccount: (goalId: string, accountId: string) => byGoalAccount.get(kunci(goalId, accountId)) ?? 0,
  };
}

export type AccountSplit = {
  allocated: number; // total disisihkan dari akun ini
  free: number; // bebas dipakai (bisa minus)
  shortfall: number; // bagian tabungan yang tidak lagi tertutup saldo (>= 0)
};

export function accountSplit(balance: number, allocated: number): AccountSplit {
  assertAmount(balance);
  assertAmount(allocated);
  const free = addAmounts(balance, -allocated);
  return { allocated, free, shortfall: free < 0 && allocated > 0 ? Math.min(allocated, -free) : 0 };
}

// Tabungan yang benar-benar masih ada di akun: yang disisihkan, dibatasi saldo akun.
// Dipakai untuk "aman dibelanjakan" agar tidak mengurangi uang yang sudah tidak ada.
export function coveredSavings(balance: number, allocated: number): number {
  assertAmount(balance);
  assertAmount(allocated);
  return Math.max(0, Math.min(allocated, balance));
}

export type AllocationKind = "sisihkan" | "ambil";

// Nominal maksimum yang boleh disisihkan/diambil.
// - Sisihkan: sebesar saldo bebas di akun itu.
// - Ambil   : sebesar tabungan tujuan ini yang berasal dari akun itu.
export function allocationLimit(input: {
  kind: AllocationKind;
  balance: number;
  accountAllocated: number;
  goalAccountAllocated: number;
}): number {
  const { kind, balance, accountAllocated, goalAccountAllocated } = input;
  if (kind === "sisihkan") return Math.max(0, addAmounts(balance, -accountAllocated));
  return Math.max(0, assertAmount(goalAccountAllocated));
}

// Pesan galat untuk pengguna, atau null jika boleh.
export function checkAllocation(
  amount: number,
  input: Parameters<typeof allocationLimit>[0],
): string | null {
  assertAmount(amount);
  if (amount <= 0) return "Nominal harus lebih dari 0.";
  const batas = allocationLimit(input);
  if (amount <= batas) return null;
  if (input.kind === "sisihkan") {
    return batas === 0
      ? "Tidak ada saldo bebas di akun ini untuk disisihkan."
      : `Melebihi saldo bebas di akun ini (maks. ${formatRupiah(batas)}).`;
  }
  return batas === 0
    ? "Belum ada tabungan tujuan ini dari akun tersebut."
    : `Melebihi tabungan dari akun ini (maks. ${formatRupiah(batas)}).`;
}

// Menghapus satu baris riwayat tidak boleh membuat tabungan tujuan dari akun itu minus
// (misalnya menghapus setoran yang sebagian sudah diambil).
export function canRemoveAllocation(goalAccountAllocated: number, rowAmount: number): boolean {
  return addAmounts(goalAccountAllocated, -rowAmount) >= 0;
}
