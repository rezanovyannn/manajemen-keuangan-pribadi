import "server-only";

import { computeBalances, type BalanceTransaction } from "@/lib/money";
import { fetchAllPages } from "@/lib/supabase/paginate";
import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export function loadAllBalanceRows(supabase: Supabase) {
  return fetchAllPages<BalanceTransaction>((from, to) =>
    supabase.from("transactions").select("account_id, type, amount").order("id").range(from, to),
  );
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
