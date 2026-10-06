import "server-only";

import { debtStatus, paidByDebt, type DebtStatus } from "@/lib/money";
import type { DebtKind } from "@/lib/supabase/database.types";
import { fetchAllPages } from "@/lib/supabase/paginate";
import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type DebtItem = {
  id: string;
  kind: DebtKind;
  name: string;
  counterparty: string | null;
  installmentAmount: number | null;
  dueDate: string | null;
  archived: boolean;
  status: DebtStatus;
};

export const JENIS_HUTANG: Record<DebtKind, { label: string; aksi: string; kategori: string; tipe: "expense" | "income" }> = {
  utang: { label: "Utang", aksi: "Bayar", kategori: "Cicilan & Utang", tipe: "expense" },
  piutang: { label: "Piutang", aksi: "Terima", kategori: "Pelunasan Piutang", tipe: "income" },
};

// Semua utang/piutang beserta sisa (jumlah awal - pembayaran yang ditandai).
export async function loadDebts(supabase: Supabase) {
  const [debtsRes, payments] = await Promise.all([
    supabase
      .from("debts")
      .select("id, kind, name, counterparty, principal, installment_amount, due_date, archived_at")
      .order("created_at"),
    fetchAllPages<{ debt_id: string | null; amount: number }>((from, to) =>
      supabase.from("transactions").select("debt_id, amount").not("debt_id", "is", null).order("id").range(from, to),
    ),
  ]);
  const error = debtsRes.error ?? payments.error;
  if (error) {
    console.error("[debts] muat gagal", { code: error.code });
    return { items: [] as DebtItem[], error };
  }

  const paid = paidByDebt(payments.rows);
  const items: DebtItem[] = (debtsRes.data ?? []).map((d) => ({
    id: d.id,
    kind: d.kind,
    name: d.name,
    counterparty: d.counterparty,
    installmentAmount: d.installment_amount,
    dueDate: d.due_date,
    archived: Boolean(d.archived_at),
    status: debtStatus(d.principal, paid.get(d.id) ?? 0),
  }));
  return { items, error: null };
}
