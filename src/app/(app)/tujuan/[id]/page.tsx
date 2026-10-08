import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { saveAllocation } from "@/actions/goal-allocations";
import { deleteGoal, updateGoal } from "@/actions/goals";
import { FormAlert } from "@/components/auth/form-field";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { AllocationForm } from "@/components/goals/allocation-form";
import { AllocationHistory } from "@/components/goals/allocation-history";
import { GoalCard } from "@/components/goals/goal-card";
import { GoalForm } from "@/components/goals/goal-form";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth/session";
import { todayInJakarta } from "@/lib/dates";
import { loadActiveAllocations, loadGoalHistory, loadGoals } from "@/lib/goals/query";
import { addAmounts, allocationTotals } from "@/lib/money";
import { loadAccountBalances } from "@/lib/transactions/balances";
import { idSchema } from "@/lib/validators/common";

export const metadata: Metadata = { title: "Tujuan · Keuangan Pribadi" };

const PESAN: Record<string, { tone: "success" | "error"; text: string }> = {
  tersimpan: { tone: "success", text: "Tujuan tersimpan. Sisihkan tabungan pertamamu di bawah." },
  disisihkan: { tone: "success", text: "Tabungan disisihkan." },
  diambil: { tone: "success", text: "Tabungan diambil kembali ke saldo bebas." },
  "riwayat-dihapus": { tone: "success", text: "Riwayat dihapus." },
  "tidak-bisa-hapus": {
    tone: "error",
    text: "Riwayat ini tidak bisa dihapus karena sebagian tabungannya sudah diambil. Hapus pengambilannya dulu.",
  },
  gagal: { tone: "error", text: "Perubahan gagal disimpan. Silakan coba lagi." },
};

export default async function TujuanPage({ params, searchParams }: PageProps<"/tujuan/[id]">) {
  const { id } = await params;
  const { status } = await searchParams;
  if (!idSchema.safeParse(id).success) notFound();

  const { supabase } = await requireUser();
  const today = todayInJakarta();
  // RLS: tujuan milik pengguna lain tidak akan ditemukan.
  const [goals, alloc, history, accountsRes] = await Promise.all([
    loadGoals(supabase, today),
    loadActiveAllocations(supabase),
    loadGoalHistory(supabase, id),
    supabase.from("accounts").select("id, name, opening_balance, archived_at").neq("type", "investment").order("created_at"),
  ]);
  const goal = goals.items.find((g) => g.id === id);
  if (!goal) notFound();

  const accounts = accountsRes.data ?? [];
  const balances = await loadAccountBalances(supabase, accounts);
  const totals = allocationTotals(alloc.rows);
  const gagalMuat = Boolean(goals.error ?? alloc.error ?? history.error ?? accountsRes.error ?? balances.error);
  const nama = new Map(accounts.map((a) => [a.id, a.name]));
  const pesan = typeof status === "string" ? PESAN[status] : undefined;

  return (
    <div className="mx-auto grid w-full max-w-xl grid-cols-1 gap-4">
      <PageHeader title={goal.name} description="Tabungan disisihkan dari saldo akun; saldo akunnya tidak berubah." />
      <FormAlert tone={pesan?.tone ?? "success"} message={pesan?.text} />
      <FormAlert tone="error" message={gagalMuat ? "Sebagian data gagal dimuat. Coba muat ulang halaman." : undefined} />

      <GoalCard goal={goal} asLink={false} />

      {!gagalMuat && balances.balances && (
        <section aria-labelledby="judul-sisihkan" className="grid gap-3 rounded-xl border border-border bg-card p-4">
          <h2 id="judul-sisihkan" className="font-semibold">
            Sisihkan atau ambil
          </h2>
          <AllocationForm
            action={saveAllocation.bind(null, goal.id)}
            today={today}
            accounts={accounts.map((a) => ({
              id: a.id,
              name: a.name,
              archived: Boolean(a.archived_at),
              free: addAmounts(balances.balances.get(a.id) ?? 0, -(totals.byAccount.get(a.id) ?? 0)),
              saved: totals.goalAccount(goal.id, a.id),
            }))}
          />
        </section>
      )}

      <AllocationHistory
        goalId={goal.id}
        rows={history.rows.map((r) => ({ ...r, accountName: nama.get(r.account_id) ?? "(akun tidak ditemukan)" }))}
      />

      <details className="rounded-xl border border-border bg-card">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium">Ubah tujuan</summary>
        <div className="border-t border-border p-4">
          <GoalForm
            action={updateGoal.bind(null, goal.id)}
            initial={{ name: goal.name, targetAmount: String(goal.progress.target), deadline: goal.deadline ?? "" }}
            submitLabel="Simpan perubahan"
          />
        </div>
      </details>

      <div className="grid gap-2 rounded-xl border border-border bg-card p-4">
        <ConfirmDeleteButton
          action={deleteGoal.bind(null, goal.id)}
          label="Hapus tujuan"
          message={`Yakin hapus tujuan ${goal.name}? Tabungannya kembali menjadi saldo bebas; saldo dan transaksi akun tidak berubah.`}
        />
      </div>
    </div>
  );
}
