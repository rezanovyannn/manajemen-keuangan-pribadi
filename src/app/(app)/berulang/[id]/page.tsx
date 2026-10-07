import { Pause, Play } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { deleteRule, setRulePaused, updateRule } from "@/actions/recurring";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { PageHeader } from "@/components/page-header";
import { RecurringForm } from "@/components/recurring/recurring-form";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { formatTanggal } from "@/lib/dates";
import { isFinished } from "@/lib/recurring/schedule";
import { loadTransactionFormOptions } from "@/lib/transactions/options";
import { idSchema } from "@/lib/validators/common";

export const metadata: Metadata = { title: "Ubah Jadwal · Keuangan Pribadi" };

export default async function UbahBerulangPage({ params }: PageProps<"/berulang/[id]">) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();

  const { supabase } = await requireUser();
  // RLS: jadwal milik pengguna lain tidak akan ditemukan.
  const { data: r } = await supabase.from("recurring_rules").select("*").eq("id", id).maybeSingle();
  if (!r) notFound();
  const { accounts, categories } = await loadTransactionFormOptions(supabase, [r.account_id, r.category_id]);

  const status = r.paused ? "Dijeda" : isFinished(r) ? "Selesai" : `Jatuh tempo berikutnya ${formatTanggal(r.next_due_date)}`;

  return (
    <div className="mx-auto grid w-full max-w-xl grid-cols-1 gap-8">
      <div>
        <PageHeader title={r.name} description={status} />
        <RecurringForm
          action={updateRule.bind(null, r.id)}
          accounts={accounts}
          categories={categories}
          initial={{
            name: r.name,
            type: r.type,
            amount: String(r.amount),
            accountId: r.account_id,
            categoryId: r.category_id,
            frequency: r.frequency,
            startDate: r.start_date,
            endDate: r.end_date ?? "",
            note: r.note ?? "",
          }}
          submitLabel="Simpan perubahan"
        />
        <p className="mt-3 text-xs text-muted-foreground">
          Mengubah tanggal mulai atau frekuensi akan memulai jadwal dari jatuh tempo pertama mulai hari ini.
        </p>
      </div>

      <div className="grid gap-3 rounded-xl border border-border bg-card p-4">
        <form action={setRulePaused.bind(null, r.id, !r.paused)}>
          <Button type="submit" variant="outline" size="lg" className="h-11 md:h-10">
            {r.paused ? <Play aria-hidden /> : <Pause aria-hidden />}
            {r.paused ? "Lanjutkan jadwal" : "Jeda jadwal"}
          </Button>
        </form>
        <ConfirmDeleteButton
          action={deleteRule.bind(null, r.id)}
          label="Hapus jadwal"
          message={`Yakin hapus jadwal ${r.name}? Transaksi yang sudah tercatat tetap ada.`}
        />
      </div>
    </div>
  );
}
