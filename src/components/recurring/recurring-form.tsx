"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import type { RecurringFormState } from "@/actions/recurring";
import { FormAlert, FormField } from "@/components/auth/form-field";
import { MoneyInput } from "@/components/money-input";
import { SelectField, type SelectOption } from "@/components/transactions/select-field";
import { TypePicker } from "@/components/transactions/type-picker";
import { Button, buttonVariants } from "@/components/ui/button";
import type { CategoryOption } from "@/lib/categories/options";
import { FREKUENSI } from "@/lib/recurring/schedule";
import { cn } from "@/lib/utils";

type Props = {
  action: (prev: RecurringFormState, formData: FormData) => Promise<RecurringFormState>;
  accounts: SelectOption[];
  categories: CategoryOption[];
  initial: Record<string, string>;
  submitLabel: string;
};

export function RecurringForm(props: Props) {
  const [state, formAction, pending] = useActionState(props.action, {});
  return <Body key={JSON.stringify(state.values)} {...props} state={state} formAction={formAction} pending={pending} />;
}

function Body({
  accounts,
  categories,
  initial,
  submitLabel,
  state,
  formAction,
  pending,
}: Props & { state: RecurringFormState; formAction: (fd: FormData) => void; pending: boolean }) {
  const v = { ...initial, ...state.values };
  const [type, setType] = useState<"expense" | "income">(v.type === "income" ? "income" : "expense");
  const err = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="grid gap-5" noValidate>
      <FormAlert message={state.error} tone="error" />
      <TypePicker value={type} onChange={(t) => t !== "transfer" && setType(t)} allowed={["expense", "income"]} />
      <FormField name="name" label="Nama" placeholder="Contoh: Netflix, Listrik, Gaji" maxLength={50} defaultValue={v.name} errors={err.name} />
      <MoneyInput name="amount" label="Nominal perkiraan" defaultValue={v.amount} errors={err.amount} />

      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField name="accountId" label="Akun" placeholder="Pilih akun" options={accounts} defaultValue={v.accountId} errors={err.accountId} />
        <SelectField
          key={type}
          name="categoryId"
          label="Kategori"
          placeholder="Pilih kategori"
          options={categories.filter((c) => c.type === type)}
          defaultValue={v.categoryId}
          errors={err.categoryId}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <SelectField name="frequency" label="Ulangi" placeholder="Pilih frekuensi" options={FREKUENSI} defaultValue={v.frequency} errors={err.frequency} />
        <FormField name="startDate" label="Mulai (jatuh tempo pertama)" type="date" defaultValue={v.startDate} errors={err.startDate} />
        <FormField name="endDate" label="Berakhir (opsional)" type="date" defaultValue={v.endDate} errors={err.endDate} />
      </div>

      <FormField name="note" label="Catatan (opsional)" maxLength={200} autoComplete="off" defaultValue={v.note} errors={err.note} />

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Link href="/berulang" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11 md:h-10")}>
          Batal
        </Link>
        <Button type="submit" size="lg" className="h-11 md:h-10" disabled={pending}>
          {pending ? "Menyimpan..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
