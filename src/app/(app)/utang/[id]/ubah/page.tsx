import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { updateDebt } from "@/actions/debts";
import { DebtForm } from "@/components/debts/debt-form";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth/session";
import { idSchema } from "@/lib/validators/common";

export const metadata: Metadata = { title: "Ubah Utang/Piutang · Keuangan Pribadi" };

export default async function UbahUtangPage({ params }: PageProps<"/utang/[id]/ubah">) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();

  const { supabase } = await requireUser();
  const { data: d } = await supabase.from("debts").select("*").eq("id", id).maybeSingle();
  if (!d) notFound();

  return (
    <div className="grid max-w-xl grid-cols-1">
      <PageHeader title={`Ubah ${d.name}`} />
      <DebtForm
        action={updateDebt.bind(null, d.id)}
        kind={d.kind}
        initial={{
          name: d.name,
          counterparty: d.counterparty ?? "",
          principal: String(d.principal),
          installmentAmount: d.installment_amount ? String(d.installment_amount) : "",
          startDate: d.start_date,
          dueDate: d.due_date ?? "",
          note: d.note ?? "",
        }}
        submitLabel="Simpan perubahan"
        cancelHref={`/utang/${d.id}`}
      />
    </div>
  );
}
