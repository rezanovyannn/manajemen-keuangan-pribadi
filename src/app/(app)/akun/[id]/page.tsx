import { Archive, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { setAccountArchived, updateAccount } from "@/actions/accounts";
import { addValuation } from "@/actions/investments";
import { AccountForm } from "@/components/accounts/account-form";
import { FormAlert } from "@/components/auth/form-field";
import { InvestmentCard } from "@/components/investments/investment-card";
import { ValuationChart } from "@/components/investments/valuation-chart";
import { ValuationForm } from "@/components/investments/valuation-form";
import { ValuationHistory } from "@/components/investments/valuation-history";
import { PageHeader } from "@/components/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { todayInJakarta } from "@/lib/dates";
import { loadInvestments, loadValuationHistory } from "@/lib/investments/query";
import { cn } from "@/lib/utils";
import { idSchema } from "@/lib/validators/common";

export const metadata: Metadata = { title: "Akun · Keuangan Pribadi" };

const PESAN: Record<string, { tone: "success" | "error"; text: string }> = {
  "nilai-disimpan": { tone: "success", text: "Nilai investasi diperbarui." },
  "nilai-dihapus": { tone: "success", text: "Riwayat nilai dihapus." },
  gagal: { tone: "error", text: "Perubahan gagal disimpan. Silakan coba lagi." },
};

export default async function AkunPage({ params, searchParams }: PageProps<"/akun/[id]">) {
  const { id } = await params;
  const { status } = await searchParams;
  if (!idSchema.safeParse(id).success) notFound();

  const { supabase } = await requireUser();
  const { data: account } = await supabase
    .from("accounts")
    .select("id, name, type, investment_kind, opening_balance, archived_at")
    .eq("id", id)
    .maybeSingle();
  // RLS: akun milik pengguna lain tidak akan ditemukan.
  if (!account || account.archived_at) notFound();

  const investasi = account.type === "investment";
  const [inv, riwayat] = investasi ? await Promise.all([loadInvestments(supabase), loadValuationHistory(supabase, account.id)]) : [null, null];
  const item = inv?.items.find((i) => i.id === account.id);
  const pesan = typeof status === "string" ? PESAN[status] : undefined;

  return (
    <div className="mx-auto grid w-full max-w-xl grid-cols-1 gap-6">
      <FormAlert tone={pesan?.tone ?? "success"} message={pesan?.text} />

      {investasi && (
        <div className="grid gap-4">
          <PageHeader title={account.name} description="Beli & jual lewat transfer; nilai pasar diperbarui manual." />
          {item && <InvestmentCard item={item} today={todayInJakarta()} asLink={false} />}
          {item && <ValuationChart data={item.history.map((h) => ({ date: h.date, value: h.value }))} />}
          <div className="grid grid-cols-2 gap-2">
            {/* Beli = transfer dari rekening ke akun ini; Jual = transfer dari akun ini ke rekening. */}
            <Link href={`/transaksi/baru?tipe=transfer&ke=${account.id}`} className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11 md:h-10")}>
              <ArrowDownLeft aria-hidden />
              Beli
            </Link>
            <Link href={`/transaksi/baru?tipe=transfer&akun=${account.id}`} className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11 md:h-10")}>
              <ArrowUpRight aria-hidden />
              Jual
            </Link>
          </div>
          <section aria-labelledby="judul-nilai" className="grid gap-3 rounded-xl border border-border bg-card p-4">
            <h2 id="judul-nilai" className="font-semibold">
              Perbarui nilai
            </h2>
            <ValuationForm action={addValuation.bind(null, account.id)} today={todayInJakarta()} lastUnits={item?.units ?? null} />
          </section>
          {/* Riwayat terbaru dulu; perubahan dari buku besar (urut sama, dibalik). */}
          <ValuationHistory accountId={account.id} rows={riwayat?.rows ?? []} changes={[...(item?.history ?? [])].reverse()} />
        </div>
      )}

      <div>
        <PageHeader title={investasi ? "Ubah akun investasi" : "Ubah akun"} />
        <AccountForm
          action={updateAccount.bind(null, account.id)}
          submitLabel="Simpan perubahan"
          initial={{
            name: account.name,
            type: account.type,
            openingBalance: String(account.opening_balance),
            investmentKind: account.investment_kind ?? "",
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
        <Button type="submit" variant="destructive" size="lg" className="h-11 md:h-10 sm:justify-self-start">
          <Archive aria-hidden />
          Arsipkan akun
        </Button>
      </form>
    </div>
  );
}
