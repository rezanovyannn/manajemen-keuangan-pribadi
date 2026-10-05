import type { Metadata } from "next";

import { FormAlert } from "@/components/auth/form-field";
import { PageHeader, SegeraHadir } from "@/components/page-header";
import { AddTransactionButton } from "@/components/transactions/add-button";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Transaksi · Keuangan Pribadi" };

export default async function TransaksiPage({ searchParams }: PageProps<"/transaksi">) {
  const { tersimpan } = await searchParams;
  await requireUser();

  return (
    <div className="grid max-w-xl gap-4">
      <PageHeader title="Transaksi" description="Catat pemasukan, pengeluaran, dan transfer." />
      <FormAlert tone="success" message={tersimpan === "1" ? "Transaksi tersimpan." : undefined} />
      <SegeraHadir fase="Fase 3 langkah 3: daftar transaksi" />
      <AddTransactionButton />
    </div>
  );
}
