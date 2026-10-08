import "server-only";

import { addAmounts, balanceAsOf, investmentStatus, totalBalance, type DatedTransaction, type InvestmentStatus } from "@/lib/money";
import type { InvestmentKind } from "@/lib/supabase/database.types";
import { fetchAllPages } from "@/lib/supabase/paginate";
import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type InvestmentItem = InvestmentStatus & {
  id: string;
  name: string;
  kind: InvestmentKind | null;
  archived: boolean;
  units: string | null; // dari penilaian terakhir
  lastValuedOn: string | null;
};

type Valuation = { id: string; account_id: string; valued_on: string; market_value: number; units: number | string | null; note: string | null; created_at: string };

// Semua akun investasi (aktif & diarsipkan) beserta modal, nilai sekarang, dan untung/rugi.
export async function loadInvestments(supabase: Supabase) {
  const { data: akun, error: akunError } = await supabase
    .from("accounts")
    .select("id, name, investment_kind, opening_balance, archived_at")
    .eq("type", "investment")
    .order("created_at");
  if (akunError) {
    console.error("[investasi] muat akun gagal", { code: akunError.code });
    return { items: [] as InvestmentItem[], error: akunError };
  }
  const accounts = akun ?? [];
  if (accounts.length === 0) return { items: [] as InvestmentItem[], error: null };
  const ids = accounts.map((a) => a.id);

  const [tx, nilai] = await Promise.all([
    fetchAllPages<DatedTransaction>((from, to) =>
      supabase.from("transactions").select("account_id, type, amount, occurred_on").in("account_id", ids).order("id").range(from, to),
    ),
    fetchAllPages<Valuation>((from, to) =>
      supabase
        .from("investment_valuations")
        .select("id, account_id, valued_on, market_value, units, note, created_at")
        .in("account_id", ids)
        .order("valued_on", { ascending: false })
        .order("created_at", { ascending: false })
        .range(from, to),
    ),
  ]);
  const error = tx.error ?? nilai.error;
  if (error) {
    console.error("[investasi] muat gagal", { code: error.code });
    return { items: [] as InvestmentItem[], error };
  }

  const items = accounts.map((a): InvestmentItem => {
    const rows = tx.rows.filter((r) => r.account_id === a.id);
    const terakhir = nilai.rows.find((v) => v.account_id === a.id) ?? null; // urut terbaru dulu
    const cost = balanceAsOf(a.opening_balance, rows, "9999-12-31");
    const status = investmentStatus({
      cost,
      lastValuation: terakhir ? { marketValue: terakhir.market_value, costAtValuation: balanceAsOf(a.opening_balance, rows, terakhir.valued_on) } : null,
    });
    return {
      ...status,
      id: a.id,
      name: a.name,
      kind: a.investment_kind,
      archived: Boolean(a.archived_at),
      units: terakhir?.units === null || terakhir?.units === undefined ? null : String(terakhir.units),
      lastValuedOn: terakhir?.valued_on ?? null,
    };
  });
  return { items, error: null };
}

export function investmentTotals(items: InvestmentItem[]) {
  const aktif = items.filter((i) => !i.archived);
  const value = totalBalance(aktif.map((i) => i.value));
  const cost = totalBalance(aktif.map((i) => i.cost));
  return { value, cost, gain: addAmounts(value, -cost), count: aktif.length };
}

// Riwayat nilai satu akun investasi (terbaru dulu) untuk halaman detail.
export async function loadValuationHistory(supabase: Supabase, accountId: string) {
  const { data, error } = await supabase
    .from("investment_valuations")
    .select("id, valued_on, market_value, units, note")
    .eq("account_id", accountId)
    .order("valued_on", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) console.error("[investasi] riwayat gagal", { code: error.code });
  return { rows: data ?? [], error };
}
