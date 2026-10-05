import type { Metadata } from "next";

import { PageHeader, SegeraHadir } from "@/components/page-header";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Transaksi · Keuangan Pribadi" };

export default async function TransaksiPage() {
  await requireUser();

  return (
    <>
      <PageHeader title="Transaksi" description="Catat pemasukan, pengeluaran, dan transfer." />
      <SegeraHadir fase="Fase 3" />
    </>
  );
}
