import "server-only";

import { ACCOUNT_TYPES, isSpendable } from "@/lib/accounts/types";
import { lastMonths, monthRange, shiftMonth } from "@/lib/dates";
import { loadDebts } from "@/lib/debts/query";
import { investmentTotals, loadInvestments } from "@/lib/investments/query";
import { incomeStability, monthlyTrend, netWorth, totalBalance, type ReportRow } from "@/lib/money";
import { fetchAllPages } from "@/lib/supabase/paginate";
import type { createClient } from "@/lib/supabase/server";
import { loadAccountBalances } from "@/lib/transactions/balances";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export const BULAN_STABILITAS = 6;

// Net worth = (saldo akun aktif siap pakai + nilai investasi + sisa piutang) - sisa utang,
// ditambah stabilitas pendapatan dari 6 bulan penuh terakhir.
export async function loadNetWorth(supabase: Supabase, currentMonth: string) {
  // Bulan berjalan belum selesai, jadi tidak ikut dirata-rata.
  const months = lastMonths(shiftMonth(currentMonth, -1), BULAN_STABILITAS);
  const start = monthRange(months[0]!).start;
  const end = monthRange(currentMonth).start;

  const [accountsRes, debts, history, investasi] = await Promise.all([
    supabase.from("accounts").select("id, name, type, opening_balance, archived_at").order("created_at"),
    loadDebts(supabase),
    fetchAllPages<ReportRow & { debt_id: string | null }>((from, to) =>
      supabase
        .from("transactions")
        .select("type, amount, category_id, occurred_on, debt_id")
        .in("type", ["income", "expense"])
        .gte("occurred_on", start)
        .lt("occurred_on", end)
        .order("id")
        .range(from, to),
    ),
    loadInvestments(supabase),
  ]);
  const accounts = accountsRes.data ?? [];
  const balances = await loadAccountBalances(supabase, accounts);
  const error = accountsRes.error ?? debts.error ?? history.error ?? balances.error ?? investasi.error;
  if (error || !balances.balances) {
    console.error("[networth] muat gagal", { code: error?.code });
    return { error: error ?? { code: "balances" }, data: null };
  }
  const saldo = balances.balances;

  const aktif = accounts.filter((a) => !a.archived_at);
  // Akun investasi dihitung terpisah memakai nilai sekarang (bukan modal).
  const perJenis = ACCOUNT_TYPES.filter((t) => isSpendable(t.value)).map((t) => {
    const akun = aktif.filter((a) => a.type === t.value).map((a) => ({ id: a.id, name: a.name, balance: saldo.get(a.id) ?? 0 }));
    return { type: t.value, label: t.label, accounts: akun, total: totalBalance(akun.map((a) => a.balance)) };
  }).filter((g) => g.accounts.length > 0);

  const terbuka = debts.items.filter((d) => !d.archived && !d.status.settled);
  const utang = terbuka.filter((d) => d.kind === "utang");
  const piutang = terbuka.filter((d) => d.kind === "piutang");
  const totalAkun = totalBalance(perJenis.map((g) => g.total));
  const inv = investmentTotals(investasi.items);
  const nw = netWorth({
    accounts: totalBalance([totalAkun, inv.value]),
    receivables: totalBalance(piutang.map((d) => d.status.remaining)),
    payables: totalBalance(utang.map((d) => d.status.remaining)),
  });

  // Runway dana darurat hanya dari uang siap pakai (totalAkun, tanpa investasi).
  // Penerimaan piutang adalah pengembalian uang, bukan pendapatan: tidak ikut rata-rata pemasukan.
  const riwayat = history.rows.filter((r) => !(r.type === "income" && r.debt_id));
  const trend = monthlyTrend(riwayat, months);
  const stabilitas = incomeStability(trend, totalAkun);
  // Bulan yang benar-benar dihitung (bulan awal tanpa data diabaikan).
  const bulanDihitung = months.slice(months.length - (stabilitas?.months ?? 0));

  return {
    error: null,
    data: {
      ...nw,
      totalAkun,
      perJenis,
      investasi: { items: investasi.items.filter((i) => !i.archived), ...inv },
      utang,
      piutang,
      stabilitas,
      months: bulanDihitung,
    },
  };
}
