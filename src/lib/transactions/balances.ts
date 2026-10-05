import "server-only";

import { computeBalances, type BalanceTransaction } from "@/lib/money";
import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

// Supabase membatasi jumlah baris per permintaan (default 1.000).
// Ambil per halaman sampai habis agar saldo tidak diam-diam terpotong.
const UKURAN_HALAMAN = 1000;

export async function loadAllBalanceRows(supabase: Supabase) {
  const rows: BalanceTransaction[] = [];
  for (let from = 0; ; from += UKURAN_HALAMAN) {
    const { data, error } = await supabase
      .from("transactions")
      .select("account_id, type, amount")
      .order("id")
      .range(from, from + UKURAN_HALAMAN - 1);
    if (error) return { rows: [], error };
    rows.push(...data);
    if (data.length < UKURAN_HALAMAN) return { rows, error: null };
  }
}

// Saldo terkini semua akun: saldo awal + seluruh riwayat transaksi.
export async function loadAccountBalances(
  supabase: Supabase,
  accounts: { id: string; opening_balance: number }[],
) {
  const { rows, error } = await loadAllBalanceRows(supabase);
  if (error) {
    console.error("[accounts] muat saldo gagal", { code: error.code });
    return { balances: null, error };
  }
  return { balances: computeBalances(accounts, rows), error: null };
}
