import "server-only";

import { accountTypeLabel } from "@/lib/accounts/types";
import { categoryOptions } from "@/lib/categories/options";
import type { Period } from "@/lib/dates";
import {
  cashflowByAccount,
  expenseBreakdown,
  summarizeIncomeExpense,
  totalBalance,
  type AccountCashflow,
  type TransactionType,
} from "@/lib/money";
import { fetchAllPages } from "@/lib/supabase/paginate";
import type { createClient } from "@/lib/supabase/server";
import { loadAccountBalances } from "@/lib/transactions/balances";

type Supabase = Awaited<ReturnType<typeof createClient>>;

type PeriodRow = {
  account_id: string;
  type: TransactionType;
  amount: number;
  category_id: string | null;
  occurred_on: string;
};

export type AccountCashflowItem = AccountCashflow & { id: string; name: string; typeLabel: string; archived: boolean };

export async function loadDashboard(supabase: Supabase, period: Period) {
  const [periodRows, categoriesRes, accountsRes] = await Promise.all([
    fetchAllPages<PeriodRow>((from, to) =>
      supabase
        .from("transactions")
        .select("account_id, type, amount, category_id, occurred_on")
        .gte("occurred_on", period.start)
        .lt("occurred_on", period.end)
        .order("id")
        .range(from, to),
    ),
    supabase.from("categories").select("id, parent_id, name, type, archived_at"),
    supabase.from("accounts").select("id, name, type, opening_balance, archived_at").order("created_at"),
  ]);
  const accounts = accountsRes.data ?? [];
  const balances = await loadAccountBalances(supabase, accounts);

  const error = periodRows.error ?? categoriesRes.error ?? accountsRes.error ?? balances.error;
  if (error) console.error("[dashboard] muat gagal", { code: error.code });

  const rows = periodRows.rows;
  const categories = categoriesRes.data ?? [];
  const labels = new Map(categoryOptions(categories).map((c) => [c.value, c.label]));
  const breakdown = expenseBreakdown(rows, categories);

  // Arus kas per akun: hanya akun yang punya transaksi di periode ini,
  // perubahan saldo terbesar (naik atau turun) di atas.
  const cashflow = cashflowByAccount(rows);
  const perAkun: AccountCashflowItem[] = accounts
    .flatMap((a) => {
      const cf = cashflow.get(a.id);
      return cf ? [{ id: a.id, name: a.name, typeLabel: accountTypeLabel(a.type), archived: Boolean(a.archived_at), ...cf }] : [];
    })
    .sort((x, y) => Math.abs(y.net) - Math.abs(x.net));

  return {
    error,
    // Transfer (transfer_in/out) tidak dihitung sebagai pemasukan/pengeluaran.
    summary: summarizeIncomeExpense(rows),
    breakdown: {
      total: breakdown.total,
      items: breakdown.items.map((i) => ({
        ...i,
        label: i.categoryId ? (labels.get(i.categoryId) ?? "(kategori tidak ditemukan)") : "Kategori lain",
      })),
    },
    perAkun,
    // Total saldo semua akun aktif (null jika gagal dihitung, bukan angka yang salah).
    totalSaldo: balances.balances
      ? totalBalance(accounts.filter((a) => !a.archived_at).map((a) => balances.balances.get(a.id) ?? 0))
      : null,
  };
}
