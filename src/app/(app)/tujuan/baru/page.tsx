import type { Metadata } from "next";

import { createGoal } from "@/actions/goals";
import { GoalForm } from "@/components/goals/goal-form";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Tambah Tujuan · Keuangan Pribadi" };

export default async function TujuanBaruPage() {
  await requireUser();
  return (
    <div className="mx-auto grid w-full max-w-xl grid-cols-1">
      <PageHeader title="Tambah tujuan tabungan" />
      <GoalForm action={createGoal} submitLabel="Simpan" />
    </div>
  );
}
