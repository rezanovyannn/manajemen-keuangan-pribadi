import { assertAmount } from "./rupiah";

export type TransactionType = "income" | "expense" | "transfer_out" | "transfer_in";

export type BalanceTransaction = {
  account_id: string;
  type: TransactionType;
  amount: number;
};

// Pengaruh satu transaksi terhadap saldo akunnya. Nominal di database selalu positif.
export function signedAmount(type: TransactionType, amount: number): number {
  assertAmount(amount);
  if (amount <= 0) throw new RangeError("Nominal transaksi harus lebih dari 0.");
  return type === "income" || type === "transfer_in" ? amount : -amount;
}

// Penjumlahan yang menolak hasil di luar batas aman integer (tidak diam-diam membulatkan).
export function addAmounts(a: number, b: number): number {
  return assertAmount(assertAmount(a) + assertAmount(b));
}

// saldo = saldo awal + pemasukan + transfer masuk - pengeluaran - transfer keluar
export function computeBalance(openingBalance: number, transactions: BalanceTransaction[]): number {
  return transactions.reduce((sum, t) => addAmounts(sum, signedAmount(t.type, t.amount)), assertAmount(openingBalance));
}

// Hitung saldo semua akun sekaligus. Transaksi untuk akun yang tidak ada di daftar diabaikan.
export function computeBalances(
  accounts: { id: string; opening_balance: number }[],
  transactions: BalanceTransaction[],
): Map<string, number> {
  const balances = new Map(accounts.map((a) => [a.id, assertAmount(a.opening_balance)]));
  for (const t of transactions) {
    const current = balances.get(t.account_id);
    if (current === undefined) continue;
    balances.set(t.account_id, addAmounts(current, signedAmount(t.type, t.amount)));
  }
  return balances;
}

// Total saldo beberapa akun (misal semua akun aktif).
export function totalBalance(balances: Iterable<number>): number {
  let total = 0;
  for (const b of balances) total = addAmounts(total, b);
  return total;
}
