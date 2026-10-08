"use client";

import { useActionState, useState } from "react";

import type { AllocationFormState } from "@/actions/goal-allocations";
import { FormAlert, FormField } from "@/components/auth/form-field";
import { MoneyInput } from "@/components/money-input";
import { SelectField } from "@/components/transactions/select-field";
import { Button } from "@/components/ui/button";
import { formatRupiah } from "@/lib/money";
import { cn } from "@/lib/utils";

export type AllocationAccount = {
  id: string;
  name: string;
  free: number; // saldo bebas akun (untuk sisihkan)
  saved: number; // tabungan tujuan ini dari akun tersebut (untuk ambil)
  archived: boolean;
};

type Jenis = "sisihkan" | "ambil";

const JENIS: { value: Jenis; label: string }[] = [
  { value: "sisihkan", label: "Sisihkan" },
  { value: "ambil", label: "Ambil" },
];

// Form Sisihkan / Ambil tabungan. Tidak ada uang yang berpindah akun; batas nominal
// dicek ulang di server (saveAllocation).
export function AllocationForm({
  action,
  accounts,
  today,
}: {
  action: (prev: AllocationFormState, formData: FormData) => Promise<AllocationFormState>;
  accounts: AllocationAccount[];
  today: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const v = state.values ?? {};
  const [jenis, setJenis] = useState<Jenis>(v.kind === "ambil" ? "ambil" : "sisihkan");
  const err = state.fieldErrors ?? {};

  // Sisihkan: akun aktif + saldo bebasnya. Ambil: akun yang punya tabungan tujuan ini.
  const pilihan =
    jenis === "sisihkan"
      ? accounts.filter((a) => !a.archived).map((a) => ({ value: a.id, label: `${a.name} · bebas ${formatRupiah(Math.max(0, a.free))}` }))
      : accounts.filter((a) => a.saved > 0).map((a) => ({ value: a.id, label: `${a.name} · tabungan ${formatRupiah(a.saved)}` }));

  return (
    <form action={formAction} className="grid gap-4" noValidate key={JSON.stringify(state.values)}>
      <FormAlert message={state.error} tone="error" />
      <fieldset>
        <legend className="sr-only">Jenis</legend>
        <div className="grid grid-cols-2 gap-2">
          {JENIS.map((j) => (
            <label
              key={j.value}
              className={cn(
                "flex h-11 cursor-pointer items-center justify-center rounded-lg border border-input bg-card text-sm font-medium transition-colors has-checked:border-primary has-checked:bg-primary/10 has-checked:text-link has-focus-visible:ring-3 has-focus-visible:ring-ring/50 md:h-10",
              )}
            >
              <input
                type="radio"
                name="kind"
                value={j.value}
                checked={jenis === j.value}
                onChange={() => setJenis(j.value)}
                className="sr-only"
              />
              {j.label}
            </label>
          ))}
        </div>
      </fieldset>

      {pilihan.length === 0 ? (
        <p className="rounded-lg bg-muted/60 px-3 py-3 text-sm text-muted-foreground">
          {jenis === "sisihkan" ? "Belum ada akun aktif." : "Belum ada tabungan yang bisa diambil."}
        </p>
      ) : (
        <>
          <SelectField
            key={jenis}
            name="accountId"
            label={jenis === "sisihkan" ? "Dari akun" : "Kembalikan ke akun"}
            placeholder="Pilih akun"
            options={pilihan}
            defaultValue={v.accountId ?? (pilihan.length === 1 ? pilihan[0]!.value : "")}
            errors={err.accountId}
          />
          <MoneyInput name="amount" label="Nominal" defaultValue={v.amount} errors={err.amount} />
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField name="occurredOn" label="Tanggal" type="date" defaultValue={v.occurredOn ?? today} errors={err.occurredOn} />
            <FormField name="note" label="Catatan (opsional)" maxLength={200} autoComplete="off" defaultValue={v.note} errors={err.note} />
          </div>
          <p className="text-xs text-muted-foreground">
            {jenis === "sisihkan"
              ? "Saldo akun tidak berubah; bagian ini ditandai sebagai tabungan dan tidak dihitung sebagai uang belanja."
              : "Tabungan dikembalikan menjadi saldo bebas di akun itu. Catat pengeluarannya seperti biasa jika uangnya dipakai."}
          </p>
          <Button type="submit" size="lg" className="h-11 md:h-10" disabled={pending}>
            {pending ? "Menyimpan..." : jenis === "sisihkan" ? "Sisihkan" : "Ambil"}
          </Button>
        </>
      )}
    </form>
  );
}
