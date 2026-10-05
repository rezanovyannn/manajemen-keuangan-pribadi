import type { Metadata } from "next";

import { PageHeader, SegeraHadir } from "@/components/page-header";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Budget · Keuangan Pribadi" };

export default async function BudgetPage() {
  await requireUser();

  return (
    <>
      <PageHeader title="Budget" description="Atur batas pengeluaran bulanan per kategori." />
      <SegeraHadir fase="Fase 4" />
    </>
  );
}
