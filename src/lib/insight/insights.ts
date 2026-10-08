import "server-only";

import { categoryOptions } from "@/lib/categories/options";
import { currentMonthInJakarta, shiftMonth } from "@/lib/dates";
import { categoryChanges, subscriptionCandidates, unusualExpenses, type InsightRow } from "@/lib/money";
import { fetchAllPages } from "@/lib/supabase/paginate";
import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

// Riwayat pengeluaran yang dibaca: bulan ini + 6 bulan sebelumnya.
const BULAN_RIWAYAT = 6;

// Insight tanpa AI untuk halaman Insight (lihat aturan di src/lib/money/insight.ts).
export async function loadInsights(supabase: Supabase, today: string) {
  const mulai = `${shiftMonth(currentMonthInJakarta(), -BULAN_RIWAYAT)}-01`;
  const [rows, categoriesRes, rulesRes, firstRes, accountsRes] = await Promise.all([
    fetchAllPages<InsightRow>((from, to) =>
      supabase
        .from("transactions")
        .select("id, account_id, category_id, amount, occurred_on, note, recurring_rule_id, debt_id, fee_for_id")
        .eq("type", "expense")
        .gte("occurred_on", mulai)
        .lte("occurred_on", today)
        .order("id")
        .range(from, to),
    ),
    supabase.from("categories").select("id, parent_id, name, type, archived_at"),
    supabase.from("recurring_rules").select("name, note, amount").eq("type", "expense"),
    supabase.from("transactions").select("occurred_on").order("occurred_on").limit(1).maybeSingle(),
    supabase.from("accounts").select("id, name"),
  ]);

  const error = rows.error ?? categoriesRes.error ?? rulesRes.error ?? firstRes.error ?? accountsRes.error;
  if (error) {
    console.error("[insight] muat insight gagal", { code: error.code });
    return { error: true as const };
  }

  const categories = categoriesRes.data ?? [];
  const labels = new Map(categoryOptions(categories).map((c) => [c.value, c.label]));
  const accounts = new Map((accountsRes.data ?? []).map((a) => [a.id, a.name]));
  const label = (id: string) => labels.get(id) ?? "(kategori tidak ditemukan)";

  return {
    error: false as const,
    changes: categoryChanges({ rows: rows.rows, categories, today, firstDate: firstRes.data?.occurred_on ?? null }).map((c) => ({
      ...c,
      label: label(c.categoryId),
    })),
    unusual: unusualExpenses({ rows: rows.rows, today }).map((u) => ({ ...u, label: label(u.categoryId) })),
    subscriptions: subscriptionCandidates({ rows: rows.rows, rules: rulesRes.data ?? [], today }).map((s) => ({
      ...s,
      label: label(s.categoryId),
      accountName: accounts.get(s.accountId) ?? "akun",
    })),
  };
}

export type InsightsData = Extract<Awaited<ReturnType<typeof loadInsights>>, { error: false }>;
