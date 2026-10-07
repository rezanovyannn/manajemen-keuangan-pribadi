"use client";

import Link from "next/link";
import { useActionState } from "react";

import type { DebtFormState } from "@/actions/debts";
import { FormAlert, FormField } from "@/components/auth/form-field";
import { MoneyInput } from "@/components/money-input";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  action: (prev: DebtFormState, formData: FormData) => Promise<DebtFormState>;
  kind: "utang" | "piutang";
  initial?: Record<string, string>;
  submitLabel: string;
  cancelHref: string;
};

export function DebtForm({ action, kind, initial = {}, submitLabel, cancelHref }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const v = { ...initial, ...state.values };
  const err = state.fieldErrors ?? {};
  const utang = kind === "utang";

  return (
    <form action={formAction} className="grid gap-5" noValidate key={JSON.stringify(state.values)}>
      <FormAlert message={state.error} tone="error" />
      <input type="hidden" name="kind" value={kind} />
      <FormField
        name="name"
        label="Nama"
        placeholder={utang ? "Contoh: KPR Rumah, Paylater" : "Contoh: Pinjaman ke Budi"}
        maxLength={50}
        defaultValue={v.name}
        errors={err.name}
      />
      <FormField
        name="counterparty"
        label={utang ? "Pemberi pinjaman (opsional)" : "Peminjam (opsional)"}
        maxLength={50}
        defaultValue={v.counterparty}
        errors={err.counterparty}
      />
      <MoneyInput name="principal" label={utang ? "Jumlah utang" : "Jumlah dipinjamkan"} defaultValue={v.principal} errors={err.principal} />
      <MoneyInput name="installmentAmount" label="Cicilan per bulan (opsional)" defaultValue={v.installmentAmount} errors={err.installmentAmount} />
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField name="startDate" label="Tanggal mulai" type="date" defaultValue={v.startDate} errors={err.startDate} />
        <FormField name="dueDate" label="Tenggat lunas (opsional)" type="date" defaultValue={v.dueDate} errors={err.dueDate} />
      </div>
      <FormField name="note" label="Catatan (opsional)" maxLength={200} autoComplete="off" defaultValue={v.note} errors={err.note} />

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Link href={cancelHref} className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11 md:h-10")}>
          Batal
        </Link>
        <Button type="submit" size="lg" className="h-11 md:h-10" disabled={pending}>
          {pending ? "Menyimpan..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
