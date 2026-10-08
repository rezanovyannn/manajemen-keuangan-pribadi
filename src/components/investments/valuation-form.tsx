"use client";

import { useActionState } from "react";

import type { ValuationFormState } from "@/actions/investments";
import { FormAlert, FormField } from "@/components/auth/form-field";
import { MoneyInput } from "@/components/money-input";
import { Button } from "@/components/ui/button";

// Perbarui nilai pasar akun investasi (manual, tanpa harga otomatis).
export function ValuationForm({
  action,
  today,
}: {
  action: (prev: ValuationFormState, formData: FormData) => Promise<ValuationFormState>;
  today: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const v = state.values ?? {};
  const err = state.fieldErrors ?? {};
  return (
    <form action={formAction} className="grid gap-4" noValidate key={JSON.stringify(state.values)}>
      <FormAlert tone="error" message={state.error} />
      <MoneyInput name="marketValue" label="Nilai sekarang" defaultValue={v.marketValue} errors={err.marketValue} />
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField name="units" label="Unit (opsional)" placeholder="Contoh: 2,5 atau 0,0132" inputMode="decimal" autoComplete="off" defaultValue={v.units} errors={err.units} />
        <FormField name="valuedOn" label="Tanggal" type="date" defaultValue={v.valuedOn ?? today} errors={err.valuedOn} />
      </div>
      <FormField name="note" label="Catatan (opsional)" maxLength={200} autoComplete="off" defaultValue={v.note} errors={err.note} />
      <p className="text-xs text-muted-foreground">Lihat nilainya di aplikasi broker/platform investasimu, lalu isi di sini.</p>
      <Button type="submit" size="lg" className="h-11 md:h-10" disabled={pending}>
        {pending ? "Menyimpan..." : "Simpan nilai"}
      </Button>
    </form>
  );
}
