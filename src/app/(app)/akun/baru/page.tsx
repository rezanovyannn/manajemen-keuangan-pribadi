import type { Metadata } from "next";

import { createAccount } from "@/actions/accounts";
import { AccountForm } from "@/components/accounts/account-form";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Tambah Akun · Keuangan Pribadi" };

export default async function AkunBaruPage() {
  await requireUser();

  return (
    <div className="mx-auto grid w-full max-w-xl grid-cols-1">
      <PageHeader title="Tambah akun" />
      <AccountForm action={createAccount} submitLabel="Simpan" />
    </div>
  );
}
