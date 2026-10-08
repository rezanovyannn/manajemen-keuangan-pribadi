import type { Metadata } from "next";

import { createAccount } from "@/actions/accounts";
import { AccountForm } from "@/components/accounts/account-form";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Tambah Akun · Keuangan Pribadi" };

export default async function AkunBaruPage({ searchParams }: PageProps<"/akun/baru">) {
  const { jenis } = await searchParams;
  await requireUser();
  // ?jenis=investment: dibuka dari bagian Investasi di halaman Akun.
  const investasi = jenis === "investment";

  return (
    <div className="mx-auto grid w-full max-w-xl grid-cols-1">
      <PageHeader title={investasi ? "Tambah akun investasi" : "Tambah akun"} />
      <AccountForm
        action={createAccount}
        submitLabel="Simpan"
        initial={investasi ? { name: "", type: "investment", openingBalance: "0" } : undefined}
      />
    </div>
  );
}
