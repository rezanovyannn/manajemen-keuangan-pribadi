"use client";

import Link from "next/link";
import { useActionState } from "react";

import type { GoalFormState } from "@/actions/goals";
import { FormAlert, FormField } from "@/components/auth/form-field";
import { MoneyInput } from "@/components/money-input";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  action: (prev: GoalFormState, formData: FormData) => Promise<GoalFormState>;
  initial?: Record<string, string>;
  submitLabel: string;
};

export function GoalForm({ action, initial = {}, submitLabel }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const v = { ...initial, ...state.values };
  const err = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="grid gap-5" noValidate key={JSON.stringify(state.values)}>
      <FormAlert message={state.error} tone="error" />
      <FormField name="name" label="Nama tujuan" placeholder="Contoh: Liburan Bali, Dana darurat" maxLength={50} defaultValue={v.name} errors={err.name} />
      <MoneyInput name="targetAmount" label="Target" defaultValue={v.targetAmount} errors={err.targetAmount} />
      <p className="text-xs text-muted-foreground">
        Setelah disimpan, isi tabungan dengan tombol <span className="font-medium text-foreground">Sisihkan</span> dari akun mana saja. Saldo
        akunnya tidak berubah; hanya ditandai sebagai tabungan.
      </p>
      <FormField name="deadline" label="Tenggat (opsional)" type="date" defaultValue={v.deadline} errors={err.deadline} />

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Link href="/tujuan" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11 md:h-10")}>
          Batal
        </Link>
        <Button type="submit" size="lg" className="h-11 md:h-10" disabled={pending}>
          {pending ? "Menyimpan..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
