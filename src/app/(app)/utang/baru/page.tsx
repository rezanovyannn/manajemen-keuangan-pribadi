import type { Metadata } from "next";

import { createDebt } from "@/actions/debts";
import { DebtForm } from "@/components/debts/debt-form";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth/session";
import { todayInJakarta } from "@/lib/dates";

export const metadata: Metadata = { title: "Tambah Utang/Piutang · Keuangan Pribadi" };

export default async function UtangBaruPage({ searchParams }: PageProps<"/utang/baru">) {
  const { jenis } = await searchParams;
  const kind = jenis === "piutang" ? "piutang" : "utang";
  await requireUser();

  return (
    <div className="mx-auto grid w-full max-w-xl grid-cols-1">
      <PageHeader title={kind === "utang" ? "Tambah utang" : "Tambah piutang"} />
      <DebtForm action={createDebt} kind={kind} initial={{ startDate: todayInJakarta() }} submitLabel="Simpan" cancelHref={`/utang?jenis=${kind}`} />
    </div>
  );
}
