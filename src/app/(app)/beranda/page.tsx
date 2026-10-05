import type { Metadata } from "next";

import { PageHeader, SegeraHadir } from "@/components/page-header";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Beranda · Keuangan Pribadi" };

export default async function BerandaPage() {
  const { supabase, user } = await requireUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <>
      <PageHeader
        title={`Halo, ${profile?.display_name ?? "pengguna baru"}!`}
        description="Ringkasan keuanganmu akan tampil di sini."
      />
      <SegeraHadir fase="Fase 5: dashboard" />
    </>
  );
}
