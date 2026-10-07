import { Archive } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { setAccountArchived, updateAccount } from "@/actions/accounts";
import { AccountForm } from "@/components/accounts/account-form";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { idSchema } from "@/lib/validators/common";

export const metadata: Metadata = { title: "Ubah Akun · Keuangan Pribadi" };

export default async function UbahAkunPage({ params }: PageProps<"/akun/[id]">) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();

  const { supabase } = await requireUser();
  const { data: account } = await supabase
    .from("accounts")
    .select("id, name, type, opening_balance, archived_at")
    .eq("id", id)
    .maybeSingle();
  // RLS: akun milik pengguna lain tidak akan ditemukan.
  if (!account || account.archived_at) notFound();

  return (
    <div className="mx-auto grid w-full max-w-xl grid-cols-1 gap-8">
      <div>
        <PageHeader title="Ubah akun" />
        <AccountForm
          action={updateAccount.bind(null, account.id)}
          submitLabel="Simpan perubahan"
          initial={{
            name: account.name,
            type: account.type,
            openingBalance: String(account.opening_balance),
          }}
        />
      </div>

      <form
        action={setAccountArchived.bind(null, account.id, true)}
        className="grid gap-2 rounded-xl border border-border bg-card p-4"
      >
        <p className="text-sm text-muted-foreground">
          Akun yang diarsipkan disembunyikan dari pilihan, tapi riwayatnya tetap tersimpan dan bisa
          dipulihkan kapan saja.
        </p>
        <Button type="submit" variant="destructive" size="lg" className="h-10 sm:justify-self-start">
          <Archive aria-hidden />
          Arsipkan akun
        </Button>
      </form>
    </div>
  );
}
