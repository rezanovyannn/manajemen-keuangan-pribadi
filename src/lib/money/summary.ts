import { addAmounts, type TransactionType } from "./balance";

// "transfer" = item daftar yang menggabungkan dua baris transfer.
export type SummaryRow = { type: TransactionType | "transfer"; amount: number };

// Ringkasan periode: transfer antar akun sendiri tidak dihitung sebagai pemasukan/pengeluaran.
export function summarizeIncomeExpense(rows: SummaryRow[]) {
  let income = 0;
  let expense = 0;
  for (const r of rows) {
    if (r.type === "income") income = addAmounts(income, r.amount);
    else if (r.type === "expense") expense = addAmounts(expense, r.amount);
  }
  return { income, expense, net: addAmounts(income, -expense) };
}
