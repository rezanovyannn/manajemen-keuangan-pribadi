"use client";

import Link from "next/link";
import { useActionState } from "react";

import type { BudgetFormState } from "@/actions/budgets";
import { FormAlert } from "@/components/auth/form-field";
import { MoneyInput } from "@/components/money-input";
import { SelectField, type SelectOption } from "@/components/transactions/select-field";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BudgetFormProps = {
  action: (prev: BudgetFormState, formData: FormData) => Promise<BudgetFormState>;
  cancelHref: string;
  submitLabel: string;
  initialAmount?: string;
  // Diisi hanya saat membuat budget baru; saat mengubah, kategori tetap.
  create?: { month: string; categories: SelectOption[] };
};

export function BudgetForm({ action, cancelHref, submitLabel, initialAmount, create }: BudgetFormProps) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="grid gap-5" noValidate key={JSON.stringify(state.values)}>
      <FormAlert message={state.error} tone="error" />

      {create && (
        <>
          <input type="hidden" name="month" value={create.month} />
          <SelectField
            name="categoryId"
            label="Kategori pengeluaran"
            placeholder="Pilih kategori"
            options={create.categories}
            defaultValue={state.values?.categoryId}
            errors={state.fieldErrors?.categoryId}
          />
        </>
      )}

      <MoneyInput
        name="amount"
        label="Batas per bulan"
        defaultValue={state.values?.amount ?? initialAmount}
        errors={state.fieldErrors?.amount}
        autoFocus={!create}
      />

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Link href={cancelHref} className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-10")}>
          Batal
        </Link>
        <Button type="submit" size="lg" className="h-10" disabled={pending}>
          {pending ? "Menyimpan..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
