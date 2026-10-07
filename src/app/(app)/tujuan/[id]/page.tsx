import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { deleteGoal, updateGoal } from "@/actions/goals";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { GoalForm } from "@/components/goals/goal-form";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth/session";
import { idSchema } from "@/lib/validators/common";

export const metadata: Metadata = { title: "Ubah Tujuan · Keuangan Pribadi" };

export default async function UbahTujuanPage({ params }: PageProps<"/tujuan/[id]">) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();

  const { supabase } = await requireUser();
  // RLS: tujuan milik pengguna lain tidak akan ditemukan.
  const { data: goal } = await supabase.from("goals").select("id, name, account_id, target_amount, deadline").eq("id", id).maybeSingle();
  if (!goal) notFound();

  const [{ data: accounts }, { data: goals }] = await Promise.all([
    supabase.from("accounts").select("id, name, archived_at").order("created_at"),
    supabase.from("goals").select("account_id").is("archived_at", null).neq("id", goal.id),
  ]);
  const terpakai = new Set((goals ?? []).map((g) => g.account_id));
  const options = (accounts ?? [])
    .filter((a) => a.id === goal.account_id || (!a.archived_at && !terpakai.has(a.id)))
    .map((a) => ({ value: a.id, label: a.archived_at ? `${a.name} (diarsipkan)` : a.name }));

  return (
    <div className="mx-auto grid w-full max-w-xl grid-cols-1 gap-8">
      <div>
        <PageHeader title="Ubah tujuan" />
        <GoalForm
          action={updateGoal.bind(null, goal.id)}
          accounts={options}
          initial={{ name: goal.name, accountId: goal.account_id, targetAmount: String(goal.target_amount), deadline: goal.deadline ?? "" }}
          submitLabel="Simpan perubahan"
        />
      </div>
      <div className="grid gap-2 rounded-xl border border-border bg-card p-4">
        <ConfirmDeleteButton
          action={deleteGoal.bind(null, goal.id)}
          label="Hapus tujuan"
          message={`Yakin hapus tujuan ${goal.name}? Saldo dan transaksi akunnya tidak berubah.`}
        />
      </div>
    </div>
  );
}
