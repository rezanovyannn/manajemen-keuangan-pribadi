"use client";

import { useActionState } from "react";

import { saveQuickGoal } from "@/actions/onboarding";
import { FormAlert, FormField } from "@/components/auth/form-field";
import { MoneyInput } from "@/components/money-input";
import { SelectField } from "@/components/transactions/select-field";
import { Button } from "@/components/ui/button";
import { formatRupiah } from "@/lib/money";

// Satu tujuan tabungan + (opsional) langsung sisihkan dari salah satu akun.
export function GoalStepForm({ accounts }: { accounts: { id: string; name: string; free: number }[] }) {
  const [state, action, pending] = useActionState(saveQuickGoal, {});
  const v = state.values ?? {};
  const err = state.fieldErrors ?? {};
  return (
    <form action={action} className="grid gap-4" noValidate key={JSON.stringify(state.values)}>
      <FormAlert tone="error" message={state.error} />
      <FormField name="name" label="Nama tujuan" placeholder="Contoh: Dana darurat, Liburan" maxLength={50} defaultValue={v.name} errors={err.name} />
      <MoneyInput name="targetAmount" label="Target" defaultValue={v.targetAmount} errors={err.targetAmount} />
      <FormField name="deadline" label="Tenggat (opsional)" type="date" defaultValue={v.deadline} errors={err.deadline} />
      <div className="grid gap-4 rounded-lg bg-muted/50 p-3">
        <p className="text-sm font-medium">Tabungan awal (opsional)</p>
        <SelectField
          name="initialAccountId"
          label="Sisihkan dari akun"
          placeholder="Pilih akun"
          options={accounts.map((a) => ({ value: a.id, label: `${a.name} · bebas ${formatRupiah(Math.max(0, a.free))}` }))}
          defaultValue={v.initialAccountId ?? ""}
          errors={err.initialAccountId}
        />
        <MoneyInput name="initialAmount" label="Nominal tabungan awal" defaultValue={v.initialAmount} errors={err.initialAmount} />
        <p className="text-xs text-muted-foreground">Saldo akun tidak berubah; bagian ini ditandai sebagai tabungan.</p>
      </div>
      <Button type="submit" size="lg" className="h-12 text-base" disabled={pending}>
        {pending ? "Menyimpan..." : "Simpan & lanjut"}
      </Button>
    </form>
  );
}
