"use client";

import Link from "next/link";
import { useActionState } from "react";

import type { CategoryFormState } from "@/actions/categories";
import { FormAlert, FormField } from "@/components/auth/form-field";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type CategoryFormProps = {
  action: (prev: CategoryFormState, formData: FormData) => Promise<CategoryFormState>;
  cancelHref: string;
  submitLabel: string;
  initialName?: string;
  // Diisi hanya saat membuat kategori baru; saat mengubah, tipe dan induk tetap.
  create?: {
    type: string;
    parents: { id: string; name: string }[];
    defaultParentId?: string;
  };
};

export function CategoryForm({ action, cancelHref, submitLabel, initialName, create }: CategoryFormProps) {
  const [state, formAction, pending] = useActionState(action, {});
  const parentError = state.fieldErrors?.parentId?.[0];

  return (
    <form action={formAction} className="grid gap-5" noValidate key={JSON.stringify(state.values)}>
      <FormAlert message={state.error} tone="error" />

      <FormField
        name="name"
        label="Nama kategori"
        placeholder="Contoh: Kopi, Bensin, Listrik"
        maxLength={50}
        required
        defaultValue={state.values?.name ?? initialName}
        errors={state.fieldErrors?.name}
      />

      {create && (
        <>
          <input type="hidden" name="type" value={create.type} />
          <div className="grid gap-2">
            <Label htmlFor="field-parentId">Masuk ke dalam</Label>
            <select
              id="field-parentId"
              name="parentId"
              defaultValue={state.values?.parentId ?? create.defaultParentId ?? ""}
              aria-invalid={parentError ? true : undefined}
              aria-describedby={parentError ? "field-parentId-error" : undefined}
              className="h-10 rounded-md border border-input bg-card px-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
            >
              <option value="">Tidak ada (kategori utama)</option>
              {create.parents.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {parentError && (
              <p id="field-parentId-error" className="text-sm text-destructive">
                {parentError}
              </p>
            )}
          </div>
        </>
      )}

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
