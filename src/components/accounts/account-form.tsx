"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import type { AccountFormState } from "@/actions/accounts";
import { FormAlert, FormField } from "@/components/auth/form-field";
import { MoneyInput } from "@/components/money-input";
import { Button, buttonVariants } from "@/components/ui/button";
import { SelectField } from "@/components/transactions/select-field";
import { ACCOUNT_TYPES, INVESTMENT_KINDS } from "@/lib/accounts/types";
import { cn } from "@/lib/utils";

type AccountFormProps = {
  action: (prev: AccountFormState, formData: FormData) => Promise<AccountFormState>;
  initial?: { name: string; type: string; openingBalance: string; investmentKind?: string };
  submitLabel: string;
};

export function AccountForm({ action, initial, submitLabel }: AccountFormProps) {
  const [state, formAction, pending] = useActionState(action, {});
  const values = state.values ?? initial;
  const typeError = state.fieldErrors?.type?.[0];
  const [jenis, setJenis] = useState(values?.type ?? "cash");

  return (
    // key: pasang ulang input saat server mengembalikan nilai baru agar defaultValue terpakai
    <form action={formAction} className="grid gap-5" noValidate key={JSON.stringify(state.values)}>
      <FormAlert message={state.error} tone="error" />

      <FormField
        name="name"
        label="Nama akun"
        placeholder="Contoh: BCA, Dompet, GoPay"
        maxLength={50}
        required
        defaultValue={values?.name}
        errors={state.fieldErrors?.name}
      />

      <fieldset className="grid gap-2" aria-describedby={typeError ? "type-error" : undefined}>
        <legend className="mb-2 text-sm font-medium">Jenis</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {ACCOUNT_TYPES.map((t) => (
            <label
              key={t.value}
              className="flex h-11 md:h-10 cursor-pointer items-center justify-center rounded-lg border border-input bg-card text-sm font-medium transition-colors has-checked:border-primary has-checked:bg-primary/10 has-checked:text-link has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
            >
              <input
                type="radio"
                name="type"
                value={t.value}
                checked={jenis === t.value}
                onChange={() => setJenis(t.value)}
                className="sr-only"
              />
              {t.label}
            </label>
          ))}
        </div>
        {typeError && (
          <p id="type-error" className="text-sm text-destructive">
            {typeError}
          </p>
        )}
      </fieldset>

      {jenis === "investment" && (
        <div className="grid gap-2">
          <SelectField
            name="investmentKind"
            label="Jenis aset"
            placeholder="Pilih jenis aset"
            options={INVESTMENT_KINDS}
            defaultValue={values?.investmentKind ?? ""}
            errors={state.fieldErrors?.investmentKind}
          />
          <p className="text-xs text-muted-foreground">
            Satu akun untuk satu aset (mis. Emas Antam, BBCA). Beli = transfer dari rekening ke akun ini; nilai pasar diperbarui
            manual dari halaman akun. Tidak dihitung sebagai uang belanja, tapi masuk Net worth.
          </p>
        </div>
      )}

      <MoneyInput
        name="openingBalance"
        label={jenis === "investment" ? "Modal awal (jika sudah punya aset ini)" : "Saldo awal"}
        defaultValue={values?.openingBalance ?? "0"}
        errors={state.fieldErrors?.openingBalance}
      />

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Link href="/akun" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11 md:h-10")}>
          Batal
        </Link>
        <Button type="submit" size="lg" className="h-11 md:h-10" disabled={pending}>
          {pending ? "Menyimpan..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
