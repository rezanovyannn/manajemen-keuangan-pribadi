"use client";

import { useActionState } from "react";

import { saveQuickBudgets } from "@/actions/onboarding";
import { FormAlert } from "@/components/auth/form-field";
import { MoneyInput } from "@/components/money-input";
import { Button } from "@/components/ui/button";

// Batas bulan ini untuk beberapa kategori umum; isian kosong dilewati.
export function BudgetStepForm({ categories }: { categories: { id: string; name: string; amount: number | null }[] }) {
  const [state, action, pending] = useActionState(saveQuickBudgets, {});
  const v = state.values ?? {};
  return (
    <form action={action} className="grid gap-4" noValidate key={JSON.stringify(state.values)}>
      <FormAlert tone="error" message={state.error} />
      {categories.map((c) => (
        <MoneyInput
          key={c.id}
          name={`budget-${c.id}`}
          label={c.name}
          defaultValue={v[`budget-${c.id}`] ?? (c.amount ? String(c.amount) : "")}
          errors={state.fieldErrors?.[`budget-${c.id}`]}
        />
      ))}
      <p className="text-xs text-muted-foreground">Kosongkan kategori yang tidak perlu. Budget lain bisa ditambah nanti di menu Budget.</p>
      <Button type="submit" size="lg" className="h-12 text-base" disabled={pending}>
        {pending ? "Menyimpan..." : "Simpan & lanjut"}
      </Button>
    </form>
  );
}
