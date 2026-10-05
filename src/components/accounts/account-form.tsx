"use client";

import Link from "next/link";
import { useActionState } from "react";

import type { AccountFormState } from "@/actions/accounts";
import { FormAlert, FormField } from "@/components/auth/form-field";
import { MoneyInput } from "@/components/money-input";
import { Button, buttonVariants } from "@/components/ui/button";
import { ACCOUNT_TYPES } from "@/lib/accounts/types";
import { cn } from "@/lib/utils";

type AccountFormProps = {
  action: (prev: AccountFormState, formData: FormData) => Promise<AccountFormState>;
  initial?: { name: string; type: string; openingBalance: string };
  submitLabel: string;
};

export function AccountForm({ action, initial, submitLabel }: AccountFormProps) {
  const [state, formAction, pending] = useActionState(action, {});
  const values = state.values ?? initial;
  const typeError = state.fieldErrors?.type?.[0];

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
        <div className="grid grid-cols-3 gap-2">
          {ACCOUNT_TYPES.map((t) => (
            <label
              key={t.value}
              className="flex h-10 cursor-pointer items-center justify-center rounded-lg border border-input text-sm font-medium transition-colors has-checked:border-primary has-checked:bg-primary has-checked:text-primary-foreground has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
            >
              <input
                type="radio"
                name="type"
                value={t.value}
                defaultChecked={(values?.type ?? "cash") === t.value}
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

      <MoneyInput
        name="openingBalance"
        label="Saldo awal"
        defaultValue={values?.openingBalance ?? "0"}
        errors={state.fieldErrors?.openingBalance}
      />

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Link href="/akun" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-10")}>
          Batal
        </Link>
        <Button type="submit" size="lg" className="h-10" disabled={pending}>
          {pending ? "Menyimpan..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
