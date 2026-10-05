import { addAmounts, type TransactionType } from "./balance";
import { BUDGET_WARNING_PERCENT } from "./budget";

export type CashflowRow = { account_id: string; type: TransactionType; amount: number };

export type AccountCashflow = {
  income: number;
  expense: number;
  transferIn: number;
  transferOut: number;
  transferNet: number; // transfer masuk - transfer keluar
  net: number; // perubahan saldo akun selama periode
};

const kosong = (): AccountCashflow => ({ income: 0, expense: 0, transferIn: 0, transferOut: 0, transferNet: 0, net: 0 });

// Arus kas per akun dalam satu periode. Transfer dipisah dari pemasukan/pengeluaran,
// tapi ikut dihitung di `net` karena memang mengubah saldo akun.
export function cashflowByAccount(rows: CashflowRow[]): Map<string, AccountCashflow> {
  const result = new Map<string, AccountCashflow>();
  for (const r of rows) {
    const cf = result.get(r.account_id) ?? kosong();
    if (r.type === "income") cf.income = addAmounts(cf.income, r.amount);
    else if (r.type === "expense") cf.expense = addAmounts(cf.expense, r.amount);
    else if (r.type === "transfer_in") cf.transferIn = addAmounts(cf.transferIn, r.amount);
    else cf.transferOut = addAmounts(cf.transferOut, r.amount);
    cf.transferNet = addAmounts(cf.transferIn, -cf.transferOut);
    cf.net = addAmounts(addAmounts(cf.income, cf.transferIn), -addAmounts(cf.expense, cf.transferOut));
    result.set(r.account_id, cf);
  }
  return result;
}

export type TimelineRow = { id: string; amount: number };

// Penanda di transaksi yang membuat budget melewati ambang.
export type BudgetMarker = "hampir" | "terlampaui" | null;

export type BudgetTimelineItem<T extends TimelineRow> = T & { cumulative: number; marker: BudgetMarker };

// Riwayat pemakaian budget: total berjalan per transaksi (urut tanggal) dan
// transaksi mana yang pertama kali membuat budget hampir habis / terlampaui.
export function budgetTimeline<T extends TimelineRow>(limit: number, rows: T[]) {
  let cumulative = 0;
  let warnId: string | null = null;
  let overId: string | null = null;
  const L = BigInt(limit);
  const items: BudgetTimelineItem<T>[] = rows.map((r) => {
    cumulative = addAmounts(cumulative, r.amount);
    const S = BigInt(cumulative);
    let marker: BudgetMarker = null;
    if (!overId && S > L) {
      overId = r.id;
      marker = "terlampaui";
      // Jika satu transaksi langsung melompati 80% dan 100%, cukup tandai "terlampaui".
      if (!warnId) warnId = r.id;
    } else if (!warnId && S * BigInt(100) >= L * BigInt(BUDGET_WARNING_PERCENT)) {
      warnId = r.id;
      marker = "hampir";
    }
    return { ...r, cumulative, marker };
  });
  return { items, warnId, overId };
}
