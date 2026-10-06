import type { Metadata } from "next";

import { createGoal } from "@/actions/goals";
import { GoalForm } from "@/components/goals/goal-form";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Tambah Tujuan · Keuangan Pribadi" };

export default async function TujuanBaruPage() {
  const { supabase } = await requireUser();
  const [{ data: accounts }, { data: goals }] = await Promise.all([
    supabase.from("accounts").select("id, name").is("archived_at", null).order("created_at"),
    supabase.from("goals").select("account_id").is("archived_at", null),
  ]);
  // Akun yang sudah dipakai tujuan aktif lain tidak ditawarkan.
  const terpakai = new Set((goals ?? []).map((g) => g.account_id));
  const options = (accounts ?? []).filter((a) => !terpakai.has(a.id)).map((a) => ({ value: a.id, label: a.name }));

  return (
    <div className="grid max-w-xl grid-cols-1">
      <PageHeader title="Tambah tujuan tabungan" />
      <GoalForm action={createGoal} accounts={options} submitLabel="Simpan" />
    </div>
  );
}
