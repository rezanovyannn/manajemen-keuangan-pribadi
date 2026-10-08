import "server-only";

import { CheckCircle2, Smartphone } from "lucide-react";
import Link from "next/link";

import { continueFromAccounts, finishOnboarding } from "@/actions/onboarding";
import { AccountIcon } from "@/components/accounts/account-icon";
import { Button, buttonVariants } from "@/components/ui/button";
import { accountTypeLabel } from "@/lib/accounts/types";
import { monthToDate } from "@/lib/budgets/query";
import { currentMonthInJakarta, todayInJakarta } from "@/lib/dates";
import { loadActiveAllocations } from "@/lib/goals/query";
import { addAmounts, allocationTotals, formatRupiah } from "@/lib/money";
import { KATEGORI_BUDGET_CEPAT } from "@/lib/onboarding/presets";
import { hrefLangkah, langkahBerikutnya, langkahSebelumnya, type Langkah } from "@/lib/onboarding/steps";
import type { createClient } from "@/lib/supabase/server";
import { loadAccountBalances } from "@/lib/transactions/balances";
import { loadTransactionFormOptions } from "@/lib/transactions/options";
import { cn } from "@/lib/utils";

import { AccountStepForm } from "./account-step";
import { BudgetStepForm } from "./budget-step";
import { GoalStepForm } from "./goal-step";
import { NameStep } from "./name-step";
import { RuleStepForm } from "./rule-step";
import { StepHeader, WizardNav } from "./wizard-shell";

type Supabase = Awaited<ReturnType<typeof createClient>>;

const kembali = (l: Langkah) => {
  const s = langkahSebelumnya(l);
  return s ? hrefLangkah(s) : null;
};
const lewati = (l: Langkah) => hrefLangkah(langkahBerikutnya(l));

export async function LangkahNama({ supabase, userId }: { supabase: Supabase; userId: string }) {
  const { data } = await supabase.from("profiles").select("display_name").eq("id", userId).maybeSingle();
  return (
    <>
      <StepHeader title="Halo! Mau dipanggil siapa?" description="Nama ini muncul di Beranda." />
      <NameStep defaultName={data?.display_name ?? ""} />
      <WizardNav back={hrefLangkah("intro", 3)} />
    </>
  );
}

export async function LangkahAkun({ supabase }: { supabase: Supabase }) {
  const { data } = await supabase.from("accounts").select("id, name, type, opening_balance").is("archived_at", null).order("created_at");
  const akun = data ?? [];
  return (
    <>
      <StepHeader
        title="Tambah akun & dompet"
        description="Rekening bank, e-wallet, atau uang tunai yang ingin kamu catat. Minimal satu, bisa ditambah lagi nanti."
      />
      {akun.length > 0 && (
        <ul aria-label="Akun ditambahkan" className="divide-y divide-border rounded-xl border border-border bg-card">
          {akun.map((a) => (
            <li key={a.id} className="flex items-center gap-3 px-4 py-3">
              <AccountIcon type={a.type} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{a.name}</p>
                <p className="text-xs text-muted-foreground">{accountTypeLabel(a.type)}</p>
              </div>
              <p className="shrink-0 text-sm font-medium tabular-nums">{formatRupiah(a.opening_balance)}</p>
            </li>
          ))}
        </ul>
      )}
      <div className="rounded-xl border border-border bg-card p-4">
        <AccountStepForm key={akun.length} existing={akun.map((a) => a.name)} />
      </div>
      <WizardNav back={kembali("akun")}>
        <form action={continueFromAccounts}>
          <Button type="submit" size="lg" className="h-12 w-full text-base" disabled={akun.length === 0}>
            Lanjut
          </Button>
        </form>
      </WizardNav>
    </>
  );
}

export async function LangkahBudget({ supabase }: { supabase: Supabase }) {
  const [katRes, budRes] = await Promise.all([
    supabase.from("categories").select("id, name").eq("type", "expense").is("parent_id", null).is("archived_at", null).in("name", [...KATEGORI_BUDGET_CEPAT]),
    supabase.from("budgets").select("category_id, amount").eq("month", monthToDate(currentMonthInJakarta())),
  ]);
  const ada = new Map((budRes.data ?? []).map((b) => [b.category_id, b.amount]));
  const urut = (n: string) => KATEGORI_BUDGET_CEPAT.indexOf(n as (typeof KATEGORI_BUDGET_CEPAT)[number]);
  const kategori = (katRes.data ?? [])
    .sort((a, b) => urut(a.name) - urut(b.name))
    .map((k) => ({ id: k.id, name: k.name, amount: ada.get(k.id) ?? null }));
  return (
    <>
      <StepHeader title="Budget bulan ini" description="Batas belanja per kategori. Kamu akan diingatkan saat hampir habis atau terlampaui." />
      <div className="rounded-xl border border-border bg-card p-4">
        <BudgetStepForm categories={kategori} />
      </div>
      <WizardNav back={kembali("budget")} skip={lewati("budget")} />
    </>
  );
}

export async function LangkahTagihan({ supabase }: { supabase: Supabase }) {
  const [opsi, rulesRes] = await Promise.all([
    loadTransactionFormOptions(supabase),
    supabase.from("recurring_rules").select("id, name, type, amount").order("created_at"),
  ]);
  const rules = rulesRes.data ?? [];
  return (
    <>
      <StepHeader
        title="Tagihan & pemasukan rutin"
        description="Gaji, listrik, internet, langganan. Aplikasi akan mengingatkan saat jatuh tempo — kamu yang mencatat."
      />
      {rules.length > 0 && (
        <ul aria-label="Jadwal ditambahkan" className="divide-y divide-border rounded-xl border border-border bg-card">
          {rules.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <p className="min-w-0 truncate font-medium">{r.name}</p>
              <p className="shrink-0 text-sm font-medium tabular-nums">
                {r.type === "income" ? "+" : "−"}
                {formatRupiah(r.amount)}
              </p>
            </li>
          ))}
        </ul>
      )}
      <div className="rounded-xl border border-border bg-card p-4">
        <RuleStepForm key={rules.length} accounts={opsi.accounts} categories={opsi.categories} today={todayInJakarta()} />
      </div>
      <WizardNav back={kembali("tagihan")} skip={rules.length > 0 ? null : lewati("tagihan")}>
        {rules.length > 0 && (
          <Link href={lewati("tagihan")} className={cn(buttonVariants({ size: "lg" }), "h-12 text-base")}>
            Lanjut
          </Link>
        )}
      </WizardNav>
    </>
  );
}

export async function LangkahTujuan({ supabase }: { supabase: Supabase }) {
  const { data } = await supabase
    .from("accounts")
    .select("id, name, opening_balance")
    .is("archived_at", null)
    .neq("type", "investment")
    .order("created_at");
  const accounts = data ?? [];
  const [balances, alloc] = await Promise.all([loadAccountBalances(supabase, accounts), loadActiveAllocations(supabase)]);
  const totals = allocationTotals(alloc.rows);
  return (
    <>
      <StepHeader
        title="Tujuan tabungan"
        description="Misalnya dana darurat atau liburan. Sisihkan dari akun mana saja; saldo akunnya tetap."
      />
      <div className="rounded-xl border border-border bg-card p-4">
        <GoalStepForm
          accounts={accounts.map((a) => ({
            id: a.id,
            name: a.name,
            free: addAmounts(balances.balances?.get(a.id) ?? 0, -(totals.byAccount.get(a.id) ?? 0)),
          }))}
        />
      </div>
      <WizardNav back={kembali("tujuan")} skip={lewati("tujuan")} />
    </>
  );
}

export async function LangkahSelesai({ supabase }: { supabase: Supabase }) {
  const hitung = (t: "accounts" | "recurring_rules" | "goals") => supabase.from(t).select("id", { count: "exact", head: true });
  const [akun, jadwal, tujuan, budget] = await Promise.all([
    hitung("accounts"),
    hitung("recurring_rules"),
    hitung("goals"),
    supabase.from("budgets").select("id", { count: "exact", head: true }).eq("month", monthToDate(currentMonthInJakarta())),
  ]);
  const ringkas = [
    { label: "akun", n: akun.count ?? 0 },
    { label: "budget bulan ini", n: budget.count ?? 0 },
    { label: "jadwal rutin", n: jadwal.count ?? 0 },
    { label: "tujuan tabungan", n: tujuan.count ?? 0 },
  ];
  return (
    <>
      <div className="grid justify-items-start gap-4 pt-2">
        <span aria-hidden className="inline-flex size-14 items-center justify-center rounded-2xl bg-sticker-green/15 text-sticker-green">
          <CheckCircle2 className="size-7" />
        </span>
        <StepHeader title="Semua siap!" description="Mulai catat transaksi harianmu. Semua bisa diubah kapan saja dari menu." />
      </div>
      <ul aria-label="Ringkasan" className="grid grid-cols-2 gap-2">
        {ringkas.map((r) => (
          <li key={r.label} className="rounded-xl border border-border bg-card px-4 py-3">
            <p className="text-2xl font-bold tabular-nums">{r.n}</p>
            <p className="text-xs text-muted-foreground">{r.label}</p>
          </li>
        ))}
      </ul>
      <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-sm">
        <Smartphone className="mt-0.5 size-5 shrink-0 text-link" aria-hidden />
        <p className="text-muted-foreground">
          <span className="font-medium text-foreground">Pasang di HP</span> agar terbuka layar penuh seperti aplikasi biasa: Android
          (Chrome) ketuk ⋮ → &quot;Instal aplikasi&quot;; iPhone (Safari) ketuk Bagikan → &quot;Tambah ke Layar Utama&quot;.
        </p>
      </div>
      <WizardNav back={kembali("selesai")}>
        <form action={finishOnboarding}>
          <Button type="submit" size="lg" className="h-12 w-full text-base">
            Ke Beranda
          </Button>
        </form>
      </WizardNav>
    </>
  );
}
